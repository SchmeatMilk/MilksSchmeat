class_name ListMenu
extends PanelContainer
## GBA-style cursor list menu. Parent drives input via handle_input() so
## modality is explicit (only the top of the UI stack gets events).

signal item_selected(meta)
signal cancelled

const FONT_SIZE := 8

var items: Array = []      # [{label:String, meta, disabled:bool}]
var cursor: int = 0
var _vbox: VBoxContainer


func _init() -> void:
	_vbox = VBoxContainer.new()
	_vbox.add_theme_constant_override("separation", 0)
	add_child(_vbox)
	var style := StyleBoxFlat.new()
	style.bg_color = Color("#102040")
	style.border_color = Color("#e8e8e8")
	style.set_border_width_all(1)
	style.set_content_margin_all(4)
	add_theme_stylebox_override("panel", style)


func set_items(p_items: Array) -> void:
	items = p_items
	cursor = 0
	_skip_disabled(1)
	_redraw()


func handle_input(event: InputEvent) -> bool:
	if not visible or items.is_empty():
		return false
	if event.is_action_pressed("ui_down"):
		cursor = (cursor + 1) % items.size()
		_skip_disabled(1)
		_redraw()
		return true
	if event.is_action_pressed("ui_up"):
		cursor = (cursor - 1 + items.size()) % items.size()
		_skip_disabled(-1)
		_redraw()
		return true
	if event.is_action_pressed("ui_accept"):
		var it: Dictionary = items[cursor]
		if not it.get("disabled", false):
			item_selected.emit(it.get("meta"))
		return true
	if event.is_action_pressed("ui_cancel"):
		cancelled.emit()
		return true
	return false


func _skip_disabled(dir: int) -> void:
	var tries := items.size()
	while tries > 0 and items[cursor].get("disabled", false):
		cursor = (cursor + dir + items.size()) % items.size()
		tries -= 1


func _redraw() -> void:
	for child in _vbox.get_children():
		child.queue_free()
	for i in items.size():
		var it: Dictionary = items[i]
		var label := Label.new()
		label.text = ("> " if i == cursor else "  ") + str(it.get("label", "?"))
		label.add_theme_font_size_override("font_size", FONT_SIZE)
		var color := Color("#ffffff") if i == cursor else Color("#a0b0c8")
		if it.get("disabled", false):
			color = Color("#586878")
		label.add_theme_color_override("font_color", color)
		_vbox.add_child(label)
