class_name CutscenePlayer
extends Control
## Fullscreen scripted-scene player: an optional establishing-shot background plus a
## speaker/text box advanced by the player. Emits finished() after the last step.
## Cutscene data: data/cutscenes/<id>.json (loaded by DataRegistry). Art is optional —
## with no background it draws a solid GBA-blue backdrop, so scenes always play.

signal finished

const FONT_SIZE := 8

var _steps: Array = []
var _idx := 0
var _bg: TextureRect
var _dim: ColorRect
var _title: Label
var _speaker: Label
var _text: Label


func _init() -> void:
	size = Vector2(240, 160)
	mouse_filter = Control.MOUSE_FILTER_IGNORE

	_dim = ColorRect.new()
	_dim.size = Vector2(240, 160)
	_dim.color = Color("#0a1020")
	add_child(_dim)

	_bg = TextureRect.new()
	_bg.size = Vector2(240, 160)
	_bg.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	_bg.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	add_child(_bg)

	var shade := ColorRect.new()  # keeps text legible over bright art
	shade.size = Vector2(240, 160)
	shade.color = Color(0.03, 0.05, 0.10, 0.35)
	add_child(shade)

	_title = Label.new()
	_title.position = Vector2(6, 4)
	_title.add_theme_font_size_override("font_size", FONT_SIZE)
	_title.add_theme_color_override("font_color", Color("#ffd060"))
	add_child(_title)

	var panel := PanelContainer.new()
	panel.position = Vector2(4, 110)
	panel.custom_minimum_size = Vector2(232, 46)
	var style := StyleBoxFlat.new()
	style.bg_color = Color("#0a1428")
	style.border_color = Color("#e8e8e8")
	style.set_border_width_all(1)
	style.set_content_margin_all(4)
	panel.add_theme_stylebox_override("panel", style)
	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 0)
	panel.add_child(vbox)
	_speaker = Label.new()
	_speaker.add_theme_font_size_override("font_size", FONT_SIZE)
	_speaker.add_theme_color_override("font_color", Color("#7ec8ff"))
	vbox.add_child(_speaker)
	_text = Label.new()
	_text.add_theme_font_size_override("font_size", FONT_SIZE)
	_text.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_text.custom_minimum_size = Vector2(224, 30)
	vbox.add_child(_text)
	add_child(panel)

	visible = false


func play(cutscene: Dictionary) -> void:
	_steps = cutscene.get("steps", []).duplicate()
	_idx = 0
	_title.text = cutscene.get("title", "")
	var bg_path: String = cutscene.get("background", "")
	if bg_path != "" and ResourceLoader.exists(bg_path):
		_bg.texture = load(bg_path)
		_bg.visible = true
	else:
		_bg.texture = null
		_bg.visible = false
	visible = true
	_show_step()


func handle_input(event: InputEvent) -> bool:
	if not visible:
		return false
	if event.is_action_pressed("ui_accept") or event.is_action_pressed("ui_cancel"):
		_idx += 1
		_show_step()
	return true  # swallow all input while a scene is playing


func _show_step() -> void:
	if _idx >= _steps.size():
		visible = false
		finished.emit()
		return
	var step: Dictionary = _steps[_idx]
	_speaker.text = step.get("speaker", "")
	_text.text = str(step.get("text", ""))
