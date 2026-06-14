class_name BattleEngine
extends RefCounted
## Pure battle logic — zero scene dependencies. Every function takes BattleState
## and mutates it deterministically through state.rng. The QA-checklist rules from
## the locked spec live here.
##
## Turn pipeline (spec section 10):
##   1. Speed Phase  2. Status Tick  3. Action Phase  4. Resolution
##   5. Hit/Evasion  6. Effect Apply  7. Faint/Replace  8. End Turn

const TAIJUTSU_POWER := 40
const CONFUSION_SELF_HIT_POWER := 40


# =========================================================================
# Turn driver
# =========================================================================

## Runs one full round. Actions: {type: "jutsu"|"taijutsu"|"item"|"switch"|"flee"|"catch",
##   jutsu: id, item: id, switch_to: idx, tag: item_id}
## Returns true while battle continues, false when it has ended.
static func run_round(state: BattleState, player_action: Dictionary, enemy_action: Dictionary) -> bool:
	state.turn_count += 1
	state.emit("— Turn %d —" % state.turn_count)

	# 2. Status tick happens at start of round (DoT, counters).
	for side in ["player", "enemy"]:
		_status_tick(state, side)
		if _check_end(state):
			return false

	# Flee resolves before anything else.
	if player_action.get("type", "") == "flee":
		if _try_flee(state):
			return false
		player_action = {"type": "none"}

	# 1/3. Order the two actions by priority bracket, then effective SPD.
	var ordered := _order_actions(state, player_action, enemy_action)
	for entry in ordered:
		var side: String = entry["side"]
		if state.active(side).is_fainted():
			continue
		_execute_action(state, side, entry["action"])
		if _check_end(state):
			return false
		_handle_faints(state)
		if _check_end(state):
			return false

	# 8. End of turn: CP regen, field decay, charge countdown, jinchuriki check.
	state.restore_cp("player", state.CP_REGEN_PER_TURN)
	state.restore_cp("enemy", state.CP_REGEN_PER_TURN)
	for fid in state.field.keys().duplicate():
		state.field[fid] = int(state.field[fid]) - 1
		if state.field[fid] <= 0:
			state.field.erase(fid)
			state.emit("The %s faded." % fid.replace("_", " "))
	for side in ["player", "enemy"]:
		_jinchuriki_check(state, side)
	return not _check_end(state)


static func _order_actions(state: BattleState, player_action: Dictionary, enemy_action: Dictionary) -> Array:
	var entries := [
		{"side": "player", "action": player_action},
		{"side": "enemy", "action": enemy_action},
	]
	entries.sort_custom(func(a, b):
		var pa := _action_priority(state, a["side"], a["action"])
		var pb := _action_priority(state, b["side"], b["action"])
		if pa != pb:
			return pa > pb
		var sa := state.active(a["side"]).effective_stat("spd")
		var sb := state.active(b["side"]).effective_stat("spd")
		if sa != sb:
			return sa > sb
		# Speed tie: higher level, then seeded coin flip.
		var la := state.active(a["side"]).level
		var lb := state.active(b["side"]).level
		if la != lb:
			return la > lb
		return state.rng.randf() < 0.5
	)
	return entries


static func _action_priority(state: BattleState, _side: String, action: Dictionary) -> int:
	match action.get("type", "none"):
		"switch", "item", "catch":
			return 6
		"jutsu":
			var j: JutsuData = state.registry.jutsu(action.get("jutsu", ""))
			return j.priority if j != null else 0
		_:
			return 0


# =========================================================================
# Action execution
# =========================================================================

