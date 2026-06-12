class_name BattleState
extends RefCounted
## Pure battle state container. Owned by BattleEngine logic; rendered by BattleController.
## Deterministic: all randomness flows through `rng` (seedable for tests/replays).

var registry = null
var rng := RandomNumberGenerator.new()

var player_party: Array = []     # Array[UnitInstance]
var enemy_party: Array = []
var active_player: int = 0
var active_enemy: int = 0

# Shared chakra pools (spec section 3: Team CP, Commander stat)
var player_cp: int = 100
var player_max_cp: int = 100
var enemy_cp: int = 100
var enemy_max_cp: int = 100
const CP_REGEN_PER_TURN := 5

# Field effects: {field_id: turns_remaining}. e.g. scorched_earth, thundercloud, fissure
var field: Dictionary = {}

# Commander once-per-battle skills used flags
var commander_used: Dictionary = {"tactical_order": false, "chakra_infusion": false, "sealing_tag": false}

var turn_count: int = 0
var is_wild: bool = false        # wild encounters can be fled / contracted
var caught_unit = null           # set when a sealing tag succeeds
var combo_used_pairs: Array = [] # ["naruto|sasuke"] one combo per pair per battle
var log: Array = []              # battle event log (strings) for UI + tests


static func create(reg, p_player: Array, p_enemy: Array, p_max_cp: int, p_seed: int = 0) -> BattleState:
	var s := BattleState.new()
	s.registry = reg
	s.player_party = p_player
	s.enemy_party = p_enemy
	s.player_max_cp = p_max_cp
	s.player_cp = p_max_cp
	s.enemy_max_cp = 60 + 10 * p_enemy.size()
	s.enemy_cp = s.enemy_max_cp
	if p_seed != 0:
		s.rng.seed = p_seed
	else:
		s.rng.randomize()
	for u in p_player + p_enemy:
		u.reset_battle_state()
	return s


func active(side: String) -> UnitInstance:
	return player_party[active_player] if side == "player" else enemy_party[active_enemy]


func party(side: String) -> Array:
	return player_party if side == "player" else enemy_party


func cp(side: String) -> int:
	return player_cp if side == "player" else enemy_cp


func spend_cp(side: String, amount: int) -> void:
	if side == "player":
		player_cp = maxi(0, player_cp - amount)
	else:
		enemy_cp = maxi(0, enemy_cp - amount)


func restore_cp(side: String, amount: int) -> void:
	if side == "player":
		player_cp = mini(player_max_cp, player_cp + amount)
	else:
		enemy_cp = mini(enemy_max_cp, enemy_cp + amount)


func side_defeated(side: String) -> bool:
	for u in party(side):
		if not u.is_fainted():
			return false
	return true


func first_alive(side: String) -> int:
	var p := party(side)
	for i in p.size():
		if not p[i].is_fainted():
			return i
	return -1


func emit(line: String) -> void:
	log.append(line)


func has_field(field_id: String) -> bool:
	return field.has(field_id) and int(field[field_id]) > 0
