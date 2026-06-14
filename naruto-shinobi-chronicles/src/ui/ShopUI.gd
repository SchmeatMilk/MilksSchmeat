class_name ShopUI
extends Control
## Tool shop: buy-only list of purchasable items with live ryo readout.

const FONT_SIZE := 8

var _menu: ListMenu
var _ryo_label: Label


func _init() -> void:
	_menu = ListMenu.new()
	add_child(_menu)
	_menu.item_selected.connect(_on_buy)
	_menu.cancelled.connect(func(): visible = false)
	_ryo_label = Label.new()
	_ryo_label.position = Vector2(0, -10)
	_ryo_label.add_theme_font_size_override("font_size", FONT_SIZE)
	_ryo_label.add_theme_color_override("font_color", Color("#ffd060"))
	add_child(_ryo_label)


func open() -> void:
	visible = true
	_refresh()


func handle_input(event: InputEvent) -> void:
	_menu.handle_input(event)


func _refresh() -> void:
	var gs := get_node("/root/GameState")
	var reg := get_node("/root/DataRegistry")
	_ryo_label.text = "Ryo: %d" % gs.ryo
	var items: Array = []
	for id in reg.items:
		var item: Dictionary = reg.items[id]
		var price := int(item.get("price", 0))
		if price <= 0:
			continue  # key/story items not for sale
		items.append({"label": "%s — %d" % [item.get("name", id), price], "meta": id,
			"disabled": gs.ryo < price})
	items.append({"label": "Leave", "meta": null})
	_menu.set_items(items)


func _on_buy(meta) -> void:
	if meta == null:
		visible = false
		return
	var gs := get_node("/root/GameState")
	var price := int(get_node("/root/DataRegistry").item(meta).get("price", 0))
	if gs.ryo >= price:
		gs.ryo -= price
		gs.grant_item(meta)
		get_node("/root/AudioDirector").sfx_confirm()
	_refresh()