static func _execute_action(state: BattleState, side: String, action: Dictionary) -> void:
	var unit: UnitInstance = state.active(side)

	# A charging unit's only legal action is finishing its hand seals.
	if not unit.charging.is_empty():
		unit.charging["turns_left"] = int(unit.charging["turns_left"]) - 1
		if int(unit.charging["turns_left"]) <= 0:
			var jid: String = unit.charging["jutsu"]
			unit.charging = {}
			state.emit("%s unleashes the stored jutsu!" % unit.display_name())
			_perform_jutsu(state, side, state.registry.jutsu(jid), true)
		else:
			state.emit("%s is weaving hand seals... (%d)" % [unit.display_name(), int(unit.charging["turns_left"])])
		return

	# Pre-action incapacitation checks.
	if not _can_act(state, side, unit):
		return

	match action.get("type", "none"):
		"jutsu":
			var j: JutsuData = state.registry.jutsu(action.get("jutsu", ""))
			if j == null:
				return
			if unit.status == "seal" and j.id != "taijutsu_strike":
				state.emit("%s's chakra is sealed — jutsu fail!" % unit.display_name())
				return
			var cost := _cp_cost(unit, j)
			if state.cp(side) < cost:
				state.emit("%s doesn't have enough chakra!" % unit.display_name())
				return
			state.spend_cp(side, cost)
			if j.hsc > 0:
				unit.charging = {"jutsu": j.id, "turns_left": j.hsc}
				state.emit("%s begins weaving hand seals for %s..." % [unit.display_name(), j.display_name])
			else:
				_perform_jutsu(state, side, j, false)
		"taijutsu":
			_perform_taijutsu(state, side)
		"switch":
			var idx := int(action.get("switch_to", -1))
			var p := state.party(side)
			if idx >= 0 and idx < p.size() and not p[idx].is_fainted():
				if side == "player":
					state.active_player = idx
				else:
					state.active_enemy = idx
				p[idx].reset_battle_state()
				state.emit("%s takes the field!" % p[idx].display_name())
		"item":
			_use_item(state, side, action.get("item", ""))
		"catch":
			_attempt_catch(state, action.get("tag", "sealing_tag"))
		"commander":
			_perform_commander(state, side, action.get("skill", ""))
		_:
			pass


# Commander (Tactician) skills — player-only, operate purely on BattleState.
# Analyze is free/repeatable; the other two are once per battle via state.commander_used.
static func _perform_commander(state: BattleState, side: String, skill: String) -> void:
	if side != "player":
		return
	var unit: UnitInstance = state.active(side)
	match skill:
		"analyze":
			var foe: UnitInstance = state.active("enemy")
			var affs := ", ".join(PackedStringArray(foe.data().affinities))
			state.emit("Analyze — %s [%s]: trait %s." % [foe.display_name(), affs, foe.data().trait_id])
			state.emit("HP %d/%d  STR %d NIN %d DEF %d RES %d SPD %d" % [
				foe.current_hp, foe.max_hp(), foe.effective_stat("str"), foe.effective_stat("nin"),
				foe.effective_stat("def"), foe.effective_stat("res"), foe.effective_stat("spd")])
		"tactical_order":
			if state.commander_used.get("tactical_order", false):
				state.emit("Tactical Order has already been given this battle!")
				return
			state.commander_used["tactical_order"] = true
			unit.stat_stages["str"] = clampi(int(unit.stat_stages.get("str", 0)) + 1, -6, 6)
			unit.stat_stages["spd"] = clampi(int(unit.stat_stages.get("spd", 0)) + 1, -6, 6)
			state.emit("Commander's Tactical Order! %s's STR and SPD rose!" % unit.display_name())
		"chakra_infusion":
			if state.commander_used.get("chakra_infusion", false):
				state.emit("Chakra Infusion has already been used this battle!")
				return
			state.commander_used["chakra_infusion"] = true
			state.restore_cp(side, 50)
			state.emit("Commander channels Chakra Infusion! The team's chakra surges back! (+50 CP)")


static func _can_act(state: BattleState, side: String, unit: UnitInstance) -> bool:
	match unit.status:
		"sleep":
			state.emit("%s is fast asleep." % unit.display_name())
			return false
		"stun":
			state.emit("%s is stunned!" % unit.display_name())
			return false
		"paralysis":
			if state.rng.randf() < 0.25:
				state.emit("%s is paralyzed and can't move!" % unit.display_name())
				return false
		"confusion":
			if state.rng.randf() < 0.33:
				state.emit("%s hits itself in confusion!" % unit.display_name())
				var dmg := _raw_damage(unit.level, CONFUSION_SELF_HIT_POWER,
					unit.effective_stat("str"), unit.effective_stat("def"), 1.0)
				unit.take_damage(dmg)
				return false
	return true


static func _cp_cost(unit: UnitInstance, j: JutsuData) -> int:
	var cost := j.cp_cost
	if unit.nature_mastery != "" and unit.nature_mastery == j.nature:
		cost = maxi(0, cost - 5)
	return cost


# =========================================================================
# Jutsu resolution
# =========================================================================

