extends Node2D
## Data-driven overworld: renders data/maps/<id>.json as a 16px grid, handles
## grid movement, NPC interaction, warps, wild encounters, and the pause menu.

const CELL := 16
const FONT_SIZE := 8

var map: Dictionary = {}
var grid: Array = []          # array of row strings
var npc_nodes: Dictionary = {}  # npc_id -> ColorRect
var player_rect: Control
var _player_offset := Vector2(2, 2)
var facing := Vector2i(0, 1)
var moving := false

var dialogue: DialogueBox
var menu: MenuSystem
var shop: ShopUI
var _pending_npc: Dictionary = {}
var ui_layer: CanvasLayer
var map_label: Label


func _ready() -> void:
	var gs := get_node("/root/GameState")
	var reg := get_node("/root/DataRegistry")
	map = reg.map_def(gs.current_map)
	if map.is_empty():
		push_error("Unknown map: " + gs.current_map)
		gs.current_map = "konoha"
		map = reg.map_def("konoha")
	grid = map.get("grid", [])
	get_node("/root/AudioDirector").play_bgm(map.get("music", "town_theme"))

	_build_map()
	_build_npcs()
	_build_player(gs.player_cell)
	_build_ui()
	_handle_battle_return()


# --- Construction ---------------------------------------------------------

func _build_map() -> void:
	var pal: Dictionary = map.get("palette", {})
	for y in grid.size():
		var row: String = grid[y]
		for x in row.length():
			var rect := ColorRect.new()
			rect.position = Vector2(x * CELL, y * CELL)
			rect.size = Vector2(CELL, CELL)
			rect.color = _tile_color(row[x], pal)
			add_child(rect)
	for warp in map.get("warps", []):
		var cell: Array = warp["cell"]
		var marker := ColorRect.new()
		marker.position = Vector2(int(cell[0]) * CELL + 4, int(cell[1]) * CELL + 4)
		marker.size = Vector2(8, 8)
		marker.color = Color("#ffd060")
		add_child(marker)


func _tile_color(ch: String, pal: Dictionary) -> Color:
	match ch:
		"#": return Color(pal.get("wall", "#444444"))
		",": return Color(pal.get("grass", "#3a7a3a"))
		"~": return Color(pal.get("water", "#3a5a9a"))
		_: return Color(pal.get("floor", "#999977"))


func _build_npcs() -> void:
	var gs := get_node("/root/GameState")
	for npc in map.get("npcs", []):
		# Defeated bosses stay gone (their story flag is set).
		var boss: Dictionary = npc.get("boss", {})
		if not boss.is_empty() and gs.has_flag(boss.get("flag", "")):
			continue
		var cell: Array = npc["cell"]
		var rect := ColorRect.new()
		rect.position = Vector2(int(cell[0]) * CELL + 2, int(cell[1]) * CELL + 2)
		rect.size = Vector2(12, 12)
		rect.color = Color(npc.get("color", "#ffffff"))
		add_child(rect)
		npc_nodes[npc["id"]] = rect


func _build_player(cell: Vector2i) -> void:
	# Lead party unit walks the overworld; red block when no art exists yet.
	var gs := get_node("/root/GameState")
	var tex: Texture2D = null
	if gs.party.size() > 0:
		tex = get_node("/root/DataRegistry").unit_texture(gs.party[0].unit_id, "overworld")
	if tex != null:
		var tr := TextureRect.new()
		tr.size = Vector2(16, 24)
		tr.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		tr.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		tr.texture = tex
		_player_offset = Vector2(0, -8)  # feet on the tile, head overlaps above
		player_rect = tr
	else:
		var rect := ColorRect.new()
		rect.size = Vector2(12, 12)
		rect.color = Color("#ff4040")
		_player_offset = Vector2(2, 2)
		player_rect = rect
	player_rect.position = Vector2(cell.x * CELL, cell.y * CELL) + _player_offset
	add_child(player_rect)


func _build_ui() -> void:
	ui_layer = CanvasLayer.new()
	add_child(ui_layer)
	map_label = Label.new()
	map_label.text = map.get("name", "?")
	map_label.position = Vector2(4, 2)
	map_label.add_theme_font_size_override("font_size", FONT_SIZE)
	map_label.add_theme_color_override("font_color", Color("#ffffff"))
	ui_layer.add_child(map_label)

	dialogue = DialogueBox.new()
	dialogue.position = Vector2(4, 116)
	dialogue.finished.connect(_on_dialogue_finished)
	ui_layer.add_child(dialogue)

	menu = MenuSystem.new()
	menu.position = Vector2(140, 14)
	menu.visible = false
	ui_layer.add_child(menu)

	shop = ShopUI.new()
	shop.position = Vector2(20, 14)
	shop.visible = false
	ui_layer.add_child(shop)


# --- Battle return ----------------------------------------------------------

