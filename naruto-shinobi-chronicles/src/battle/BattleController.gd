extends Node2D
## BattleController — renders BattleState and feeds it player decisions.
## All rules live in BattleEngine; this script only draws and routes input.

const FONT_SIZE := 8

var state: BattleState
var boss: Dictionary = {}
var boss_npc_id: String = ""

var menu: ListMenu
var log_label: Label
var enemy_name: Label
var enemy_hp_bar: ColorRect
var player_name: Label
var player_hp_bar: ColorRect
var cp_label: Label
var enemy_sprite: ColorRect
var player_sprite: ColorRect

var _page := "root"
var _busy := false
var _log_cursor := 0


func _ready() -> void:
	var router := get_node("/root/SceneRouter")
	var gs := get_node("/root/GameState")
	var reg := get_node("/root/DataRegistry")
	var payload: Dictionary = router.payload
	router.payload = {}
	boss = payload.get("boss", {})
	boss_npc_id = payload.get("boss_npc_id", "")
	get_node("/root/AudioDirector").play_bgm(payload.get("music", "battle_wild"))

	var enemy_party: Array = payload.get("enemy_party", [])
	if enemy_party.is_empty():
		enemy_party = [UnitInstance.create(reg, "leaf_genin", 3)]
	for u in enemy_party:
		gs.mark_seen(u.unit_id)

	state = BattleState.create(reg, gs.party, enemy_party, gs.chakra_reserve)
	state.is_wild = payload.get("is_wild", false)
	var first := state.first_alive("player")
	state.active_player = maxi(0, first)

	_build_ui()
	state.emit("A %s appears!" % state.active("enemy").display_name() if state.is_wild else "Enemy shinobi attack!")
	await _flush_log()
	_show_root_menu()


# --- UI construction ---------------------------------------------------------

func _build_ui() -> void:
	var bg := ColorRect.new()
	bg.size = Vector2(240, 160)
	bg.color = Color("#283848")
	add_child(bg)

	enemy_sprite = _make_unit_sprite(state.active("enemy"), Vector2(170, 24))
	player_sprite = _make_unit_sprite(state.active("player"), Vector2(30, 64))

	enemy_name = _make_label(Vector2(8, 8))
	add_child(enemy_name)
	enemy_hp_bar = _make_bar(Vector2(8, 20), Color("#50c850"))
	player_name = _make_label(Vector2(130, 56))
	add_child(player_name)
	player_hp_bar = _make_bar(Vector2(130, 68), Color("#50c850"))
	cp_label = _make_label(Vector2(130, 76))
	add_child(cp_label)

	var log_panel := PanelContainer.new()
	log_panel.position = Vector2(4, 96)
	log_panel.custom_minimum_size = Vector2(148, 60)
	var style := StyleBoxFlat.new()
	style.bg_color = Color("#102040")
	style.border_color = Color("#e8e8e8")
	style.set_border_width_all(1)
	style.set_content_margin_all(3)
	log_panel.add_theme_stylebox_override("panel", style)
	log_label = Label.new()
	log_label.add_theme_font_size_override("font_size", FONT_SIZE)
	log_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	log_panel.add_child(log_label)
	add_child(log_panel)

	menu = ListMenu.new()
	menu.position = Vector2(156, 96)
	menu.item_selected.connect(_on_menu_select)
	menu.cancelled.connect(_on_menu_cancel)
	add_child(menu)
	_refresh_panels()


func _make_label(pos: Vector2) -> Label:
	var l := Label.new()
	l.position = pos
	l.add_theme_font_size_override("font_size", FONT_SIZE)
	l.add_theme_color_override("font_color", Color("#ffffff"))
	return l


func _make_bar(pos: Vector2, color: Color) -> ColorRect:
	var back := ColorRect.new()
	back.position = pos
	back.size = Vector2(80, 5)
	back.color = Color("#101820")
	add_child(back)
	var bar := ColorRect.new()
	bar.position = pos
	bar.size = Vector2(80, 5)
	bar.color = color
	add_child(bar)
	return bar


func _make_unit_sprite(unit: UnitInstance, pos: Vector2) -> ColorRect:
	# Placeholder pixel "sprite": palette block from unit data, art lands later.
	var pal: Dictionary = unit.data().palette
	var body := ColorRect.new()
	body.position = pos
	body.size = Vector2(32, 32)
	body.color = Color(pal.get("primary", "#888888"))
	add_child(body)
	var trim := ColorRect.new()
	trim.position = pos + Vector2(4, 20)
	trim.size = Vector2(24, 8)
	trim.color = Color(pal.get("secondary", "#444444"))
	add_child(trim)
	return body


