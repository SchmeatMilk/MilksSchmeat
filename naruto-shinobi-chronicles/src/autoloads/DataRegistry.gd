extends Node
## DataRegistry — single source of truth. Loads every JSON under res://data into
## typed Resources at boot, then runs the QA-checklist validation from the locked
## spec. Instantiable standalone (DataRegistry script .new()) for headless tests.

var units: Dictionary = {}        # id -> UnitData
var jutsu_db: Dictionary = {}     # id -> JutsuData
var type_chart: TypeChart = null
var status_defs: Dictionary = {}  # id -> Dictionary
var items: Dictionary = {}        # id -> Dictionary
var traits_db: Dictionary = {}    # id -> Dictionary (descriptions; logic lives in BattleEngine)
var combos: Array = []            # combination jutsu definitions
var natures: Dictionary = {}      # id -> {up, down}
var growth_coefficients: Dictionary = {}  # curve -> float multiplier on n^3
var maps: Dictionary = {}         # id -> Dictionary (overworld map definitions)
var visuals: Dictionary = {}      # unit_id -> {overworld_sprite, battle_sprite, ...}
var cutscenes: Dictionary = {}    # id -> Dictionary (scripted scenes, data/cutscenes/*.json)
var quests: Array = []            # ordered story objectives (data/story/quests.json)
var validation_errors: Array = []


func _ready() -> void:
	load_all("res://data")
	if not validation_errors.is_empty():
		for err in validation_errors:
			push_error("[DataRegistry] " + err)


func load_all(base: String) -> bool:
	units.clear()
	jutsu_db.clear()
	validation_errors.clear()

	type_chart = TypeChart.from_dict(_read_json(base + "/types/type_chart.json"))
	status_defs = _read_json(base + "/status/status_defs.json")
	traits_db = _read_json(base + "/status/traits.json")
	items = _read_json(base + "/items/items.json")
	natures = _read_json(base + "/progress/natures.json")
	growth_coefficients = _read_json(base + "/progress/level_curve.json").get("coefficients", {})
	visuals = {}
	if FileAccess.file_exists(base + "/visuals/units.json"):
		visuals = _read_json(base + "/visuals/units.json")

	for d in _read_json(base + "/jutsu/jutsu_master.json").get("jutsu", []):
		var j := JutsuData.from_dict(d)
		jutsu_db[j.id] = j
	combos = _read_json(base + "/jutsu/combo_list.json").get("combos", [])

	for file in _list_files(base + "/units", ".json"):
		var d: Dictionary = _read_json(base + "/units/" + file)
		if d.is_empty():
			continue
		var u := UnitData.from_dict(d)
		units[u.id] = u

	for file in _list_files(base + "/maps", ".json"):
		var d: Dictionary = _read_json(base + "/maps/" + file)
		if not d.is_empty():
			maps[d.get("id", file.get_basename())] = d

	cutscenes.clear()
	for file in _list_files(base + "/cutscenes", ".json"):
		var d: Dictionary = _read_json(base + "/cutscenes/" + file)
		if not d.is_empty():
			cutscenes[d.get("id", file.get_basename())] = d

	quests = []
	if FileAccess.file_exists(base + "/story/quests.json"):
		quests = _read_json(base + "/story/quests.json").get("quests", [])

	_validate()
	return validation_errors.is_empty()


# --- Accessors -----------------------------------------------------------

func unit(id: String) -> UnitData:
	return units.get(id)


func jutsu(id: String) -> JutsuData:
	return jutsu_db.get(id)


func item(id: String) -> Dictionary:
	return items.get(id, {})


func status_def(id: String) -> Dictionary:
	return status_defs.get(id, {})


func nature_mods(id: String) -> Dictionary:
	return natures.get(id, {})


func map_def(id: String) -> Dictionary:
	return maps.get(id, {})


func cutscene(id: String) -> Dictionary:
	return cutscenes.get(id, {})


## Resolves a unit's texture for "battle" or "overworld" display.
## Battle falls back to the overworld sprite; returns null when no art exists
## yet, in which case callers draw the legacy palette-block placeholder.
func unit_texture(unit_id: String, kind: String) -> Texture2D:
	var v: Dictionary = visuals.get(unit_id, {})
	var candidates: Array = []
	if kind == "battle":
		candidates = [v.get("battle_sprite", ""), v.get("overworld_sprite", "")]
	else:
		candidates = [v.get("overworld_sprite", "")]
	for path in candidates:
		if path != "" and ResourceLoader.exists(path):
			return load(path)
	return null


## Total exp required to BE at `level` (cubic curve scaled per growth group).
func exp_for_level(curve: String, level: int) -> int:
	var coeff := float(growth_coefficients.get(curve, 1.0))
	return int(coeff * level * level * level)


