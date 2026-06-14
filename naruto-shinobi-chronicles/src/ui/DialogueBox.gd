class_name DialogueBox
extends PanelContainer
## Bottom-screen dialogue panel. Queue lines, advance with accept, emits finished.

signal finished

const FONT_SIZE := 8

var _lines: Array = []
var _label: Label
var _speaker: Label


func _init() -> void:
	custom_minimum_size = Vector2(240, 40)
	add_theme_stylebox_override("panel", UiKit.panel())
	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 1)
	add_child(vbox)
	_speaker = Label.new()
	_speaker.add_theme_font_size_override("font_size", FONT_SIZE)
	_speaker.add_theme_color_override("font_color", UiKit.BORDER)
	vbox.add_child(_speaker)
	_label = Label.new()
	_label.add_theme_font_size_override("font_size", FONT_SIZE)
	_label.add_theme_color_override("font_color", UiKit.INK)
	_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_label.custom_minimum_size = Vector2(228, 24)
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
