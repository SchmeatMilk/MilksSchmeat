class_name DialogueBox
extends PanelContainer
## Bottom-screen dialogue panel. Queue lines, advance with accept, emits finished.

signal finished

const FONT_SIZE := 8

var _lines: Array = []
var _label: Label
var _speaker: Label


func _init() -> void:
	custom_minimum_size = Vector2(232, 40)
	var style := StyleBoxFlat.new()
	style.bg_color = Color("#102040")
	style.border_color = Color("#e8e8e8")
	style.set_border_width_all(1)
	style.set_content_margin_all(4)
	add_theme_stylebox_override("panel", style)
	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 0)
	add_child(vbox)
	_speaker = Label.new()
	_speaker.add_theme_font_size_override("font_size", FONT_SIZE)
	_speaker.add_theme_color_override("font_color", Color("#ffd060"))
	vbox.add_child(_speaker)
	_label = Label.new()
	_label.add_theme_font_size_override("font_size", FONT_SIZE)
	_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_label.custom_minimum_size = Vector2(224, 24)
	vbox.add_child(_label)
	visible = false


func open(speaker: String, lines: Array) -> void:
	_speaker.text = speaker
	_lines = lines.duplicate()
	visible = true
	_advance()


func handle_input(event: InputEvent) -> bool:
	if not visible:
		return false
	if event.is_action_pressed("ui_accept") or event.is_action_pressed("ui_cancel"):
		_advance()
		return true
	return true  # swallow everything while open


func _advance() -> void:
	if _lines.is_empty():
		visible = false
		finished.emit()
		return
	_label.text = str(_lines.pop_front())
