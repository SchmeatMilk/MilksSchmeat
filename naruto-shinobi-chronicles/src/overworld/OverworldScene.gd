extends Node2D
## Data-driven scrolling overworld. Renders data/maps/<id>.json with a real
## tileset, building/prop objects, animated character sprites and a follow
## camera. Falls back to palette ColorRects if visual manifests are absent.

const CELL := 16
const VW := 256
const VH := 192
const FW := 24
const FH := 32
const FONT_SIZE := 8
const STEP_TIME := 0.12

var map: Dictionary = {}
var grid: Array = []
var legend: Dictionary = {}
var solid_cells := {}           # Vector2i -> true
var npc_cells := {}             # Vector2i -> npc dict

var atlas_tex: Texture2D
var tile_regions := {}          # name -> Rect2
var water_sprites: Array = []   # for animation
var anim_t := 0.0
var anim_frame := 0

var world: Node2D               # holds all world sprites (camera moves over it)
var camera: Camera2D
var player: Sprite2D
var player_key := "naruto"
var facing := Vector2i(0, 1)
var moving := false

var dialogue: DialogueBox
var menu: MenuSystem
var shop: ShopUI
var _pending_npc: Dictionary = {}
var ui_layer: CanvasLayer
var map_label: Label

var _char_sheets := {}          # key -> Texture2D


func _ready() -> void:
	var gs := get_node("/root/GameState")
	var reg := get_node("/root/DataRegistry")
	map = reg.map_def(gs.current_map)
	if map.is_empty():
		gs.current_map = "konoha"
		map = reg.map_def("konoha")
	grid = map.get("grid", [])
	legend = reg.tiles_visual.get("legend", {})
	get_node("/root/AudioDirector").play_bgm(map.get("music", "town_theme"))

	world = Node2D.new()
	add_child(world)

	_load_tileset(reg)
	_build_ground()
	_build_props(reg)
	_build_buildings(reg)
	_build_npcs(reg)
	_build_player(gs.player_cell, reg)
	_build_camera()
	_build_ui()
	_handle_battle_return()


# --- Tileset ----------------------------------------------------------------

func _load_tileset(reg) -> void:
	var tv: Dictionary = reg.tiles_visual
	if tv.is_empty():
		return
	atlas_tex = load(tv.get("atlas", ""))
	var idx: Dictionary = tv.get("index", {})
	for name in idx:
		var cr: Array = idx[name]
		tile_regions[name] = Rect2(int(cr[0]) * CELL, int(cr[1]) * CELL, CELL, CELL)


func _tile_name(ch: String) -> String:
	return legend.get(ch, "grass")


func _make_tile_sprite(region_name: String, cell: Vector2i, z: int) -> Sprite2D:
	var s := Sprite2D.new()
	s.texture = atlas_tex
	s.region_enabled = true
	s.region_rect = tile_regions.get(region_name, Rect2(0, 0, CELL, CELL))
	s.centered = false
	s.position = Vector2(cell.x * CELL, cell.y * CELL)
	s.z_index = z
	world.add_child(s)
	return s


func _build_ground() -> void:
	if atlas_tex == null:
		_build_ground_fallback()
		return
	for y in grid.size():
		var row: String = grid[y]
		for x in row.length():
			var name := _tile_name(row[x])
			var spr := _make_tile_sprite(name, Vector2i(x, y), -4096)
			if name == "water":
				water_sprites.append(spr)
	# water shore overlays
	for y in grid.size():
		var row: String = grid[y]
		for x in row.length():
			if _tile_name(row[x]) != "water":
				continue
			for side in [["n", 0, -1], ["s", 0, 1], ["w", -1, 0], ["e", 1, 0]]:
				if not _is_water(x + int(side[1]), y + int(side[2])):
					_make_tile_sprite("shore_" + side[0], Vector2i(x, y), -4090)


func _is_water(x: int, y: int) -> bool:
	if y < 0 or y >= grid.size():
		return true
	var row: String = grid[y]
	if x < 0 or x >= row.length():
		return true
	return _tile_name(row[x]) == "water"


func _build_ground_fallback() -> void:
	var pal: Dictionary = map.get("palette", {"grass": "#5a8a4a", "water": "#3a5a9a", "wall": "#444", "floor": "#998"})
	for y in grid.size():
		var row: String = grid[y]
		for x in row.length():
			var rect := ColorRect.new()
			rect.position = Vector2(x * CELL, y * CELL)
			rect.size = Vector2(CELL, CELL)
			var ch: String = row[x]
			var c: String = pal.get("floor", "#998877")
			match ch:
				"#", "T", "C": c = pal.get("wall", "#444444")
				".", "g": c = pal.get("grass", "#5a8a4a")
				",", "D": c = pal.get("grass", "#3a7a3a")
				"W", "~": c = pal.get("water", "#3a5a9a")
				"P", "s": c = "#c8b088"
			rect.color = Color(c)
			world.add_child(rect)


# --- Props & Buildings ------------------------------------------------------

