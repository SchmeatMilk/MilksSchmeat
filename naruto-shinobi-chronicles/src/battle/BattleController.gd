extends Node2D
## BattleController — renders BattleState (real sprites, backdrop, DS-style HUD)
## and feeds it player decisions. All rules live in BattleEngine.

const FONT_SIZE := 8
const ENEMY_BAR := 96
const PLAYER_BAR := 84
const CP_BAR := 84

var state: BattleState
var boss: Dictionary = {}
var boss_npc_id: String = ""

var ui_layer: CanvasLayer
var menu: ListMenu
var log_label: Label
var enemy_name: Label
var enemy_hp_fill: ColorRect
var player_name: Label
var player_hp_fill: ColorRect
var cp_label: Label
var player_cp_fill: ColorRect
var enemy_sprite: Sprite2D
var player_sprite: Sprite2D
var enemy_center := Vector2(196, 58)
var player_center := Vector2(64, 134)

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


# --- Input routing (fixes the menu freeze) ----------------------------------

func _unhandled_input(event: InputEvent) -> void:
	if _busy:
		return
	if menu.visible:
		menu.handle_input(event)


# --- UI construction ---------------------------------------------------------

func _build_ui() -> void:
	var kind := "field"
	if not boss.is_empty():
		kind = "boss"
	elif state.is_wild:
		kind = "wild"
	# backdrop
	var bg := Sprite2D.new()
	bg.centered = false
	bg.texture = _load_or_null("res://assets/ui/battle_bg_%s.png" % kind)
	if bg.texture == null:
		var fb := ColorRect.new(); fb.size = Vector2(256, 192); fb.color = Color("#bfe2f4"); add_child(fb)
	else:
		bg.z_index = -20; add_child(bg)
	# platforms
	var plat_tex := _load_or_null("res://assets/ui/platform%s.png" % ("_boss" if kind == "boss" else ""))
	_add_platform(plat_tex, Vector2(enemy_center.x - 48, enemy_center.y - 6), -10)
	_add_platform(_load_or_null("res://assets/ui/platform.png"), Vector2(player_center.x - 48, player_center.y - 4), -10)
	# combatant sprites
	enemy_sprite = Sprite2D.new(); add_child(enemy_sprite); enemy_sprite.z_index = 2
	player_sprite = Sprite2D.new(); add_child(player_sprite); player_sprite.z_index = 3
	_apply_unit_sprite(enemy_sprite, state.active("enemy"), false, enemy_center)
	_apply_unit_sprite(player_sprite, state.active("player"), true, player_center)

	ui_layer = CanvasLayer.new(); add_child(ui_layer)
	# enemy HUD (top-left)
	var ep := _hud_panel(Vector2(8, 10), Vector2(124, 30))
	enemy_name = UiKit.label(""); enemy_name.position = Vector2(6, 3); ep.add_child(enemy_name)
	enemy_hp_fill = _bar(ep, Vector2(6, 17), ENEMY_BAR, UiKit.HP_GREEN)
	var ehl := UiKit.label("HP", UiKit.SUB); ehl.position = Vector2(104, 14); ep.add_child(ehl)
	# player HUD (mid-right)
	var pp := _hud_panel(Vector2(140, 92), Vector2(110, 44))
	player_name = UiKit.label(""); player_name.position = Vector2(6, 3); pp.add_child(player_name)
	player_hp_fill = _bar(pp, Vector2(6, 17), PLAYER_BAR, UiKit.HP_GREEN)
	cp_label = UiKit.label("", UiKit.SUB); cp_label.position = Vector2(6, 24); pp.add_child(cp_label)
	player_cp_fill = _bar(pp, Vector2(6, 35), CP_BAR, UiKit.CP_BLUE)
	# message/log box (bottom-left)
	var lp := _hud_panel(Vector2(6, 150), Vector2(154, 38))
	log_label = UiKit.label(""); log_label.position = Vector2(4, 2)
	log_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	log_label.custom_minimum_size = Vector2(146, 32)
	lp.add_child(log_label)
	# action menu (bottom-right)
	menu = ListMenu.new()
	menu.position = Vector2(168, 150)
	menu.item_selected.connect(_on_menu_select)
	menu.cancelled.connect(_on_menu_cancel)
	ui_layer.add_child(menu)
	_refresh_panels()


