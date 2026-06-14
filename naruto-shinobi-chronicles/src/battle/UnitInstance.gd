class_name UnitInstance
extends RefCounted
## A living, levelable instance of a UnitData (the "Ninja Card" in your party/archive).
## Pure data + math: no scene dependencies, fully serializable for the 32KB save blob.

const LEVEL_CAP := 50
const MAX_JUTSU_SLOTS := 8

var unit_id: String = ""
var nickname: String = ""
var level: int = 1
var exp: int = 0
var current_hp: int = 1
var status: String = ""          # burn/poison/paralysis/stun/seal/bleed/fear/confusion/sleep/chakra_drain
var status_turns: int = 0
var stat_stages: Dictionary = {"str": 0, "nin": 0, "def": 0, "res": 0, "spd": 0, "acc": 0, "eva": 0}
var equipped_jutsu: Array = []   # jutsu ids, max 8 (slots unlock with level)
var held_tool: String = ""
var nature_mastery: String = ""  # chosen at 10/20/30: -5 CP / +5 ACC for that nature
var registry = null              # injected DataRegistry (duck-typed to avoid autoload coupling)

# Per-battle volatile state (reset by reset_battle_state)
var charging: Dictionary = {}    # {jutsu: id, turns_left: int}
var protected_this_turn: bool = false
var endure_used: bool = false    # substitution_master trait, 1/battle
var revive_used: bool = false    # medical_ninja trait, 1/battle
var last_jutsu_taken: String = ""  # for sharingan copy


static func create(reg, p_unit_id: String, p_level: int) -> UnitInstance:
	var inst := UnitInstance.new()
	inst.registry = reg
	inst.unit_id = p_unit_id
	inst.level = clampi(p_level, 1, LEVEL_CAP)
	inst.exp = reg.exp_for_level(inst.data().growth_curve, inst.level)
	inst.auto_equip_jutsu()
	inst.current_hp = inst.max_hp()
	return inst


func data() -> UnitData:
	return registry.unit(unit_id)


func display_name() -> String:
	return nickname if nickname != "" else data().display_name


# --- Stats -------------------------------------------------------------

func max_hp() -> int:
	var base := int(data().base_stats.get("hp", 50))
	return int(2 * base * level / 100.0) + level + 10


## Raw stat before battle stages: floor(2*base*L/100)+5, then nature ±10%.
func stat(stat_name: String) -> int:
	var base := int(data().base_stats.get(stat_name, 50))
	var value := int(2 * base * level / 100.0) + 5
	var mods: Dictionary = registry.nature_mods(data().nature)
	if mods.get("up", "") == stat_name:
		value = int(value * 1.1)
	elif mods.get("down", "") == stat_name:
		value = int(value * 0.9)
	return maxi(1, value)


const STAGE_NUM := [2, 2, 2, 2, 2, 2, 2, 3, 4, 5, 6, 7, 8]
const STAGE_DEN := [8, 7, 6, 5, 4, 3, 2, 2, 2, 2, 2, 2, 2]

static func stage_multiplier(stage: int) -> float:
	var i := clampi(stage, -6, 6) + 6
	return float(STAGE_NUM[i]) / float(STAGE_DEN[i])


## Stat after battle stages and status penalties (paralysis halves SPD, burn cuts STR).
func effective_stat(stat_name: String) -> int:
	var value := float(stat(stat_name)) * stage_multiplier(int(stat_stages.get(stat_name, 0)))
	if status == "paralysis" and stat_name == "spd":
		value *= 0.5
	if status == "burn" and stat_name == "str":
		value *= 0.7
	return maxi(1, int(value))


func is_fainted() -> bool:
	return current_hp <= 0


func heal(amount: int) -> int:
	var before := current_hp
	current_hp = clampi(current_hp + amount, 0, max_hp())
	return current_hp - before


func take_damage(amount: int) -> int:
	# Substitution Master trait: the first hit that would KO leaves 1 HP (once per battle).
	if data().trait_id == "substitution_master" and not endure_used and amount >= current_hp and current_hp > 1:
		endure_used = true
		amount = current_hp - 1
	current_hp = maxi(0, current_hp - amount)
	return amount


# --- Progression -------------------------------------------------------

func jutsu_slot_count() -> int:
	# 3 slots at start; +1 at 6, 11, 16, 21, 26 (max 8).
	return mini(MAX_JUTSU_SLOTS, 3 + maxi(0, (level - 1) / 5))


func auto_equip_jutsu() -> void:
	var known: Array = data().jutsu_known_by(level)
	equipped_jutsu = known.slice(maxi(0, known.size() - jutsu_slot_count()))


## Returns array of jutsu ids newly learned. Caller decides slot replacement UI.
func gain_exp(amount: int) -> Array:
	var learned: Array = []
	if level >= LEVEL_CAP:
		return learned
	exp += amount
	while level < LEVEL_CAP and exp >= registry.exp_for_level(data().growth_curve, level + 1):
		level += 1
		for jid in data().jutsu_learned_at(level):
			learned.append(jid)
			if equipped_jutsu.size() < jutsu_slot_count() and not equipped_jutsu.has(jid):
				equipped_jutsu.append(jid)
	return learned


func can_promote(inventory: Dictionary, story_flags: Dictionary) -> bool:
	var promo: Dictionary = data().promotion
	if promo.is_empty():
		return false
	if level < int(promo.get("level", LEVEL_CAP)):
		return false
	var item: String = promo.get("item", "")
	if item != "" and int(inventory.get(item, 0)) <= 0:
		return false
	var flag: String = promo.get("story_flag", "")
	if flag != "" and not story_flags.get(flag, false):
		return false
	return true


## Promotion resets level to 1 on a stronger base (spec section 6). Keeps exp identity.
func promote() -> void:
	var target: String = data().promotion.get("target_id", "")
	if target == "":
		return
	unit_id = target
	level = 1
	exp = 0
	auto_equip_jutsu()
	current_hp = max_hp()


# --- Battle lifecycle ---------------------------------------------------

func reset_battle_state() -> void:
	for k in stat_stages.keys():
		stat_stages[k] = 0
	charging = {}
	protected_this_turn = false
	endure_used = false
	revive_used = false
	last_jutsu_taken = ""
	if status in ["stun", "fear", "confusion"]:  # volatiles clear after battle
		status = ""
		status_turns = 0


# --- Serialization ------------------------------------------------------

func to_dict() -> Dictionary:
	return {
		"unit_id": unit_id, "nickname": nickname, "level": level, "exp": exp,
		"current_hp": current_hp, "status": status, "status_turns": status_turns,
		"equipped_jutsu": equipped_jutsu, "held_tool": held_tool,
		"nature_mastery": nature_mastery,
	}


static func from_dict(reg, d: Dictionary) -> UnitInstance:
	var inst := UnitInstance.new()
	inst.registry = reg
	inst.unit_id = d.get("unit_id", "")
	inst.nickname = d.get("nickname", "")
	inst.level = int(d.get("level", 1))
	inst.exp = int(d.get("exp", 0))
	inst.current_hp = int(d.get("current_hp", 1))
	inst.status = d.get("status", "")
	inst.status_turns = int(d.get("status_turns", 0))
	inst.equipped_jutsu = d.get("equipped_jutsu", [])
	inst.held_tool = d.get("held_tool", "")
	inst.nature_mastery = d.get("nature_mastery", "")
	return inst
