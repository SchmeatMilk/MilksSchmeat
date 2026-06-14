class_name CustomBuilderUI
extends Control
## Custom Shinobi Builder (spec section 12, compacted for the vertical slice):
## Village -> two nature affinities -> innate trait -> done. Produces a
## UnitInstance based on custom_template with the chosen identity baked in.

signal built(unit)
signal cancelled

const FONT_SIZE := 8
const VILLAGES := ["leaf", "sand", "mist", "cloud", "stone", "rogue"]
const PICKABLE_NATURES := ["fire", "wind", "lightning", "earth", "water", "yin", "yang"]
const PICKABLE_TRAITS := ["substitution_master", "sensor", "medical_ninja", "chakra_control", "shadow_artisan", "beast_mimicry"]
const STARTER_JUTSU := {
	"fire": "fire_fireball", "wind": "wind_great_breakthrough", "lightning": "lightning_thunderbolt",
	"earth": "earth_headhunter", "water": "water_prison", "yin": "yin_hell_viewing", "yang": "yang_gentle_fist",
}

var _menu: ListMenu
var _info: Label
var _page := "village"
var _village := ""
var _natures: Array = []
var _trait := ""


func _init() -> void:
	_info = Label.new()
	_info.position = Vector2(0, -34)
	_info.add_theme_font_size_override("font_size", FONT_SIZE)
	_info.add_theme_color_override("font_color", Color("#ffd060"))
	add_child(_info)
	_menu = ListMenu.new()
	add_child(_menu)
	_menu.item_selected.connect(_on_select)
	_menu.cancelled.connect(func(): cancelled.emit())


func open() -> void:
	visible = true
	_village = ""
	_natures = []
	_trait = ""
	_show_village()


func handle_input(event: InputEvent) -> void:
	_menu.handle_input(event)


func _show_village() -> void:
	_page = "village"
	_info.text = "CUSTOM SHINOBI\nChoose your village:"
	_menu.set_items(VILLAGES.map(func(v): return {"label": v.capitalize(), "meta": v}))


func _show_natures() -> void:
	_page = "natures"
	_info.text = "Affinities (%d/2): %s" % [_natures.size(), ", ".join(_natures)]
	var items: Array = []
	for n in PICKABLE_NATURES:
		items.append({"label": n.capitalize(), "meta": n, "disabled": _natures.has(n)})
	_menu.set_items(items)


func _show_traits() -> void:
	_page = "traits"
	_info.text = "Choose your innate trait:"
	var reg := get_node("/root/DataRegistry")
	var items: Array = []
	for t in PICKABLE_TRAITS:
		items.append({"label": reg.traits_db.get(t, {}).get("name", t), "meta": t})
	_menu.set_items(items)


func _on_select(meta) -> void:
	match _page:
		"village":
			_village = meta
			_show_natures()
		"natures":
			_natures.append(meta)
			if _natures.size() < 2:
				_show_natures()
			else:
				_show_traits()
		"traits":
			_trait = meta
			_finish()


func _finish() -> void:
	var reg := get_node("/root/DataRegistry")
	# Bake a bespoke UnitData on top of the template, registered under a unique id.
	var template: UnitData = reg.unit("custom_shinobi")
	var custom := UnitData.new()
	custom.id = "custom_shinobi"
	custom.display_name = "%s Shinobi" % _village.capitalize()
	custom.base_stats = template.base_stats.duplicate()
	custom.growth_curve = template.growth_curve
	custom.nature = "balanced"
	custom.affinities = _natures.duplicate()
	custom.trait_id = _trait
	custom.learnset = template.learnset.duplicate(true)
	for n in _natures:
		custom.learnset.append({"level": 1, "jutsu": STARTER_JUTSU[n]})
	custom.rarity = "rare"
	custom.catch_rate = 0
	custom.base_exp = 70
	custom.village = _village
	custom.threat_level = "C"
	custom.bingo_entry = template.bingo_entry
	custom.palette = template.palette.duplicate()
	reg.units["custom_shinobi"] = custom

	var unit := UnitInstance.create(reg, "custom_shinobi", 5)
	visible = false
	built.emit(unit)
