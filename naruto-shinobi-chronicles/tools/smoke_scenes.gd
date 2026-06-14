extends SceneTree
## Headless scene smoke test: wires the autoloads, instantiates the new
## Overworld + Battle scenes, runs frames and exercises movement so runtime
## errors (bad load paths, null derefs) surface in CI / verification.
##   godot --headless -s tools/smoke_scenes.gd

var phase := 0
var ow
var bt


func _add_autoloads() -> void:
	for spec in [["DataRegistry", "res://src/autoloads/DataRegistry.gd"],
				 ["GameState", "res://src/autoloads/GameState.gd"],
				 ["SaveManager", "res://src/autoloads/SaveManager.gd"],
				 ["SceneRouter", "res://src/autoloads/SceneRouter.gd"],
				 ["AudioDirector", "res://src/autoloads/AudioDirector.gd"]]:
		var n: Node = load(spec[1]).new()
		n.name = spec[0]
		root.add_child(n)


func _initialize() -> void:
	_add_autoloads()
	var gs = root.get_node("GameState")
	gs.new_game("naruto")
	gs.current_map = "konoha"
	gs.player_cell = Vector2i(21, 24)
	ow = load("res://scenes/Overworld.tscn").instantiate()
	root.add_child(ow)
	print("OVERWORLD_BUILT cells=", ow.solid_cells.size())


func _process(_delta: float) -> bool:
	phase += 1
	if phase == 2:
		# exercise movement in several directions
		for d in [Vector2i(0, -1), Vector2i(-1, 0), Vector2i(1, 0), Vector2i(0, 1)]:
			if is_instance_valid(ow):
				ow._try_move(d)
		print("OVERWORLD_MOVE_OK player=", root.get_node("GameState").player_cell)
	if phase == 4:
		if is_instance_valid(ow):
			ow.free()
		var reg = root.get_node("DataRegistry")
		var enemy := [UnitInstance.create(reg, "leaf_genin", 4)]
		root.get_node("SceneRouter").payload = {"enemy_party": enemy, "is_wild": true, "music": "battle_wild"}
		bt = load("res://scenes/Battle.tscn").instantiate()
		root.add_child(bt)
		print("BATTLE_BUILT")
	if phase >= 8:
		print("SMOKE_DONE")
		quit(0)
		return true
	return false