func _building_sprite(reg, type: String) -> Sprite2D:
	var bv: Dictionary = reg.building_visual(type)
	if bv.is_empty():
		return null
	var s := Sprite2D.new()
	s.texture = load(bv.get("sprite", ""))
	s.centered = false
	return s


func _build_props(reg) -> void:
	for p in map.get("props", []):
		var type: String = p.get("type", "")
		var cell := Vector2i(int(p["cell"][0]), int(p["cell"][1]))
		var s := _building_sprite(reg, type)
		if s == null:
			continue
		var h: int = int(reg.building_visual(type).get("h", CELL))
		s.position = Vector2(cell.x * CELL, cell.y * CELL + CELL - h)
		s.z_index = cell.y * CELL + CELL          # sort by base
		world.add_child(s)
		# trees / posts / lamps / fences block movement
		solid_cells[cell] = true


func _build_buildings(reg) -> void:
	for b in map.get("buildings", []):
		var type: String = b.get("type", "")
		var cell := Vector2i(int(b["cell"][0]), int(b["cell"][1]))
		var bv: Dictionary = reg.building_visual(type)
		var s := _building_sprite(reg, type)
		if s == null:
			continue
		var h: int = int(bv.get("h", CELL))
		s.position = Vector2(cell.x * CELL, cell.y * CELL)
		s.z_index = cell.y * CELL + h             # base of the building
		world.add_child(s)
		# footprint collision, minus any walkable door cells
		var tw: int = int(bv.get("tw", 1))
		var th: int = int(bv.get("th", 1))
		var door := {}
		for off in b.get("door", []):
			door[Vector2i(int(off[0]), int(off[1]))] = true
		for yy in range(th):
			for xx in range(tw):
				if not door.has(Vector2i(xx, yy)):
					solid_cells[cell + Vector2i(xx, yy)] = true


# --- Characters -------------------------------------------------------------

func _char_sheet(reg, key: String) -> Texture2D:
	if _char_sheets.has(key):
		return _char_sheets[key]
	var uv: Dictionary = reg.unit_visual(key)
	var path: String = uv.get("overworld", "")
	var tex: Texture2D = null
	if path != "" and ResourceLoader.exists(path):
		tex = load(path)
	_char_sheets[key] = tex
	return tex


func _make_char(reg, key: String, cell: Vector2i, facing_dir: Vector2i) -> Sprite2D:
	var tex := _char_sheet(reg, key)
	var s := Sprite2D.new()
	s.centered = false
	if tex != null:
		s.texture = tex
		s.region_enabled = true
		s.region_rect = Rect2(CELL * 0, 0, FW, FH)   # placeholder, set below
	else:
		# fallback palette block
		var img := Image.create(FW, FH, false, Image.FORMAT_RGBA8)
		var pal: Dictionary = reg.unit(key).palette if reg.unit(key) else {}
		img.fill(Color(pal.get("primary", "#888888")))
		s.texture = ImageTexture.create_from_image(img)
	s.set_meta("key", key)
	world.add_child(s)
	_place_char(s, cell)
	_set_char_frame(s, facing_dir, 1)
	return s


func _place_char(s: Sprite2D, cell: Vector2i) -> void:
	s.position = Vector2(cell.x * CELL + (CELL - FW) / 2.0, cell.y * CELL + CELL - FH + 2)
	s.z_index = cell.y * CELL + CELL


func _dir_row(d: Vector2i) -> int:
	if d == Vector2i(0, -1): return 3   # up
	if d == Vector2i(-1, 0): return 1   # left
	if d == Vector2i(1, 0): return 2    # right
	return 0                            # down


func _set_char_frame(s: Sprite2D, d: Vector2i, col: int) -> void:
	if not s.region_enabled:
		return
	s.region_rect = Rect2(col * FW, _dir_row(d) * FH, FW, FH)


func _build_npcs(reg) -> void:
	var gs := get_node("/root/GameState")
	for npc in map.get("npcs", []):
		var boss: Dictionary = npc.get("boss", {})
		if not boss.is_empty() and gs.has_flag(boss.get("flag", "")):
			continue
		var cell := Vector2i(int(npc["cell"][0]), int(npc["cell"][1]))
		var key: String = npc.get("sprite", npc.get("id", "leaf_genin"))
		var face_s: String = npc.get("facing", "down")
		var fd: Vector2i = {"down": Vector2i(0, 1), "up": Vector2i(0, -1), "left": Vector2i(-1, 0), "right": Vector2i(1, 0)}.get(face_s, Vector2i(0, 1))
		_make_char(reg, key, cell, fd)
		npc_cells[cell] = npc
		solid_cells[cell] = true


func _build_player(cell: Vector2i, reg) -> void:
	var gs := get_node("/root/GameState")
	if gs.party.size() > 0:
		player_key = gs.party[0].unit_id
	player = _make_char(reg, player_key, cell, facing)
	player.z_index = cell.y * CELL + CELL + 1


