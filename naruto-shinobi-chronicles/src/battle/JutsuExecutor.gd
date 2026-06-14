class_name JutsuExecutor
extends RefCounted
## Applies a jutsu's data-driven effect list. Effect kinds (data/jutsu/jutsu_master.json):
##   {kind:"status",     status:"burn",   chance:30}
##   {kind:"stat_stage", who:"user|target", stat:"def", stages:-1, chance:100}
##   {kind:"heal",       who:"user|target", fraction:0.4}
##   {kind:"heal_flat",  who:"user", amount:30}
##   {kind:"field",      field:"scorched_earth", turns:3}
##   {kind:"cure_status", who:"user"}
##   {kind:"protect"}                       — negate next hit this turn (substitution)
##   {kind:"drain_cp",   amount:10}         — steal CP from the foe's pool
##   {kind:"restore_cp", amount:20}         — restore own pool
##   {kind:"trap",       turns:2}           — water prison style: stun-lock


static func apply_effects(state: BattleState, side: String, user: UnitInstance, target: UnitInstance, j: JutsuData, damage_dealt: int) -> void:
	var foe_side := "enemy" if side == "player" else "player"
	for eff in j.effects:
		var kind: String = eff.get("kind", "")
		var chance := float(eff.get("chance", 100))
		if state.rng.randf() * 100.0 >= chance:
			continue
		var who: UnitInstance = user if eff.get("who", "target") == "user" else target
		match kind:
			"status":
				BattleEngine.try_inflict_status(state, who, eff.get("status", ""))
			"stat_stage":
				var stat: String = eff.get("stat", "str")
				var stages := int(eff.get("stages", 1))
				var before := int(who.stat_stages.get(stat, 0))
				who.stat_stages[stat] = clampi(before + stages, -6, 6)
				if who.stat_stages[stat] != before:
					var dir := "rose" if stages > 0 else "fell"
					state.emit("%s's %s %s%s!" % [who.display_name(), stat.to_upper(), dir, "" if absi(stages) == 1 else " sharply"])
			"heal":
				var frac := float(eff.get("fraction", 0.5))
				var amount := int(who.max_hp() * frac)
				if user.data().trait_id == "medical_ninja":
					amount = int(amount * 1.5)  # spec: healing jutsu power x1.5
				var healed := who.heal(amount)
				state.emit("%s recovered %d HP!" % [who.display_name(), healed])
			"heal_flat":
				var healed2 := who.heal(int(eff.get("amount", 0)))
				state.emit("%s recovered %d HP!" % [who.display_name(), healed2])
			"heal_from_damage":
				var healed3 := user.heal(maxi(1, int(damage_dealt * float(eff.get("fraction", 0.25)))))
				if healed3 > 0:
					state.emit("%s absorbed %d HP!" % [user.display_name(), healed3])
			"cure_status":
				if who.status != "":
					state.emit("%s was cured of %s." % [who.display_name(), who.status])
					who.status = ""
					who.status_turns = 0
			"field":
				var fid: String = eff.get("field", "")
				state.field[fid] = int(eff.get("turns", 3))
				state.emit("The battlefield changed: %s!" % fid.replace("_", " "))
			"protect":
				user.protected_this_turn = true
				state.emit("%s vanishes — substitution ready!" % user.display_name())
			"drain_cp":
				var amt := int(eff.get("amount", 10))
				state.spend_cp(foe_side, amt)
				state.restore_cp(side, amt)
				state.emit("%s siphons %d chakra!" % [user.display_name(), amt])
			"restore_cp":
				state.restore_cp(side, int(eff.get("amount", 0)))
				state.emit("The team's chakra surges back!")
			"trap":
				BattleEngine.try_inflict_status(state, target, "stun")
			_:
				pass
