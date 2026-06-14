class_name MenuSystem
extends Control
## Pause menu: Party (inspect/promote), Bag (use items), Bingo Book, Save, Close.
## A small page-stack state machine over two ListMenus and an info label.

const FONT_SIZE := 8

var _menu: ListMenu
var _info: Label
var _page: String = "root"
var _selected_unit: UnitInstance = null


func _init() -> void:
	_menu = ListMenu.new()
	add_child(_menu)
	_menu.item_selected.connect(_on_select)
	_menu.cancelled.connect(_on_cancel)
	var info_panel := PanelContainer.new()
	info_panel.position = Vector2(-126, 0)
	info_panel.custom_minimum_size = Vector2(120, 104)
	info_panel.add_theme_stylebox_override("panel", UiKit.panel())
	add_child(info_panel)
	_info = Label.new()
	_info.custom_minimum_size = Vector2(112, 96)
	_info.add_theme_font_size_override("font_size", FONT_SIZE)
	_info.add_theme_color_override("font_color", UiKit.INK)
	_info.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	info_panel.add_child(_info)


func open() -> void:
	visible = true
	_show_root()


func handle_input(event: InputEvent) -> void:
	_menu.handle_input(event)


func _gs() -> Node:
	return get_node("/root/GameState")


func _reg() -> Node:
	return get_node("/root/DataRegistry")


# --- Pages -----------------------------------------------------------------

func _show_root() -> void:
	_page = "root"
	_info.text = "Ryo: %d\nCommander Lv %d\nAuthority %d" % [_gs().ryo, _gs().commander_level, _gs().authority]
	_menu.set_items([
		{"label": "Party", "meta": "party"},
		{"label": "Missions", "meta": "missions"},
		{"label": "Bag", "meta": "bag"},
		{"label": "Bingo Book", "meta": "bingo"},
		{"label": "Save", "meta": "save"},
		{"label": "Close", "meta": "close"},
	])


func _show_missions() -> void:
	_page = "missions"
	var quests: Array = _reg().quests
	var flags: Dictionary = _gs().story_flags
	var lines: Array = ["MISSIONS"]
	var current_shown := false
	for q in quests:
		var done: bool = flags.get(q.get("flag", ""), false)
		var box := "[x]" if done else "[ ]"
		var marker := " "
		if not done and not current_shown:
			marker = ">"   # the current objective
			current_shown = true
		lines.append("%s%s %s" % [marker, box, q.get("name", "?")])
	if not current_shown:
		lines.append("All missions complete!")
	_info.text = "\n".join(lines)
	_menu.set_items([{"label": "Back", "meta": null}])


func _show_party() -> void:
	_page = "party"
	var items: Array = []
	for u in _gs().party:
		items.append({"label": "%s Lv%d %d/%d" % [u.display_name(), u.level, u.current_hp, u.max_hp()], "meta": u})
	items.append({"label": "Back", "meta": null})
	_menu.set_items(items)


func _show_unit(u: UnitInstance) -> void:
	_page = "unit"
	_selected_unit = u
	var d: UnitData = u.data()
	var jutsu_names: Array = []
	for jid in u.equipped_jutsu:
		var j = _reg().jutsu(jid)
		jutsu_names.append(j.display_name if j else jid)
	_info.text = "%s Lv%d\nHP %d/%d\nSTR %d NIN %d\nDEF %d RES %d SPD %d\nTrait: %s\n%s" % [
		u.display_name(), u.level, u.current_hp, u.max_hp(),
		u.stat("str"), u.stat("nin"), u.stat("def"), u.stat("res"), u.stat("spd"),
		d.trait_id, ", ".join(jutsu_names)]
	var items: Array = []
	if u.can_promote(_gs().inventory, _gs().story_flags):
		items.append({"label": "PROMOTE!", "meta": "promote"})
	elif not d.promotion.is_empty():
		items.append({"label": "Promote (Lv%d %s)" % [int(d.promotion.get("level", 0)), d.promotion.get("item", d.promotion.get("story_flag", ""))], "meta": null, "disabled": true})
	items.append({"label": "Back", "meta": "back"})
	_menu.set_items(items)


