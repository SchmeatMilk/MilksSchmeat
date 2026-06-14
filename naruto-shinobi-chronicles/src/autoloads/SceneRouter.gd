extends Node
## SceneRouter — scene transitions with a payload handoff (battle params, warp
## targets) so scenes never reach into each other directly.

var payload: Dictionary = {}      # consumed by the incoming scene
var battle_result: Dictionary = {}  # set by BattleController on exit


func go_to_battle(enemy_party: Array, opts: Dictionary = {}) -> void:
	payload = {
		"enemy_party": enemy_party,
		"is_wild": opts.get("is_wild", false),
		"intro": opts.get("intro", ""),
		"return_map": get_node("/root/GameState").current_map,
		"music": opts.get("music", "battle_wild"),
	}
	get_tree().change_scene_to_file("res://scenes/Battle.tscn")


func return_from_battle(result: Dictionary) -> void:
	battle_result = result
	get_tree().change_scene_to_file("res://scenes/Overworld.tscn")


func go_to_map(map_id: String, cell: Vector2i) -> void:
	var gs := get_node("/root/GameState")
	gs.current_map = map_id
	gs.player_cell = cell
	get_tree().change_scene_to_file("res://scenes/Overworld.tscn")


func go_to_title() -> void:
	get_tree().change_scene_to_file("res://scenes/Title.tscn")
