extends Control
## Title: New Game (Will of Fire / Prodigy / Control starter, or Custom Shinobi),
## or Continue from a save slot. Painted Hokage-Rock backdrop + DS-style menu.

const FONT_SIZE := 8

var _menu: ListMenu
var _builder: CustomBuilderUI
var _page := "root"


func _ready() -> void:
	# backdrop
	var bg := TextureRect.new()
	bg.texture = _tex("res://assets/ui/title_bg.png")
	bg.position = Vector2.ZERO
	bg.size = Vector2(256, 192)
	bg.stretch_mode = TextureRect.STRETCH_SCALE
	if bg.texture == null:
		var fb := ColorRect.new(); fb.size = Vector2(256, 192); fb.color = Color("#101a30"); add_child(fb)
	else:
		add_child(bg)

	# title logo band
	var banner := ColorRect.new()
	banner.position = Vector2(0, 16); banner.size = Vector2(256, 44); banner.color = Color("#0c1020aa")
	add_child(banner)
	var title := _logo_label("NARUTO", 20, Color("#ff7b1c"))
	title.position = Vector2(0, 14); title.size = Vector2(256, 26)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	add_child(title)
	var sub := _logo_label("SHINOBI  CHRONICLES", 10, Color("#f4e6c8"))
	sub.position = Vector2(0, 40); sub.size = Vector2(256, 14)
	sub.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	add_child(sub)

	_menu = ListMenu.new()
	_menu.position = Vector2(92, 118)
	_menu.item_selected.connect(_on_select)
	_menu.cancelled.connect(_on_cancel)
	add_child(_menu)

	_builder = CustomBuilderUI.new()
	_builder.position = Vector2(70, 96)
	_builder.visible = false
	_builder.built.connect(_on_custom_built)
	_builder.cancelled.connect(func():
		_builder.visible = false
		_show_root())
	add_child(_builder)

	var tag := _logo_label("Fan demake · v2 visual edition", 8, Color("#d8d2c0"))
	tag.position = Vector2(0, 180); tag.size = Vector2(252, 10)
	tag.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	add_child(tag)

	get_node("/root/AudioDirector").play_bgm("title_theme")
	_show_root()


func _tex(path: String) -> Texture2D:
	return load(path) if ResourceLoader.exists(path) else null


func _logo_label(text: String, size: int, color: Color) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	l.add_theme_color_override("font_outline_color", Color("#1a1024"))
	l.add_theme_constant_override("outline_size", 3)
	return l


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
	gs.new_game("naruto")
	gs.party = [unit]
	gs.bingo_book = {unit.unit_id: "contracted"}
	get_tree().change_scene_to_file("res://scenes/Overworld.tscn")


func _on_cancel() -> void:
	if _page != "root":
		_show_root()
