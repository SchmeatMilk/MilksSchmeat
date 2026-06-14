extends Node2D
## Smoke/preview harness run as a scene WITH real autoloads:
##   godot --headless --path . res://tools/Shot.tscn
## Builds the Overworld + Battle with a started game and exercises them so
## runtime errors surface. Optionally captures screenshots when not headless.

var phase := 0
var ow
var title
var capture := false


func _ready() -> void:
	capture = "--shot" in OS.get_cmdline_user_args()
	title = load("res://scenes/Title.tscn").instantiate()
	add_child(title)
	print("TITLE_BUILT")


func _process(_delta: float) -> void:
	phase += 1
	if phase == 3:
		if capture:
			_save("res://_shot_title.png")
		title.queue_free()
		GameState.new_game("naruto")
		GameState.current_map = "konoha"
		GameState.player_cell = Vector2i(21, 20)
		ow = load("res://scenes/Overworld.tscn").instantiate()
		add_child(ow)
		print("OW_BUILT solids=", ow.solid_cells.size(), " party=", GameState.party.size(),
			" player=", ow.player != null)
	if phase == 7:
		ow._try_move(Vector2i(0, -1))
		print("OW_MOVE_OK player=", GameState.player_cell)
	if phase == 12:
		if capture:
			_save("res://_shot_konoha.png")
		ow.queue_free()
		var enemy := [UnitInstance.create(DataRegistry, "leaf_genin", 4)]
		SceneRouter.payload = {"enemy_party": enemy, "is_wild": true, "music": "battle_wild"}
		add_child(load("res://scenes/Battle.tscn").instantiate())
		print("BT_BUILT")
	if phase == 48:        # after intro text flushes and the action menu opens
		if capture:
			_save("res://_shot_battle.png")
		print("SMOKE_DONE")
		get_tree().quit(0)


func _save(path: String) -> void:
	var img := get_viewport().get_texture().get_image()
	img.save_png(path)
	print("SAVED ", path)