func _handle_battle_return() -> void:
	var router := get_node("/root/SceneRouter")
	var result: Dictionary = router.battle_result
	router.battle_result = {}
	if result.is_empty():
		return
	var gs := get_node("/root/GameState")
	match result.get("outcome", ""):
		"defeat":
			gs.heal_party()
			gs.ryo = gs.ryo / 2
			dialogue.open("", ["You blacked out and were carried back to the village...", "Half your ryo went to the medics."])
		"victory":
			var boss: Dictionary = result.get("boss", {})
			if not boss.is_empty():
				gs.set_flag(boss.get("flag", ""))
				for item_id in boss.get("reward_items", {}):
					gs.grant_item(item_id, int(boss["reward_items"][item_id]))
				gs.ryo += int(boss.get("reward_ryo", 0))
				gs.commander_level += 1
				gs.tactical_slots = mini(6, gs.tactical_slots + 1)
				gs.authority += 10
				gs.chakra_reserve += 20
				dialogue.open("", [boss.get("victory_text", "Victory!"), "Commander rank up! Authority, chakra reserve and tactical slots increased."])
				# Boss is gone — rebuild NPCs so the sprite disappears.
				var node = npc_nodes.get(result.get("boss_npc_id", ""))
				if node:
					node.queue_free()
		"caught":
			dialogue.open("", ["%s joined your forces!" % result.get("caught_name", "A new ally")])


# --- Input / movement -------------------------------------------------------

func _unhandled_input(event: InputEvent) -> void:
	if dialogue.visible:
		dialogue.handle_input(event)
		return
	if shop.visible:
		shop.handle_input(event)
		return
	if menu.visible:
		menu.handle_input(event)
		return
	if event.is_action_pressed("ui_cancel"):
		menu.open()
		return
	if event.is_action_pressed("ui_accept"):
		_interact()
		return
	var dir := Vector2i.ZERO
	if event.is_action_pressed("ui_up", true):
		dir = Vector2i(0, -1)
	elif event.is_action_pressed("ui_down", true):
		dir = Vector2i(0, 1)
	elif event.is_action_pressed("ui_left", true):
		dir = Vector2i(-1, 0)
	elif event.is_action_pressed("ui_right", true):
		dir = Vector2i(1, 0)
	if dir != Vector2i.ZERO:
		_try_move(dir)


func _try_move(dir: Vector2i) -> void:
	facing = dir
	var gs := get_node("/root/GameState")
	var dest: Vector2i = gs.player_cell + dir

	for warp in map.get("warps", []):
		var cell: Array = warp["cell"]
		if dest == Vector2i(int(cell[0]), int(cell[1])):
			get_node("/root/SceneRouter").go_to_map(warp["to_map"], Vector2i(int(warp["to_cell"][0]), int(warp["to_cell"][1])))
			return

	if not _walkable(dest) or _npc_at(dest).size() > 0:
		return
	gs.player_cell = dest
	player_rect.position = Vector2(dest.x * CELL, dest.y * CELL) + _player_offset

	if _tile_at(dest) == ",":
		_roll_encounter()


func _walkable(cell: Vector2i) -> bool:
	var t := _tile_at(cell)
	return t != "" and t != "#" and t != "~"


func _tile_at(cell: Vector2i) -> String:
	if cell.y < 0 or cell.y >= grid.size():
		return ""
	var row: String = grid[cell.y]
	if cell.x < 0 or cell.x >= row.length():
		return ""
	return row[cell.x]


func _npc_at(cell: Vector2i) -> Dictionary:
	var gs := get_node("/root/GameState")
	for npc in map.get("npcs", []):
		var boss: Dictionary = npc.get("boss", {})
		if not boss.is_empty() and gs.has_flag(boss.get("flag", "")):
			continue
		if Vector2i(int(npc["cell"][0]), int(npc["cell"][1])) == cell:
			return npc
	return {}


# --- Interaction ------------------------------------------------------------

func _interact() -> void:
	var gs := get_node("/root/GameState")
	var npc := _npc_at(gs.player_cell + facing)
	if npc.is_empty():
		return
	_pending_npc = npc
	get_node("/root/AudioDirector").sfx_confirm()
	dialogue.open(npc.get("name", "???"), npc.get("dialogue", ["..."]))


func _on_dialogue_finished() -> void:
	var npc := _pending_npc
	_pending_npc = {}
	if npc.is_empty():
		return
	var gs := get_node("/root/GameState")
	match npc.get("action", ""):
		"heal_party":
			gs.heal_party()
			get_node("/root/AudioDirector").sfx_heal()
		"open_shop":
			shop.open()
		"boss_battle":
			_start_boss_battle(npc)


func _start_boss_battle(npc: Dictionary) -> void:
	var reg := get_node("/root/DataRegistry")
	var boss: Dictionary = npc.get("boss", {})
	var enemy_party: Array = []
	for entry in boss.get("party", []):
		enemy_party.append(UnitInstance.create(reg, entry[0], int(entry[1])))
	get_node("/root/SceneRouter").go_to_battle(enemy_party, {
		"is_wild": false, "boss": boss, "boss_npc_id": npc.get("id", ""), "music": "battle_boss",
	})


func _roll_encounter() -> void:
	var enc: Dictionary = map.get("encounters", {})
	if randf() >= float(enc.get("rate", 0.0)):
		return
	var table: Array = enc.get("table", [])
	if table.is_empty():
		return
	var total := 0
	for row in table:
		total += int(row.get("weight", 1))
	var roll := randi_range(1, total)
	var picked: Dictionary = table[0]
	for row in table:
		roll -= int(row.get("weight", 1))
		if roll <= 0:
			picked = row
			break
	var reg := get_node("/root/DataRegistry")
	var lvl := randi_range(int(picked.get("min_level", 3)), int(picked.get("max_level", 5)))
	var wild := UnitInstance.create(reg, picked["unit"], lvl)
	get_node("/root/GameState").mark_seen(wild.unit_id)
	get_node("/root/SceneRouter").go_to_battle([wild], {"is_wild": true, "music": "battle_wild"})