func _build_camera() -> void:
	camera = Camera2D.new()
	camera.position_smoothing_enabled = true
	camera.position_smoothing_speed = 8.0
	var cols := 0
	if not grid.is_empty():
		cols = String(grid[0]).length()
	var sz: Array = map.get("size", [cols, grid.size()])
	camera.limit_left = 0
	camera.limit_top = 0
	camera.limit_right = maxi(VW, int(sz[0]) * CELL)
	camera.limit_bottom = maxi(VH, int(sz[1]) * CELL)
	add_child(camera)
	camera.make_current()
	_update_camera()


func _update_camera() -> void:
	if camera == null or player == null:
		return
	var gs := get_node("/root/GameState")
	var c: Vector2i = gs.player_cell
	camera.position = Vector2(c.x * CELL + CELL / 2.0, c.y * CELL + CELL / 2.0)


func _process(delta: float) -> void:
	if water_sprites.is_empty():
		return
	anim_t += delta
	if anim_t >= 0.6:
		anim_t = 0.0
		anim_frame = 1 - anim_frame
		var rn := "water2" if anim_frame else "water"
		var r: Rect2 = tile_regions.get(rn, Rect2(0, 0, CELL, CELL))
		for s in water_sprites:
			s.region_rect = r


# --- UI ---------------------------------------------------------------------

func _build_ui() -> void:
	ui_layer = CanvasLayer.new()
	add_child(ui_layer)
	var name_panel := PanelContainer.new()
	name_panel.position = Vector2(4, 3)
	var st := StyleBoxFlat.new()
	st.bg_color = Color("#1a2440ee")
	st.border_color = Color("#e8e0c8")
	st.set_border_width_all(1)
	st.set_content_margin_all(3)
	st.set_corner_radius_all(2)
	name_panel.add_theme_stylebox_override("panel", st)
	map_label = Label.new()
	map_label.text = map.get("name", "?")
	map_label.add_theme_font_size_override("font_size", FONT_SIZE)
	map_label.add_theme_color_override("font_color", Color("#ffffff"))
	name_panel.add_child(map_label)
	ui_layer.add_child(name_panel)

	dialogue = DialogueBox.new()
	dialogue.position = Vector2(8, 146)
	dialogue.finished.connect(_on_dialogue_finished)
	ui_layer.add_child(dialogue)

	menu = MenuSystem.new()
	menu.position = Vector2(150, 14)
	menu.visible = false
	ui_layer.add_child(menu)

	shop = ShopUI.new()
	shop.position = Vector2(24, 16)
	shop.visible = false
	ui_layer.add_child(shop)


# --- Battle return (unchanged behaviour) ------------------------------------

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
	if moving:
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
	_set_char_frame(player, facing, 1)
	var gs := get_node("/root/GameState")
	var dest: Vector2i = gs.player_cell + dir

	for warp in map.get("warps", []):
		var cell: Array = warp["cell"]
		if dest == Vector2i(int(cell[0]), int(cell[1])):
			get_node("/root/SceneRouter").go_to_map(warp["to_map"], Vector2i(int(warp["to_cell"][0]), int(warp["to_cell"][1])))
			return

	if not _walkable(dest):
		# bump animation only
		_set_char_frame(player, facing, 0)
		return
	gs.player_cell = dest
	_animate_step(dest)
	if _tile_name(_tile_at(dest)) in ["tallgrass"]:
		_roll_encounter()


func _animate_step(dest: Vector2i) -> void:
	moving = true
	var step := 0
	var target := Vector2(dest.x * CELL + (CELL - FW) / 2.0, dest.y * CELL + CELL - FH + 2)
	var tw := create_tween()
	tw.tween_property(player, "position", target, STEP_TIME)
	# toggle walk frame at the midpoint
	_set_char_frame(player, facing, 0 if (dest.x + dest.y) % 2 == 0 else 2)
	tw.parallel().tween_callback(_update_camera)
	await tw.finished
	player.z_index = dest.y * CELL + CELL + 1
	_set_char_frame(player, facing, 1)
	_update_camera()
	moving = false


func _walkable(cell: Vector2i) -> bool:
	if cell.y < 0 or cell.y >= grid.size():
		return false
	var row: String = grid[cell.y]
	if cell.x < 0 or cell.x >= row.length():
		return false
	if solid_cells.has(cell):
		return false
	# legacy solidity for fallback maps
	var ch: String = row[cell.x]
	var solids: Array = get_node("/root/DataRegistry").tiles_visual.get("solid", ["#", "~"])
	return not (ch in solids)


func _tile_at(cell: Vector2i) -> String:
	if cell.y < 0 or cell.y >= grid.size():
		return ""
	var row: String = grid[cell.y]
	if cell.x < 0 or cell.x >= row.length():
		return ""
	return row[cell.x]


# --- Interaction ------------------------------------------------------------

func _interact() -> void:
	var gs := get_node("/root/GameState")
	var target: Vector2i = gs.player_cell + facing
	var npc: Dictionary = npc_cells.get(target, {})
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