func _refresh_panels() -> void:
	var e := state.active("enemy")
	var p := state.active("player")
	enemy_name.text = "%s Lv%d %s" % [e.display_name(), e.level, ("[%s]" % e.status) if e.status != "" else ""]
	enemy_hp_bar.size.x = 80.0 * e.current_hp / maxi(1, e.max_hp())
	enemy_hp_bar.color = Color("#50c850") if e.current_hp * 2 > e.max_hp() else Color("#e8b020")
	player_name.text = "%s Lv%d %s" % [p.display_name(), p.level, ("[%s]" % p.status) if p.status != "" else ""]
	player_hp_bar.size.x = 80.0 * p.current_hp / maxi(1, p.max_hp())
	player_hp_bar.color = Color("#50c850") if p.current_hp * 2 > p.max_hp() else Color("#e8b020")
	cp_label.text = "HP %d/%d  CP %d/%d" % [p.current_hp, p.max_hp(), state.player_cp, state.player_max_cp]
	enemy_sprite.color = Color(e.data().palette.get("primary", "#888888"))
	player_sprite.color = Color(p.data().palette.get("primary", "#888888"))


# --- Menus ---------------------------------------------------------------

func _show_root_menu() -> void:
	_page = "root"
	var unit := state.active("player")
	var items: Array = [
		{"label": "Jutsu", "meta": "jutsu", "disabled": unit.status == "seal"},
		{"label": "Taijutsu", "meta": "taijutsu"},
	]
	if not ComboSystem.available_combos(state).is_empty():
		items.append({"label": "COMBO!", "meta": "combo"})
	items.append({"label": "Item", "meta": "item"})
	items.append({"label": "Switch", "meta": "switch"})
	if state.is_wild:
		items.append({"label": "Seal", "meta": "seal", "disabled": not _has_any_tag()})
		items.append({"label": "Flee", "meta": "flee"})
	menu.set_items(items)
	menu.visible = true


func _show_jutsu_menu() -> void:
	_page = "jutsu"
	var unit := state.active("player")
	var reg := get_node("/root/DataRegistry")
	var items: Array = []
	if not unit.charging.is_empty():
		var j: JutsuData = reg.jutsu(unit.charging["jutsu"])
		items.append({"label": "%s (charging)" % j.display_name, "meta": j.id})
	else:
		for jid in unit.equipped_jutsu:
			var j: JutsuData = reg.jutsu(jid)
			if j == null:
				continue
			items.append({"label": "%s %dCP" % [j.display_name, j.cp_cost], "meta": jid,
				"disabled": state.player_cp < j.cp_cost})
	items.append({"label": "Back", "meta": null})
	menu.set_items(items)


func _show_item_menu() -> void:
	_page = "item"
	var gs := get_node("/root/GameState")
	var reg := get_node("/root/DataRegistry")
	var items: Array = []
	for id in gs.inventory:
		var item: Dictionary = reg.item(id)
		if item.get("kind", "") in ["heal_hp", "restore_cp", "cure_status"]:
			items.append({"label": "%s x%d" % [item.get("name", id), int(gs.inventory[id])], "meta": id})
	items.append({"label": "Back", "meta": null})
	menu.set_items(items)


func _show_switch_menu() -> void:
	_page = "switch"
	var items: Array = []
	for i in state.player_party.size():
		var u: UnitInstance = state.player_party[i]
		items.append({"label": "%s Lv%d %d/%d" % [u.display_name(), u.level, u.current_hp, u.max_hp()],
			"meta": i, "disabled": u.is_fainted() or i == state.active_player})
	items.append({"label": "Back", "meta": null})
	menu.set_items(items)


func _show_seal_menu() -> void:
	_page = "seal"
	var gs := get_node("/root/GameState")
	var items: Array = []
	for tag in ["sealing_tag", "cursed_seal_tag"]:
		if gs.has_item(tag):
			items.append({"label": "%s x%d" % [tag.capitalize().replace("_", " "), int(gs.inventory[tag])], "meta": tag})
	items.append({"label": "Back", "meta": null})
	menu.set_items(items)


func _show_combo_menu() -> void:
	_page = "combo"
	var items: Array = []
	for entry in ComboSystem.available_combos(state):
		items.append({"label": "%s %dCP" % [entry["combo"]["name"], entry["cp"]], "meta": entry["combo"]})
	items.append({"label": "Back", "meta": null})
	menu.set_items(items)