static func _perform_jutsu(state: BattleState, side: String, j: JutsuData, _from_charge: bool) -> void:
	var user: UnitInstance = state.active(side)
	var foe_side := "enemy" if side == "player" else "player"
	var target: UnitInstance = state.active(foe_side)
	state.emit("%s uses %s!" % [user.display_name(), j.display_name])

	# Self / ally targeted jutsu skip accuracy entirely.
	if j.target in ["self", "ally"]:
		JutsuExecutor.apply_effects(state, side, user, user, j, 0)
		return

	# Kirin's field requirement (spec appendix): fizzles without a thundercloud.
	if j.has_flag("requires_thundercloud") and not state.has_field("thundercloud"):
		state.emit("...but the sky holds no lightning! It failed.")
		return

	if not _accuracy_check(state, user, target, j):
		state.emit("...but it missed!")
		return

	# Sharingan: 30% evade + copy-counter (spec section 4.3).
	if target.data().trait_id == "sharingan" and not j.has_flag("ignores_evasion") \
			and j.category != "status" and state.rng.randf() < 0.30:
		state.emit("%s's Sharingan sees through it!" % target.display_name())
		target.last_jutsu_taken = j.id
		if j.is_damaging():
			state.emit("%s counters with a copied %s!" % [target.display_name(), j.display_name])
			_deal_damage(state, foe_side, target, user, j)
		return

	target.last_jutsu_taken = j.id

	if j.is_damaging():
		var hits := 1
		if j.multi_hit.size() == 2:
			hits = state.rng.randi_range(int(j.multi_hit[0]), int(j.multi_hit[1]))
		var total := 0
		for i in hits:
			if target.is_fainted():
				break
			total += _deal_damage(state, side, user, target, j)
		if hits > 1:
			state.emit("Hit %d times!" % hits)
		JutsuExecutor.apply_effects(state, side, user, target, j, total)
	else:
		JutsuExecutor.apply_effects(state, side, user, target, j, 0)


static func _perform_taijutsu(state: BattleState, side: String) -> void:
	var user: UnitInstance = state.active(side)
	var foe_side := "enemy" if side == "player" else "player"
	var target: UnitInstance = state.active(foe_side)
	state.emit("%s strikes with taijutsu!" % user.display_name())
	var j := JutsuData.new()
	j.id = "taijutsu_strike"
	j.display_name = "Taijutsu"
	j.nature = "yang"
	j.category = "physical"
	j.power = TAIJUTSU_POWER
	if _accuracy_check(state, user, target, j):
		_deal_damage(state, side, user, target, j)
	else:
		state.emit("...but it missed!")


static func _accuracy_check(state: BattleState, user: UnitInstance, target: UnitInstance, j: JutsuData) -> bool:
	if user.data().trait_id == "byakugan" or j.accuracy <= 0 or j.has_flag("never_miss"):
		return true
	var stage := int(user.stat_stages.get("acc", 0)) - int(target.stat_stages.get("eva", 0))
	var chance := float(j.accuracy) * UnitInstance.stage_multiplier(stage)
	var acc_bonus := 5.0 if user.nature_mastery == j.nature else 0.0
	return state.rng.randf() * 100.0 < chance + acc_bonus


## Damage per locked formula:
##   Base = floor(floor((2L/5+2)*Pow*Atk/Def)/50)+2
##   Mod  = Type * Crit * Random(0.85-1.0) * Field * Trait
static func _deal_damage(state: BattleState, side: String, user: UnitInstance, target: UnitInstance, j: JutsuData) -> int:
	var atk := user.effective_stat("str" if j.category == "physical" else "nin")
	var def := target.effective_stat("def" if j.category == "physical" else "res")
	if j.has_flag("ignores_defense"):
		def = target.stat("def" if j.category == "physical" else "res")  # ignore stages only? Kirin: flat halve
		def = maxi(1, def / 2)

	var type_mult: float = state.registry.type_chart.multiplier(j.nature, target.data().affinities)
	if type_mult == 0.0:
		state.emit("It has no effect on %s..." % target.display_name())
		return 0

	var crit := _crit_check(state, target, j)
	var crit_mult := 1.5 if crit else 1.0
	var rand_mult := state.rng.randf_range(0.85, 1.0)
	var field_mult := _field_multiplier(state, j)
	var trait_mult := _trait_damage_multiplier(target, j)

	var mod := type_mult * crit_mult * rand_mult * field_mult * trait_mult
	var dmg := _raw_damage(user.level, j.power, atk, def, mod)
	if target.status == "bleed" and j.category == "physical":
		dmg = int(dmg * 1.2)

	dmg = target.take_damage(dmg)
	if crit:
		state.emit("A critical hit!")
	var eff_label: String = state.registry.type_chart.label(type_mult)
	if eff_label != "":
		state.emit(eff_label)
	state.emit("%s took %d damage. (%d/%d HP)" % [target.display_name(), dmg, target.current_hp, target.max_hp()])

	# Sleeping targets wake when struck.
	if target.status == "sleep" and dmg > 0:
		target.status = ""
		target.status_turns = 0
		state.emit("%s woke up!" % target.display_name())

	# Drain / recoil riders.
	if j.has_flag("drains") and dmg > 0:
		var healed := user.heal(maxi(1, dmg / 4))
		if healed > 0:
			state.emit("%s absorbed %d HP!" % [user.display_name(), healed])
	if j.has_flag("recoil") and dmg > 0:
		var recoil := maxi(1, user.max_hp() / 4)
		user.take_damage(recoil)
		state.emit("%s is hurt by recoil! (-%d)" % [user.display_name(), recoil])
	return dmg


