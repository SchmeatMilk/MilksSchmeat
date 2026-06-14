extends Node
## GameState — the run: commander, party, archive, inventory, flags, position.
## Everything here serializes into the 32KB save blob via to_dict()/from_dict().

signal party_changed
signal flags_changed

const MAX_PARTY := 6
const ARCHIVE_BOXES := 8
const BOX_SIZE := 30

# Commander (spec section 2)
var commander_name: String = "Commander"
var commander_level: int = 1          # rises on story beats
var authority: int = 20               # max obedient unit level
var chakra_reserve: int = 100         # team CP pool in battle
var tactical_slots: int = 3           # active party size cap (3 -> 6)

var party: Array = []                 # Array[UnitInstance]
var archive: Array = []               # Array[UnitInstance] (boxes flattened)
var inventory: Dictionary = {"sealing_tag": 5, "blood_pill": 3, "chakra_pill": 2}
var ryo: int = 500
var story_flags: Dictionary = {}      # {flag_name: true}
var bingo_book: Dictionary = {}       # unit_id -> "seen"|"contracted"
var seen_cutscenes: Dictionary = {}   # cutscene_id -> true (one-shot scenes don't replay)

var current_map: String = "konoha"
var player_cell: Vector2i = Vector2i(7, 7)

# Scroll archetype -> the themed starter unit it grants at graduation.
const SCROLL_UNITS := {"taijutsu": "rock_lee", "ninjutsu": "tenten", "genjutsu": "shino"}


func registry() -> Node:
	return get_node("/root/DataRegistry")


## Start a new run. The player is always Naruto (lead_id); the graduation cutscene
## recruits the rest of Team 7 plus the themed unit for the chosen scroll. Keeping
## the starting party to the single lead keeps new_game("naruto") smoke-test-stable.
func new_game(lead_id: String = "naruto", scroll_id: String = "") -> void:
	commander_name = "Naruto"
	commander_level = 1
	authority = 20
	chakra_reserve = 100
	tactical_slots = 3
	party = [UnitInstance.create(registry(), lead_id, 5)]
	archive = []
	inventory = {"sealing_tag": 5, "blood_pill": 3, "chakra_pill": 2}
	ryo = 500
	story_flags = {}
	seen_cutscenes = {}
	bingo_book = {lead_id: "contracted"}
	if scroll_id != "" and SCROLL_UNITS.has(scroll_id):
		story_flags["chose_" + scroll_id] = true
	current_map = "konoha"
	var sp: Array = registry().map_def("konoha").get("spawn", [7, 7])
	player_cell = Vector2i(int(sp[0]), int(sp[1]))
	party_changed.emit()


func add_unit(unit: UnitInstance) -> void:
	bingo_book[unit.unit_id] = "contracted"
	if party.size() < mini(MAX_PARTY, tactical_slots):
		party.append(unit)
	elif archive.size() < ARCHIVE_BOXES * BOX_SIZE:
		archive.append(unit)
	party_changed.emit()


func mark_seen(unit_id: String) -> void:
	if not bingo_book.has(unit_id):
		bingo_book[unit_id] = "seen"


func has_item(id: String) -> bool:
	return int(inventory.get(id, 0)) > 0


func consume_item(id: String) -> void:
	if has_item(id):
		inventory[id] = int(inventory[id]) - 1
		if inventory[id] <= 0:
			inventory.erase(id)


func grant_item(id: String, count: int = 1) -> void:
	inventory[id] = int(inventory.get(id, 0)) + count


func set_flag(flag: String) -> void:
	story_flags[flag] = true
	flags_changed.emit()


func has_flag(flag: String) -> bool:
	return story_flags.get(flag, false)


# --- Story / cutscenes -----------------------------------------------------

func mark_cutscene_seen(id: String) -> void:
	seen_cutscenes[id] = true


func has_seen_cutscene(id: String) -> bool:
	return seen_cutscenes.get(id, false)


## Add a story ally to the squad (graduation Team 7, Haku, etc.). No-op if already held.
func recruit(unit_id: String, level: int = 5) -> void:
	if bingo_book.get(unit_id, "") == "contracted":
		return
	add_unit(UnitInstance.create(registry(), unit_id, level))


## Remove a unit from the active squad and the archive (e.g. Sasuke's defection).
func remove_from_party(unit_id: String) -> void:
	party = party.filter(func(u): return u.unit_id != unit_id)
	archive = archive.filter(func(u): return u.unit_id != unit_id)
	party_changed.emit()


## The themed starter unit for whichever scroll was chosen at the title, or "".
func scroll_starter_unit() -> String:
	for scroll in SCROLL_UNITS:
		if has_flag("chose_" + scroll):
			return SCROLL_UNITS[scroll]
	return ""


func party_alive() -> bool:
	for u in party:
		if not u.is_fainted():
			return true
	return false


func heal_party() -> void:
	for u in party:
		u.current_hp = u.max_hp()
		u.status = ""
		u.status_turns = 0


# --- Serialization ---------------------------------------------------------

func to_dict() -> Dictionary:
	return {
		"version": 1,
		"commander_name": commander_name,
		"commander_level": commander_level,
		"authority": authority,
		"chakra_reserve": chakra_reserve,
		"tactical_slots": tactical_slots,
		"party": party.map(func(u): return u.to_dict()),
		"archive": archive.map(func(u): return u.to_dict()),
		"inventory": inventory,
		"ryo": ryo,
		"story_flags": story_flags,
		"bingo_book": bingo_book,
		"seen_cutscenes": seen_cutscenes,
		"current_map": current_map,
		"player_cell": [player_cell.x, player_cell.y],
	}


func from_dict(d: Dictionary) -> void:
	commander_name = d.get("commander_name", "Commander")
	commander_level = int(d.get("commander_level", 1))
	authority = int(d.get("authority", 20))
	chakra_reserve = int(d.get("chakra_reserve", 100))
	tactical_slots = int(d.get("tactical_slots", 3))
	party = []
	for ud in d.get("party", []):
		party.append(UnitInstance.from_dict(registry(), ud))
	archive = []
	for ud in d.get("archive", []):
		archive.append(UnitInstance.from_dict(registry(), ud))
	inventory = d.get("inventory", {})
	ryo = int(d.get("ryo", 0))
	story_flags = d.get("story_flags", {})
	bingo_book = d.get("bingo_book", {})
	seen_cutscenes = d.get("seen_cutscenes", {})
	current_map = d.get("current_map", "konoha")
	var cell: Array = d.get("player_cell", [7, 7])
	player_cell = Vector2i(int(cell[0]), int(cell[1]))
	party_changed.emit()