func _on_menu_select(meta) -> void:
	if _busy:
		return
	match _page:
		"root":
			match meta:
				"jutsu": _show_jutsu_menu()
				"taijutsu": _commit_action({"type": "taijutsu"})
				"item": _show_item_menu()
				"switch": _show_switch_menu()
				"seal": _show_seal_menu()
				"combo": _show_combo_menu()
				"flee": _commit_action({"type": "flee"})
		"jutsu":
			if meta == null: _show_root_menu()
			else: _commit_action({"type": "jutsu", "jutsu": meta})
		"item":
			if meta == null: _show_root_menu()
			else:
				get_node("/root/GameState").consume_item(meta)
				_commit_action({"type": "item", "item": meta})
		"switch":
			if meta == null: _show_root_menu()
			else: _commit_action({"type": "switch", "switch_to": meta})
		"seal":
			if meta == null: _show_root_menu()
			else:
				get_node("/root/GameState").consume_item(meta)
				_commit_action({"type": "catch", "tag": meta})
		"combo":
			if meta == null: _show_root_menu()
			else: _commit_combo(meta)


func _on_menu_cancel() -> void:
	if _page != "root" and not _busy:
		_show_root_menu()


func _has_any_tag() -> bool:
	var gs := get_node("/root/GameState")
	return gs.has_item("sealing_tag") or gs.has_item("cursed_seal_tag")


# --- Round resolution -------------------------------------------------------

func _commit_action(action: Dictionary) -> void:
	_busy = true
	menu.visible = false
	var enemy_action := BattleAI.choose_action(state)
	var continues := BattleEngine.run_round(state, action, enemy_action)
	await _flush_log()
	_refresh_panels()
	if continues:
		_busy = false
		_show_root_menu()
	else:
		await _finish_battle()


func _commit_combo(combo: Dictionary) -> void:
	_busy = true
	menu.visible = false
	ComboSystem.execute(state, combo)
	await _flush_log()
	_refresh_panels()
	if state.side_defeated("enemy"):
		await _finish_battle()
		return
	# The combo consumed our side's round; the enemy still answers.
	var continues := BattleEngine.run_round(state, {"type": "none"}, BattleAI.choose_action(state))
	await _flush_log()
	_refresh_panels()
	if continues:
		_busy = false
		_show_root_menu()
	else:
		await _finish_battle()


func _flush_log() -> void:
	var audio := get_node("/root/AudioDirector")
	while _log_cursor < state.log.size():
		var window: Array = state.log.slice(maxi(0, _log_cursor - 4), _log_cursor + 1)
		log_label.text = "\n".join(window)
		_log_cursor += 1
		_refresh_panels()
		audio.sfx_hit()
		await get_tree().create_timer(0.25).timeout
	if state == null or state.log.is_empty():
		return


func _finish_battle() -> void:
	var gs := get_node("/root/GameState")
	var result: Dictionary = {}
	if state.caught_unit != null:
		var caught: UnitInstance = state.caught_unit
		caught.registry = get_node("/root/DataRegistry")
		caught.reset_battle_state()
		caught.current_hp = caught.max_hp()
		gs.add_unit(caught)
		result = {"outcome": "caught", "caught_name": caught.display_name()}
	elif state.side_defeated("player"):
		result = {"outcome": "defeat"}
	else:
		var total_exp := 0
		for e in state.enemy_party:
			total_exp += BattleEngine.exp_reward(e)
		state.emit("Victory! The squad earned %d EXP." % total_exp)
		for u in state.player_party:
			if u.is_fainted():
				continue
			var before: int = u.level
			var learned: Array = u.gain_exp(total_exp)
			if u.level > before:
				state.emit("%s grew to Lv%d!" % [u.display_name(), u.level])
			for jid in learned:
				var j = get_node("/root/DataRegistry").jutsu(jid)
				state.emit("%s learned %s!" % [u.display_name(), j.display_name if j else jid])
		gs.ryo += 25 * state.enemy_party[0].level
		await _flush_log()
		result = {"outcome": "victory", "boss": boss, "boss_npc_id": boss_npc_id}
	await get_tree().create_timer(0.6).timeout
	get_node("/root/SceneRouter").return_from_battle(result)


# --- Input handling ----------------------------------------------------------

func _unhandled_input(event: InputEvent) -> void:
	if _busy:
		return
	if menu.handle_input(event):
		get_viewport().set_input_as_handled()