static func _raw_damage(level: int, power: int, atk: int, def: int, mod: float) -> int:
	var base := int(int((2.0 * level / 5.0 + 2.0) * power * atk / maxf(1.0, def)) / 50.0) + 2
	return maxi(1, int(base * mod))


static func _crit_check(state: BattleState, target: UnitInstance, j: JutsuData) -> bool:
	if target.data().trait_id == "hardened_body":
		return false  # QA: immune to critical hits
	var denominators := [16, 8, 4, 2]
	var stage: int = clampi(j.crit_bonus, 0, 3)
	return state.rng.randi_range(1, denominators[stage]) == 1


static func _field_multiplier(state: BattleState, j: JutsuData) -> float:
	var mult := 1.0
	if state.has_field("scorched_earth"):
		if j.nature == "fire":
			mult *= 1.3
		elif j.nature == "water":
			mult *= 0.7
	if state.has_field("fissure") and j.nature == "earth":
		mult *= 1.3
	if state.has_field("thundercloud") and j.nature == "lightning":
		mult *= 1.2
	if state.has_field("water_dome"):
		if j.nature == "water":
			mult *= 1.3
		elif j.nature == "fire":
			mult *= 0.7
	return mult


static func _trait_damage_multiplier(target: UnitInstance, j: JutsuData) -> float:
	# Defensive trait hooks live here so the formula stays in one place.
	if target.data().trait_id == "sand_shield" and j.category == "physical":
		return 0.7
	if target.data().trait_id == "mist_veil" and j.category == "special":
		return 0.85
	return 1.0


# =========================================================================
# Status ticks (spec section 9 table)
# =========================================================================

static func _status_tick(state: BattleState, side: String) -> void:
	var unit: UnitInstance = state.active(side)
	if unit.is_fainted() or unit.status == "":
		return
	var defs: Dictionary = state.registry.status_def(unit.status)
	var hp_frac := float(defs.get("hp_tick_fraction", 0.0))
	if hp_frac > 0.0:
		var dmg := maxi(1, int(unit.max_hp() * hp_frac))
		unit.take_damage(dmg)
		state.emit("%s is hurt by %s! (-%d)" % [unit.display_name(), unit.status, dmg])
	if unit.status == "chakra_drain":
		var drain := maxi(1, state.player_max_cp / 10) if side == "player" else maxi(1, state.enemy_max_cp / 10)
		state.spend_cp(side, drain)
		state.restore_cp("enemy" if side == "player" else "player", drain)
		state.emit("%s's chakra is being siphoned!" % unit.display_name())
	unit.status_turns -= 1
	if unit.status_turns <= 0:
		state.emit("%s recovered from %s." % [unit.display_name(), unit.status])
		unit.status = ""


static func try_inflict_status(state: BattleState, target: UnitInstance, status_id: String) -> bool:
	if target.status != "" or target.is_fainted():
		return false
	# Affinity immunities (QA: status immunities respected).
	var immunities := {"burn": "fire", "paralysis": "lightning", "seal": "yin", "poison": "earth"}
	if immunities.has(status_id) and target.data().affinities.has(immunities[status_id]):
		state.emit("%s is immune to %s!" % [target.display_name(), status_id])
		return false
	var defs: Dictionary = state.registry.status_def(status_id)
	var dur: Array = defs.get("duration", [2, 3])
	target.status = status_id
	target.status_turns = state.rng.randi_range(int(dur[0]), int(dur[1]))
	if status_id == "fear":
		target.stat_stages["spd"] = clampi(int(target.stat_stages["spd"]) + 1, -6, 6)  # panic speed
	state.emit("%s was inflicted with %s!" % [target.display_name(), status_id])
	return true


# =========================================================================
# Faints, traits, end conditions
# =========================================================================

