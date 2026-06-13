extends Control
## Title: New Game (pick a Will of Fire / Prodigy / Control starter, or build a
## Custom Shinobi), or Continue from one of three save slots.

const FONT_SIZE := 8

var _menu: ListMenu
var _builder: CustomBuilderUI
var _page := "root"


func _ready() -> void:
	var bg := ColorRect.new()
	bg.size = Vector2(240, 160)
	bg.color = Color("#101a30")
	add_child(bg)
	# Wave 1 establishing-shot art as the title backdrop, dimmed for legibility.
	var art_path := "res://assets/cutscenes/reference/village_gate_establishing_shot.jpg"
	if ResourceLoader.exists(art_path):
		var art := TextureRect.new()
		art.size = Vector2(240, 160)
		art.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		art.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
		art.texture = load(art_path)
		add_child(art)
		var dim := ColorRect.new()
		dim.size = Vector2(240, 160)
		dim.color = Color(0.04, 0.08, 0.16, 0.55)
		add_child(dim)

	var title := Label.new()
	title.text = "NARUTO: SHINOBI CHRONICLES"
	title.position = Vector2(34, 24)
	title.add_theme_font_size_override("font_size", 10)
	title.add_theme_color_override("font_color", Color("#ff7b1c"))
	add_child(title)
	var sub := Label.new()
	sub.text = "~ a GBA-style demake ~"
	sub.position = Vector2(74, 38)
	sub.add_theme_font_size_override("font_size", FONT_SIZE)
	sub.add_theme_color_override("font_color", Color("#a0b0c8"))
	add_child(sub)

	_menu = ListMenu.new()
	_menu.position = Vector2(80, 70)
	_menu.item_selected.connect(_on_select)
	_menu.cancelled.connect(_on_cancel)
	add_child(_menu)

	_builder = CustomBuilderUI.new()
	_builder.position = Vector2(80, 70)
	_builder.visible = false
	_builder.built.connect(_on_custom_built)
	_builder.cancelled.connect(func():
		_builder.visible = false
		_show_root())
	add_child(_builder)

	get_node("/root/AudioDirector").play_bgm("title_theme")
	_show_root()


func _unhandled_input(event: InputEvent) -> void:
	if _builder.visible:
		_builder.handle_input(event)
	else:
		_menu.handle_input(event)


func _show_root() -> void:
	_page = "root"
	_menu.visible = true
	_menu.set_items([
		{"label": "New Game", "meta": "new"},
		{"label": "Continue", "meta": "continue"},
		{"label": "Quit", "meta": "quit"},
	])


func _show_starters() -> void:
	_page = "starter"
	_menu.set_items([
		{"label": "Will of Fire — Naruto", "meta": "naruto"},
		{"label": "Prodigy's Path — Sasuke", "meta": "sasuke"},
		{"label": "Perfect Control — Sakura", "meta": "sakura"},
		{"label": "Custom Shinobi...", "meta": "custom"},
		{"label": "Back", "meta": null},
	])


func _show_slots() -> void:
	_page = "slots"
	var items: Array = []
	var sm := get_node("/root/SaveManager")
	for slot in 3:
		var summary: Dictionary = sm.slot_summary(slot)
		if summary.is_empty():
			items.append({"label": "Slot %d: empty" % (slot + 1), "meta": null, "disabled": true})
		else:
			items.append({"label": "Slot %d: %s (%d units)" % [slot + 1, summary.get("map", "?"), int(summary.get("party_size", 0))], "meta": slot})
	items.append({"label": "Back", "meta": null})
	_menu.set_items(items)


func _on_select(meta) -> void:
	get_node("/root/AudioDirector").sfx_confirm()
	match _page:
		"root":
			match meta:
				"new": _show_starters()
				"continue": _show_slots()
				"quit": get_tree().quit()
		"starter":
			if meta == null:
				_show_root()
			elif meta == "custom":
				_menu.visible = false
				_builder.open()
			else:
				get_node("/root/GameState").new_game(meta)
				get_tree().change_scene_to_file("res://scenes/Overworld.tscn")
		"slots":
			if meta == null:
				_show_root()
			elif get_node("/root/SaveManager").load_slot(int(meta)):
				get_tree().change_scene_to_file("res://scenes/Overworld.tscn")


func _on_custom_built(unit: UnitInstance) -> void:
	var gs := get_node("/root/GameState")
	gs.new_game("naruto")  # seed the run, then swap in the custom build
	gs.party = [unit]
	gs.bingo_book = {unit.unit_id: "contracted"}
	get_tree().change_scene_to_file("res://scenes/Overworld.tscn")


func _on_cancel() -> void:
	if _page != "root":
		_show_root()
