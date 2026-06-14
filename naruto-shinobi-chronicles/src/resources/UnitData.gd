class_name UnitData
extends Resource
## Immutable species/character definition. Loaded from data/units/*.json by DataRegistry.

@export var id: String = ""
@export var display_name: String = ""
@export var base_stats: Dictionary = {}          # {hp, str, nin, def, res, spd} ints
@export var growth_curve: String = "medium"      # fast | medium | slow | erratic
@export var nature: String = ""                  # flavor nature id, ±10% two stats
@export var affinities: Array = []               # 1-2 of fire/wind/lightning/earth/water/yin/yang/none
@export var trait_id: String = ""                # passive ability id (see data/traits.json)
@export var learnset: Array = []                 # [{level:int, jutsu:String}]
@export var promotion: Dictionary = {}           # {level, item, story_flag, target_id} (empty = final form)
@export var rarity: String = "common"            # common|uncommon|rare|legendary|mythic
@export var catch_rate: int = 120                # 0 = cannot be contracted (story-only)
@export var base_exp: int = 60
@export var village: String = "leaf"
@export var threat_level: String = "D"           # Bingo Book rank D-S
@export var bingo_entry: String = ""
@export var palette: Dictionary = {}             # {primary, secondary, accent} hex colors for placeholder sprites


static func from_dict(d: Dictionary) -> UnitData:
	var u := UnitData.new()
	u.id = d.get("id", "")
	u.display_name = d.get("name", u.id.capitalize())
	u.base_stats = d.get("base_stats", {})
	u.growth_curve = d.get("growth_curve", "medium")
	u.nature = d.get("nature", "")
	u.affinities = d.get("affinities", ["none"])
	u.trait_id = d.get("trait", "")
	u.learnset = d.get("learnset", [])
	u.promotion = d.get("promotion", {})
	u.rarity = d.get("rarity", "common")
	u.catch_rate = int(d.get("catch_rate", 120))
	u.base_exp = int(d.get("base_exp", 60))
	u.village = d.get("village", "leaf")
	u.threat_level = d.get("threat_level", "D")
	u.bingo_entry = d.get("bingo_entry", "")
	u.palette = d.get("palette", {})
	return u


func jutsu_learned_at(level: int) -> Array:
	var out: Array = []
	for entry in learnset:
		if int(entry.get("level", 0)) == level:
			out.append(entry.get("jutsu", ""))
	return out


func jutsu_known_by(level: int) -> Array:
	var out: Array = []
	for entry in learnset:
		if int(entry.get("level", 0)) <= level:
			out.append(entry.get("jutsu", ""))
	return out
