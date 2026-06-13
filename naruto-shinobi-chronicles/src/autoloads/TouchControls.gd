extends CanvasLayer
## TouchControls — on-screen D-pad + A/B overlay for touch devices.
## Buttons synthesize the same ui_* InputEventAction events the rest of the
## game already consumes (the smoke test drives the whole game this way), so
## no scene needs touch-specific code. Hidden automatically on devices
## without a touchscreen; force on/off with set_enabled().

const ECHO_DELAY := 0.30      # seconds before a held D-pad button starts repeating
const ECHO_INTERVAL := 0.12   # seconds between repeats while held

const DPAD_ACTIONS := ["ui_up", "ui_down", "ui_left", "ui_right"]

var buttons: Dictionary = {}  # action name -> Button
var _held: Dictionary = {}    # dpad action -> time accumulator


func _ready() -> void:
	layer = 100
	_build()
	set_enabled(DisplayServer.is_touchscreen_available() or OS.has_feature("mobile"))


func set_enabled(on: bool) -> void:
	visible = on
	set_process(on)
	if not on:
		for action in _held.keys():
			_send_action(action, false)
		_held.clear()


func _input(event: InputEvent) -> void:
	# F9 force-toggles the overlay so it can be previewed/tested on desktop,
	# where touchscreen auto-detection (in _ready) leaves it hidden. The buttons
	# are plain Buttons, so they respond to mouse clicks once shown.
	if event is InputEventKey and event.pressed and not event.echo and event.keycode == KEY_F9:
		set_enabled(not visible)
		get_viewport().set_input_as_handled()


func _build() -> void:
	if not buttons.is_empty():
		return
	# D-pad cluster, bottom-left. 18px squares in a plus layout.
	_add_button("ui_up", "^", Rect2(22, 104, 18, 18))
	_add_button("ui_left", "<", Rect2(3, 122, 18, 18))
	_add_button("ui_right", ">", Rect2(41, 122, 18, 18))
	_add_button("ui_down", "v", Rect2(22, 140, 18, 18))
	# A (confirm) and B (cancel), bottom-right, GBA placement (A above-right of B).
	_add_button("ui_accept", "A", Rect2(216, 112, 21, 21))
	_add_button("ui_cancel", "B", Rect2(192, 134, 21, 21))


func _add_button(action: String, text: String, rect: Rect2) -> void:
	var b := Button.new()
	b.name = action
	b.text = text
	b.position = rect.position
	b.size = rect.size
	b.focus_mode = Control.FOCUS_NONE      # never steal ui_* focus navigation
	b.modulate = Color(1, 1, 1, 0.55)      # translucent so the game stays visible
	b.add_theme_font_size_override("font_size", 8)
	b.button_down.connect(_on_button_down.bind(action))
	b.button_up.connect(_on_button_up.bind(action))
	add_child(b)
	buttons[action] = b


func _on_button_down(action: String) -> void:
	_send_action(action, true)
	if action in DPAD_ACTIONS:
		_held[action] = -ECHO_DELAY  # negative: wait ECHO_DELAY before first repeat


func _on_button_up(action: String) -> void:
	_held.erase(action)
	_send_action(action, false)


func _process(delta: float) -> void:
	# Auto-repeat held D-pad buttons, mirroring keyboard echo so held-walk
	# (OverworldScene's is_action_pressed(..., true)) and menu scrolling work.
	for action in _held.keys():
		_held[action] += delta
		if _held[action] >= ECHO_INTERVAL:
			_held[action] = 0.0
			_send_action(action, true)


func _send_action(action: String, pressed: bool) -> void:
	var ev := InputEventAction.new()
	ev.action = action
	ev.pressed = pressed
	Input.parse_input_event(ev)