static func _handle_faints(state: BattleState) -> void:
	for side in ["player", "enemy"]:
		var unit: UnitInstance = state.active(side)
		if not unit.is_fainted():
			continue
		state.emit("%s was defeated!" % unit.display_name())
		# Medical Ninja: revive a fallen ally once per battle (50 CP).
		for ally in state.party(side):
			if ally != unit and not ally.is_fainted() and ally.data().trait_id == "medical_ninja" \
					and not ally.revive_used and state.cp(side) >= 50:
				ally.revive_used = true
				state.spend_cp(side, 50)
				unit.current_hp = unit.max_hp() / 2
				state.emit("%s's medical ninjutsu revives %s!" % [ally.display_name(), unit.display_name()])
				break
		if unit.is_fainted():
			var next := state.first_alive(side)
			if next >= 0:
				if side == "player":
					state.active_player = next
				else:
					state.active_enemy = next
				state.party(side)[next].reset_battle_state()
				state.emit("%s takes the field!" % state.party(side)[next].display_name())


static func _jinchuriki_check(state: BattleState, side: String) -> void:
	var unit: UnitInstance = state.active(side)
	if unit.is_fainted() or unit.data().trait_id != "jinchuriki":
		return
	if unit.current_hp * 100 < unit.max_hp() * 30:
		if int(unit.stat_stages.get("str", 0)) < 2:
			unit.stat_stages["str"] = 2
			unit.stat_stages["nin"] = 2
			state.emit("%s's tailed beast chakra surges!" % unit.display_name())
		var regen := unit.heal(maxi(1, unit.max_hp() / 10))
		if regen > 0:
			state.emit("%s regenerates %d HP." % [unit.display_name(), regen])


static func _check_end(state: BattleState) -> bool:
	return state.caught_unit != null or state.side_defeated("player") or state.side_defeated("enemy")


static func _try_flee(state: BattleState) -> bool:
	if not state.is_wild:
		state.emit("You can't flee from this battle!")
		return false
	var a := state.active("player").effective_stat("spd")
	var b := state.active("enemy").effective_stat("spd")
	var chance := clampf(0.5 + 0.5 * (float(a) - float(b)) / maxf(1.0, float(b)), 0.2, 0.95)
	if state.rng.randf() < chance:
		state.emit("Got away safely!")
		return true
	state.emit("Couldn't escape!")
	return false


# =========================================================================
# Items & catching
# =========================================================================

static func _use_item(state: BattleState, side: String, item_id: String) -> void:
	var unit: UnitInstance = state.active(side)
	var item: Dictionary = state.registry.item(item_id)
	if item.is_empty():
		return
	state.emit("%s uses %s!" % ["Commander" if side == "player" else "Enemy", item.get("name", item_id)])
	match item.get("kind", ""):
		"heal_hp":
			var healed := unit.heal(int(item.get("amount", 0)))
			state.emit("%s recovered %d HP." % [unit.display_name(), healed])
		"restore_cp":
			state.restore_cp(side, int(item.get("amount", 0)))
			state.emit("The team's chakra pool was restored.")
		"cure_status":
			var cures: Array = item.get("cures", [])
			if unit.status in cures or cures.has("all"):
				state.emit("%s was cured of %s." % [unit.display_name(), unit.status])
				unit.status = ""
				unit.status_turns = 0
		"revive":
			pass  # handled from party menu in BattleController
	# Item consumption from inventory is the caller's job (keeps engine pure).


## Catch math per spec appendix:
##   a = (3*MaxHP - 2*CurHP) * CatchRate * TagMod * StatusMod / (3*MaxHP)
static func _attempt_catch(state: BattleState, tag_id: String) -> void:
	if not state.is_wild:
		state.emit("You can't seal another shinobi's contracted ally!")
		return
	var target: UnitInstance = state.active("enemy")
	var tag_mod := 1.5 if tag_id == "cursed_seal_tag" else 1.0
	var status_mod := 1.0
	if target.status in ["sleep", "stun", "seal"]:
		status_mod = 2.0
	elif target.status != "":
		status_mod = 1.5
	var max_hp := target.max_hp()
	var a := (3.0 * max_hp - 2.0 * target.current_hp) * target.data().catch_rate * tag_mod * status_mod / (3.0 * max_hp)
	state.emit("You hurl a %s!" % tag_id.replace("_", " "))
	if target.data().catch_rate <= 0:
		state.emit("The seal shatters — this one can never be bound!")
		return
	if state.rng.randi_range(0, 255) < int(a):
		state.caught_unit = target
		state.emit("%s was sealed! A new contract is formed!" % target.display_name())
	else:
		state.emit("%s broke free!" % target.display_name())


# =========================================================================
# Rewards
# =========================================================================

static func exp_reward(defeated: UnitInstance) -> int:
	return maxi(1, int(defeated.data().base_exp * defeated.level / 5.0))