func _show_bag() -> void:
	_page = "bag"
	var items: Array = []
	for id in _gs().inventory:
		var item: Dictionary = _reg().item(id)
		items.append({"label": "%s x%d" % [item.get("name", id), int(_gs().inventory[id])], "meta": id,
			"disabled": not item.get("kind", "") in ["heal_hp", "cure_status", "revive"]})
	items.append({"label": "Back", "meta": null})
	_menu.set_items(items)


func _show_bag_target(item_id: String) -> void:
	_page = "bag_target"
	_selected_item = item_id
	var items: Array = []
	for u in _gs().party:
		items.append({"label": "%s %d/%d" % [u.display_name(), u.current_hp, u.max_hp()], "meta": u})
	items.append({"label": "Back", "meta": null})
	_menu.set_items(items)

var _selected_item: String = ""


func _show_bingo() -> void:
	_page = "bingo"
	var lines: Array = []
	for uid in _gs().bingo_book:
		var u: UnitData = _reg().unit(uid)
		if u == null:
			continue
		var tag: String = "[C]" if _gs().bingo_book[uid] == "contracted" else "[S]"
		lines.append("%s %s (%s-rank)" % [tag, u.display_name, u.threat_level])
	_info.text = "BINGO BOOK\n" + "\n".join(lines)
	_menu.set_items([{"label": "Back", "meta": null}])


func _show_save() -> void:
	_page = "save"
	var items: Array = []
	for slot in 3:
		var summary: Dictionary = get_node("/root/SaveManager").slot_summary(slot)
		var label := "Slot %d: empty" % (slot + 1)
		if not summary.is_empty():
			label = "Slot %d: %s (%d units)" % [slot + 1, summary.get("map", "?"), int(summary.get("party_size", 0))]
		items.append({"label": label, "meta": slot})
	items.append({"label": "Back", "meta": null})
	_menu.set_items(items)


# --- Selection routing -------------------------------------------------------

func _on_select(meta) -> void:
	match _page:
		"root":
			match meta:
				"party": _show_party()
				"missions": _show_missions()
				"bag": _show_bag()
				"bingo": _show_bingo()
				"save": _show_save()
				"close": visible = false
		"party":
			if meta == null:
				_show_root()
			else:
				_show_unit(meta)
		"unit":
			if meta == "promote":
				var item: String = _selected_unit.data().promotion.get("item", "")
				if item != "":
					_gs().consume_item(item)
				_selected_unit.promote()
				get_node("/root/AudioDirector").sfx_heal()
				_show_unit(_selected_unit)
			else:
				_show_party()
		"bag":
			if meta == null:
				_show_root()
			else:
				_show_bag_target(meta)
		"bag_target":
			if meta == null:
				_show_bag()
			else:
				_use_item_on(meta)
		"missions":
			_show_root()
		"bingo":
			_show_root()
		"save":
			if meta == null:
				_show_root()
			else:
				if get_node("/root/SaveManager").save_slot(int(meta)):
					_info.text = "Saved to slot %d." % (int(meta) + 1)
				_show_root()


func _use_item_on(u: UnitInstance) -> void:
	var item: Dictionary = _reg().item(_selected_item)
	match item.get("kind", ""):
		"heal_hp":
			if u.is_fainted():
				return
			u.heal(int(item.get("amount", 0)))
		"cure_status":
			var cures: Array = item.get("cures", [])
			if not (u.status in cures or cures.has("all")):
				return
			u.status = ""
			u.status_turns = 0
		"revive":
			if not u.is_fainted():
				return
			u.current_hp = int(u.max_hp() * float(item.get("fraction", 0.5)))
	_gs().consume_item(_selected_item)
	get_node("/root/AudioDirector").sfx_heal()
	_show_bag()


func _on_cancel() -> void:
	match _page:
		"root": visible = false
		"party", "missions", "bag", "bingo", "save": _show_root()
		"unit": _show_party()
		"bag_target": _show_bag()
