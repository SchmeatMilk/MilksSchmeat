extends Node
## The persistent half of the smoke test (lives directly under /root).

var _failed := false


func _ready() -> void:
	_smoke()


func _fail(msg: String) -> void:
	printerr("SMOKE_FAIL: " + msg)
	_failed = true
	get_tree().quit(1)


func _smoke() -> void:
	var gs := get_node("/root/GameState")
	var reg := get_node("/root/DataRegistry")
	var router := get_node("/root/SceneRouter")

	print("[smoke] starting new game...")
	gs.new_game("naruto")
	if gs.party.size() != 1 or gs.party[0].unit_id != "naruto":
		return _fail("new_game party wrong")

	get_tree().change_scene_to_file("res://scenes/Overworld.tscn")
	await get_tree().create_timer(0.5).timeout
	if not get_tree().current_scene.scene_file_path.ends_with("Overworld.tscn"):
		return _fail("overworld did not load")
	print("[smoke] overworld up. starting wild battle...")

	var wild = UnitInstance.create(reg, "forest_snake", 3)
	router.go_to_battle([wild], {"is_wild": true})
	await get_tree().create_timer(1.0).timeout
	var battle = get_tree().current_scene
	if not battle.scene_file_path.ends_with("Battle.tscn"):
		return _fail("battle scene did not load")

	print("[smoke] battling with taijutsu until resolution...")
	var guard := 0
	while get_tree().current_scene.scene_file_path.ends_with("Battle.tscn") and guard < 40:
		battle = get_tree().current_scene
		if not battle._busy and battle.menu.visible:
			battle._commit_action({"type": "taijutsu"})
		await get_tree().create_timer(1.0).timeout
		guard += 1
	if guard >= 40:
		return _fail("battle never resolved")
	await get_tree().create_timer(0.5).timeout
	if not get_tree().current_scene.scene_file_path.ends_with("Overworld.tscn"):
		return _fail("did not return to overworld after battle")
	print("[smoke] battle resolved, back in overworld.")

	var sm := get_node("/root/SaveManager")
	if not sm.save_slot(0):
		return _fail("save failed")
	var exp_before: int = gs.party[0].exp
	gs.party = []
	if not sm.load_slot(0):
		return _fail("load failed")
	if gs.party.size() != 1 or gs.party[0].exp != exp_before:
		return _fail("save/load roundtrip mismatch")
	print("[smoke] save/load roundtrip verified.")

	print("SMOKE_OK")
	get_tree().quit(0)
