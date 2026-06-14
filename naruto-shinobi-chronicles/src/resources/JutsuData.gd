class_name JutsuData
extends Resource
## Immutable technique definition. Loaded from data/jutsu/jutsu_master.json by DataRegistry.

@export var id: String = ""
@export var display_name: String = ""
@export var nature: String = "none"        # fire/wind/lightning/earth/water/yin/yang/none
@export var category: String = "physical"  # physical | special | status
@export var power: int = 0
@export var accuracy: int = 100            # 0 = never misses
@export var cp_cost: int = 0
@export var hsc: int = 0                   # hand-seal count: turns of charge delay before firing
@export var priority: int = 0              # substitution = +3, etc.
@export var target: String = "single"      # single|all_foes|adjacent|line|aoe|self|ally
@export var crit_bonus: int = 0            # +1 stage = 1/8 instead of 1/16
@export var multi_hit: Array = []          # [min, max] hits, empty = 1
@export var effects: Array = []            # [{kind, ...params}] applied by JutsuExecutor
@export var flags: Array = []              # ignores_substitution, ignores_evasion, pierces_protect, drains, recoil...
@export var description: String = ""


static func from_dict(d: Dictionary) -> JutsuData:
	var j := JutsuData.new()
	j.id = d.get("id", "")
	j.display_name = d.get("name", j.id.capitalize())
	j.nature = d.get("nature", "none")
	j.category = d.get("category", "physical")
	j.power = int(d.get("power", 0))
	j.accuracy = int(d.get("accuracy", 100))
	j.cp_cost = int(d.get("cp", 0))
	j.hsc = int(d.get("hsc", 0))
	j.priority = int(d.get("priority", 0))
	j.target = d.get("target", "single")
	j.crit_bonus = int(d.get("crit_bonus", 0))
	j.multi_hit = d.get("multi_hit", [])
	j.effects = d.get("effects", [])
	j.flags = d.get("flags", [])
	j.description = d.get("description", "")
	return j


func is_damaging() -> bool:
	return category != "status" and power > 0


func has_flag(flag: String) -> bool:
	return flags.has(flag)