# --- QA-checklist validation (spec final section) -------------------------

func _validate() -> void:
	var seen_traits := {}
	for uid in units:
		var u: UnitData = units[uid]
		# Every jutsu ID in learnsets exists in jutsu_master.json.
		for entry in u.learnset:
			var jid: String = entry.get("jutsu", "")
			if not jutsu_db.has(jid):
				validation_errors.append("Unit '%s' learnset references missing jutsu '%s'" % [uid, jid])
		# Promotion targets must exist.
		var promo_target: String = u.promotion.get("target_id", "")
		if promo_target != "" and not units.has(promo_target):
			validation_errors.append("Unit '%s' promotion target '%s' missing" % [uid, promo_target])
		# Affinities must be on the chart.
		for aff in u.affinities:
			if not type_chart.natures.has(aff):
				validation_errors.append("Unit '%s' has unknown affinity '%s'" % [uid, aff])
		# Traits must be defined.
		if u.trait_id != "" and not traits_db.has(u.trait_id):
			validation_errors.append("Unit '%s' has unknown trait '%s'" % [uid, u.trait_id])
		seen_traits[u.trait_id] = true
		# Base stats complete.
		for stat_name in ["hp", "str", "nin", "def", "res", "spd"]:
			if not u.base_stats.has(stat_name):
				validation_errors.append("Unit '%s' missing base stat '%s'" % [uid, stat_name])
	for j in jutsu_db.values():
		if not type_chart.natures.has(j.nature):
			validation_errors.append("Jutsu '%s' has unknown nature '%s'" % [j.id, j.nature])
		for eff in j.effects:
			if eff.get("kind", "") == "status" and not status_defs.has(eff.get("status", "")):
				validation_errors.append("Jutsu '%s' inflicts unknown status '%s'" % [j.id, eff.get("status", "")])
	for combo in combos:
		for key in ["jutsu_a", "jutsu_b"]:
			if not jutsu_db.has(combo.get(key, "")):
				validation_errors.append("Combo '%s' references missing jutsu '%s'" % [combo.get("id", "?"), combo.get(key, "")])
	for uid in visuals:
		if not units.has(uid):
			validation_errors.append("visuals/units.json references unknown unit '%s'" % uid)
		for key in visuals[uid]:
			var path: String = visuals[uid][key]
			if not (FileAccess.file_exists(path) or ResourceLoader.exists(path)):
				validation_errors.append("Visual asset missing for '%s': %s" % [uid, path])

	# Cutscene on_finish references (recruits, warp targets, battle units) resolve.
	for cid in cutscenes:
		var cs: Dictionary = cutscenes[cid]
		var fin: Dictionary = cs.get("on_finish", {})
		for r in fin.get("recruit", []):
			if not units.has(r.get("unit", "")):
				validation_errors.append("Cutscene '%s' recruits unknown unit '%s'" % [cid, r.get("unit", "")])
		var gm: Dictionary = fin.get("goto_map", {})
		if not gm.is_empty() and not maps.has(gm.get("map", "")):
			validation_errors.append("Cutscene '%s' goto_map references unknown map '%s'" % [cid, gm.get("map", "")])
		var sb: Dictionary = fin.get("start_battle", {})
		for entry in sb.get("party", []):
			if not units.has(entry[0]):
				validation_errors.append("Cutscene '%s' start_battle references unknown unit '%s'" % [cid, entry[0]])

	# Map story triggers reference cutscenes that exist.
	for mid in maps:
		var m: Dictionary = maps[mid]
		for trig in m.get("on_enter", []) + m.get("events", []):
			var tc: String = trig.get("cutscene", "")
			if tc != "" and not cutscenes.has(tc):
				validation_errors.append("Map '%s' trigger references unknown cutscene '%s'" % [mid, tc])

	# Quest objectives are well-formed.
	for q in quests:
		if q.get("flag", "") == "":
			validation_errors.append("Quest '%s' has no completion flag" % q.get("id", "?"))


# --- IO helpers ------------------------------------------------------------

func _read_json(path: String) -> Dictionary:
	if not FileAccess.file_exists(path):
		validation_errors.append("Missing data file: " + path)
		return {}
	var text := FileAccess.get_file_as_string(path)
	var parsed = JSON.parse_string(text)
	if parsed == null or not parsed is Dictionary:
		validation_errors.append("Malformed JSON: " + path)
		return {}
	return parsed


func _list_files(dir_path: String, ext: String) -> Array:
	var out: Array = []
	var dir := DirAccess.open(dir_path)
	if dir == null:
		return out
	dir.list_dir_begin()
	var f := dir.get_next()
	while f != "":
		if not dir.current_is_dir() and f.ends_with(ext):
			out.append(f)
		f = dir.get_next()
	out.sort()
	return out