func _load_or_null(path: String) -> Texture2D:
	return load(path) if ResourceLoader.exists(path) else null


func _add_platform(tex: Texture2D, pos: Vector2, z: int) -> void:
	if tex == null:
		return
	var s := Sprite2D.new(); s.texture = tex; s.centered = false; s.position = pos; s.z_index = z
	add_child(s)


func _hud_panel(pos: Vector2, size: Vector2) -> Panel:
	var p := Panel.new()
	p.position = pos
	p.custom_minimum_size = size
	p.size = size
	p.add_theme_stylebox_override("panel", UiKit.panel())
	ui_layer.add_child(p)
	return p


func _bar(parent: Control, pos: Vector2, w: int, color: Color) -> ColorRect:
	var frame := ColorRect.new()
	frame.position = pos - Vector2(1, 1); frame.size = Vector2(w + 2, 7); frame.color = UiKit.BORDER_DK
	parent.add_child(frame)
	var back := ColorRect.new()
	back.position = pos; back.size = Vector2(w, 5); back.color = Color("#20283c")
	parent.add_child(back)
	var fill := ColorRect.new()
	fill.position = pos; fill.size = Vector2(w, 5); fill.color = color
	parent.add_child(fill)
	fill.set_meta("max_w", w)
	return fill


func _apply_unit_sprite(s: Sprite2D, unit: UnitInstance, is_player: bool, center: Vector2) -> void:
	var reg := get_node("/root/DataRegistry")
	var uv: Dictionary = reg.unit_visual(unit.unit_id)
	var battle_path: String = uv.get("battle", "")
	var ow_path: String = uv.get("overworld", "")
	s.region_enabled = false
	s.flip_h = false
	if battle_path != "" and ResourceLoader.exists(battle_path):
		s.texture = load(battle_path)
		var scl: float = 76.0 / maxf(16.0, s.texture.get_height())
		s.scale = Vector2(scl, scl)
		s.centered = true
		s.position = Vector2(center.x, center.y + 4 - s.texture.get_height() * scl / 2.0)
		s.flip_h = not is_player
	elif ow_path != "" and ResourceLoader.exists(ow_path):
		s.texture = load(ow_path)
		s.region_enabled = true
		s.region_rect = Rect2(24, 32 * (3 if is_player else 0), 24, 32)
		s.scale = Vector2(2.3, 2.3)
		s.centered = true
		s.position = Vector2(center.x, center.y + 4 - 32 * 2.3 / 2.0)
	else:
		# fallback block
		var img := Image.create(40, 52, false, Image.FORMAT_RGBA8)
		img.fill(Color(unit.data().palette.get("primary", "#888888")))
		s.texture = ImageTexture.create_from_image(img)
		s.centered = true
		s.position = center - Vector2(0, 20)


func _refresh_panels() -> void:
	var e := state.active("enemy")
	var p := state.active("player")
	enemy_name.text = "%s  Lv%d%s" % [e.display_name(), e.level, (" [%s]" % e.status) if e.status != "" else ""]
	_set_bar(enemy_hp_fill, e.current_hp, e.max_hp())
	player_name.text = "%s  Lv%d%s" % [p.display_name(), p.level, (" [%s]" % p.status) if p.status != "" else ""]
	_set_bar(player_hp_fill, p.current_hp, p.max_hp())
	cp_label.text = "HP %d/%d   CP %d/%d" % [p.current_hp, p.max_hp(), state.player_cp, state.player_max_cp]
	_set_bar(player_cp_fill, state.player_cp, state.player_max_cp)
	# keep active-unit sprites current (handles switches)
	if enemy_sprite:
		_apply_unit_sprite(enemy_sprite, e, false, enemy_center)
	if player_sprite:
		_apply_unit_sprite(player_sprite, p, true, player_center)


func _set_bar(fill: ColorRect, cur: int, mx: int) -> void:
	var w: int = int(fill.get_meta("max_w", 80))
	fill.size.x = maxf(0.0, w * float(cur) / maxi(1, mx))
	if fill == player_cp_fill:
		return
	fill.color = UiKit.hp_color(cur, mx)


# --- Menus (unchanged logic) ------------------------------------------------

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
