class_name UiKit
extends RefCounted
## Shared DS-style UI palette + builders so every panel/menu/bar matches.

const INK := Color("#26304a")
const PARCH := Color("#f6f1e2")
const PARCH_DK := Color("#e6dcc2")
const BORDER := Color("#3f5a96")
const BORDER_DK := Color("#26365e")
const ACCENT := Color("#d8a23a")
const SUB := Color("#6a7488")
const HP_GREEN := Color("#5ec860")
const HP_YELLOW := Color("#e8c038")
const HP_RED := Color("#e2503a")
const CP_BLUE := Color("#46a0e0")
const FONT := 8


static func panel(bg := PARCH, border := BORDER) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = bg
	s.border_color = border
	s.set_border_width_all(2)
	s.set_corner_radius_all(3)
	s.set_content_margin_all(4)
	s.shadow_color = Color(0, 0, 0, 0.28)
	s.shadow_size = 2
	s.shadow_offset = Vector2(1, 1)
	return s


static func make_panel(bg := PARCH, border := BORDER) -> PanelContainer:
	var p := PanelContainer.new()
	p.add_theme_stylebox_override("panel", panel(bg, border))
	return p


static func label(text := "", color := INK, size := FONT) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	return l


static func hp_color(cur: int, mx: int) -> Color:
	var r := float(cur) / maxi(1, mx)
	if r > 0.5:
		return HP_GREEN
	elif r > 0.2:
		return HP_YELLOW
	return HP_RED
