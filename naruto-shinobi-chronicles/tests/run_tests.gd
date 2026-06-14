extends SceneTree
## Headless test suite for the pure battle engine + data integrity.
## Run from the project directory:
##   godot --headless -s tests/run_tests.gd
## Exits 0 on success, 1 on any failure.

var passed := 0
var failed := 0
var registry


func _initialize() -> void:
	registry = load("res://src/autoloads/DataRegistry.gd").new()
	var ok: bool = registry.load_all("res://data")

	test_data_integrity(ok)
	test_type_chart()
	test_stat_calculation()
	test_progression()
	test_promotion()
	test_cp_and_jutsu()
	test_hsc_charging()
	test_status_effects()
	test_status_immunity()
	test_priority_order()
	test_hardened_body_no_crit()
	test_catching()
	test_serialization_roundtrip()
	test_full_battle_terminates()
	test_combo_rules()
	test_story_triggers()
	test_cutscene_data()
	test_commander_skills()
	test_cursed_seal()
	test_starter_scroll()
	test_act_one()
	test_act_two()
	test_act_three()
	test_act_four()

	print("\n========================================")
	print("  %d passed, %d failed" % [passed, failed])
	print("========================================")
	quit(0 if failed == 0 else 1)


func check(cond: bool, name: String) -> void:
	if cond:
		passed += 1
		print("  PASS  " + name)
	else:
		failed += 1
		printerr("  FAIL  " + name)


func _mk(id: String, level: int) -> UnitInstance:
	return UnitInstance.create(registry, id, level)


func _state(player: Array, enemy: Array, seed_val: int = 1234) -> BattleState:
	return BattleState.create(registry, player, enemy, 100, seed_val)


# --- Tests -------------------------------------------------------------------

func test_data_integrity(load_ok: bool) -> void:
	print("\n[data integrity]")
	for err in registry.validation_errors:
		printerr("    " + str(err))
	check(load_ok, "all data files load with zero validation errors")
	check(registry.units.size() >= 30, "30+ units loaded (%d)" % registry.units.size())
	check(registry.jutsu_db.size() >= 55, "55+ jutsu loaded (%d)" % registry.jutsu_db.size())
	check(registry.combos.size() == 8, "8 combination jutsu loaded")
	check(registry.status_defs.size() >= 11, "11+ status conditions defined (with cursed_seal)")
	check(registry.maps.size() >= 8, "8+ maps loaded (story + visual maps)")


func test_type_chart() -> void:
	print("\n[type chart]")
	var c: TypeChart = registry.type_chart
	check(c.multiplier("water", ["fire"]) == 2.0, "water beats fire (2.0x)")
	check(c.multiplier("fire", ["water"]) == 0.5, "fire resisted by water (0.5x)")
	check(c.multiplier("water", ["fire", "earth"]) == 4.0, "dual weakness multiplies (4.0x)")
	check(c.multiplier("yin", ["yang"]) == 2.0, "genjutsu beats taijutsu")
	check(c.multiplier("yang", ["yin"]) == 2.0, "taijutsu beats genjutsu")
	check(c.multiplier("none", ["fire"]) == 1.0, "neutral is always 1.0x")
	check(c.multiplier("wind", ["lightning"]) == 2.0, "wind beats lightning")
	check(c.multiplier("lightning", ["earth"]) == 2.0, "lightning beats earth")
	check(c.multiplier("earth", ["wind"]) == 2.0, "earth beats wind (per locked chart)")


func test_stat_calculation() -> void:
	print("\n[stats]")
	var naruto := _mk("naruto", 10)
	# HP = floor(2*85*10/100) + 10 + 10 = 17 + 20 = 37
	check(naruto.max_hp() == 37, "HP formula exact at Lv10 (got %d)" % naruto.max_hp())
	# STR base 70: floor(2*70*10/100)+5 = 19, brave: up=str -> 19*1.1 = 20
	check(naruto.stat("str") == 20, "nature-boosted STR exact (got %d)" % naruto.stat("str"))
	# RES base 50: floor(2*50*10/100)+5 = 15, brave: down=res -> 13
	check(naruto.stat("res") == 13, "nature-cut RES exact (got %d)" % naruto.stat("res"))
	check(UnitInstance.stage_multiplier(0) == 1.0, "stage 0 = 1.0x")
	check(UnitInstance.stage_multiplier(2) == 2.0, "stage +2 = 2.0x")
	check(UnitInstance.stage_multiplier(-2) == 0.5, "stage -2 = 0.5x")


func test_progression() -> void:
	print("\n[progression]")
	var u := _mk("leaf_genin", 3)
	var target_exp: int = registry.exp_for_level("medium", 4)
	var learned: Array = u.gain_exp(target_exp - u.exp)
	check(u.level == 4, "exp gain levels up (Lv%d)" % u.level)
	check(learned.has("substitution"), "learnset unlocks on level-up")
	check(u.jutsu_slot_count() == 3, "3 jutsu slots at low level")
	var high := _mk("kakashi", 26)
	check(high.jutsu_slot_count() == 8, "8 slots at Lv26+")
	var capped := _mk("leaf_genin", 50)
	capped.gain_exp(999999)
	check(capped.level == 50, "level cap 50 enforced")


func test_promotion() -> void:
	print("\n[promotion]")
	var naruto := _mk("naruto", 20)
	check(not naruto.can_promote({}, {}), "promotion blocked without item")
	check(naruto.can_promote({"forbidden_scroll": 1}, {}), "promotion allowed with scroll at Lv20")
	naruto.promote()
	check(naruto.unit_id == "naruto_sage", "promotes to Sage Mode")
	check(naruto.level == 1, "promotion resets level to 1")
	check(naruto.max_hp() > 0 and naruto.current_hp == naruto.max_hp(), "promoted unit healthy")
	var gaara := _mk("gaara", 25)
	check(not gaara.can_promote({}, {}), "story-flag promotion blocked without flag")
	check(gaara.can_promote({}, {"konoha_crush_resolved": true}), "story-flag promotion works")


func test_cp_and_jutsu() -> void:
	print("\n[chakra pool]")
	var s := _state([_mk("sasuke", 15)], [_mk("forest_snake", 10)])
	var cp_before := s.player_cp
	BattleEngine.run_round(s, {"type": "jutsu", "jutsu": "kunai_throw"}, {"type": "taijutsu"})
	# kunai costs 5, end-of-turn regen +5: net 0 (unless battle ended early)
	check(s.player_cp == cp_before, "CP spend + regen nets to expected value")
	s.player_cp = 2
	var log_len := s.log.size()
	BattleEngine.run_round(s, {"type": "jutsu", "jutsu": "fire_fireball"}, {"type": "taijutsu"})
	var blocked := false
	for i in range(log_len, s.log.size()):
		if "enough chakra" in s.log[i]:
			blocked = true
	check(blocked, "insufficient CP blocks the jutsu")


func test_hsc_charging() -> void:
	print("\n[hand seal charging]")
	var sasuke := _mk("sasuke", 20)
	sasuke.equipped_jutsu = ["lightning_chidori"]
	var snake := _mk("forest_snake", 8)
	var s := _state([sasuke], [snake], 77)
	var hp_before := snake.current_hp
	BattleEngine.run_round(s, {"type": "jutsu", "jutsu": "lightning_chidori"}, {"type": "none"})
	check(not sasuke.charging.is_empty(), "HSC 1 jutsu enters charging state")
	check(snake.current_hp == hp_before, "no damage on the charge turn")
	BattleEngine.run_round(s, {"type": "jutsu", "jutsu": "lightning_chidori"}, {"type": "none"})
	check(sasuke.charging.is_empty(), "charge releases on the NEXT turn (QA rule)")
	check(snake.current_hp < hp_before, "damage lands after charge")


func test_status_effects() -> void:
	print("\n[status effects]")
	var s := _state([_mk("naruto", 15)], [_mk("forest_snake", 10)], 42)
	var snake: UnitInstance = s.active("enemy")
	var ok := BattleEngine.try_inflict_status(s, snake, "burn")
	check(ok, "burn lands on a clean target")
	check(snake.status == "burn", "status recorded")
	var str_burned := snake.effective_stat("str")
	snake.status = ""
	var str_clean := snake.effective_stat("str")
	check(str_burned < str_clean, "burn cuts STR (x0.7)")
	snake.status = "paralysis"
	check(snake.effective_stat("spd") == maxi(1, int(snake.stat("spd") * 0.5)), "paralysis halves SPD")
	snake.status = "burn"
	check(not BattleEngine.try_inflict_status(s, snake, "poison"), "cannot stack a second major status")


func test_status_immunity() -> void:
	print("\n[status immunity — QA checklist]")
	var s := _state([_mk("naruto", 15)], [_mk("sasuke_cm2", 15)], 42)
	var sasuke: UnitInstance = s.active("enemy")  # fire/lightning affinities
	check(not BattleEngine.try_inflict_status(s, sasuke, "burn"), "fire affinity cannot be burned")
	check(not BattleEngine.try_inflict_status(s, sasuke, "paralysis"), "lightning affinity cannot be paralyzed")
	var shika := _mk("shikamaru", 15)
	check(not BattleEngine.try_inflict_status(s, shika, "seal"), "yin affinity cannot be sealed")
	check(BattleEngine.try_inflict_status(s, sasuke, "poison"), "non-immune status still lands")


func test_priority_order() -> void:
	print("\n[priority & speed order]")
	var slow := _mk("choji", 10)       # SPD base 30
	slow.equipped_jutsu = ["substitution"]
	var fast := _mk("rock_lee", 10)    # SPD base 90
	var s := _state([slow], [fast], 9)
	BattleEngine.run_round(s, {"type": "jutsu", "jutsu": "substitution"}, {"type": "taijutsu"})
	var sub_line := -1
	var tai_line := -1
	for i in s.log.size():
		if "Substitution" in s.log[i] and sub_line < 0:
			sub_line = i
		if "taijutsu" in s.log[i] and tai_line < 0:
			tai_line = i
	check(sub_line >= 0 and tai_line >= 0 and sub_line < tai_line, "+3 priority substitution acts before a faster foe")


func test_hardened_body_no_crit() -> void:
	print("\n[hardened body trait]")
	var lee := _mk("rock_lee", 20)  # hardened_body
	var crits := 0
	for trial in 80:
		var s := _state([_mk("sasuke", 20)], [lee], 1000 + trial)
		BattleEngine.run_round(s, {"type": "jutsu", "jutsu": "kunai_throw"}, {"type": "none"})
		for line in s.log:
			if "critical" in line:
				crits += 1
		lee.current_hp = lee.max_hp()
	check(crits == 0, "high-crit kunai never crits a Hardened Body target (80 trials)")


func test_catching() -> void:
	print("\n[sealing / catching]")
	var snake := _mk("forest_snake", 5)  # catch_rate 200
	snake.current_hp = 1
	var s := _state([_mk("naruto", 10)], [snake], 5)
	s.is_wild = true
	BattleEngine.run_round(s, {"type": "catch", "tag": "sealing_tag"}, {"type": "taijutsu"})
	check(s.caught_unit == snake, "weakened common unit is caught (rate math > 255)")
	var naruto_enemy := _mk("naruto", 10)  # catch_rate 0 (story-only)
	var s2 := _state([_mk("sasuke", 10)], [naruto_enemy], 5)
	s2.is_wild = true
	BattleEngine.run_round(s2, {"type": "catch", "tag": "sealing_tag"}, {"type": "none"})
	check(s2.caught_unit == null, "catch_rate 0 units can never be sealed")
	var s3 := _state([_mk("sasuke", 10)], [_mk("forest_snake", 5)], 5)
	s3.is_wild = false
	BattleEngine.run_round(s3, {"type": "catch", "tag": "sealing_tag"}, {"type": "none"})
	check(s3.caught_unit == null, "cannot seal in trainer battles")


func test_serialization_roundtrip() -> void:
	print("\n[serialization]")
	var u := _mk("kakashi", 23)
	u.nickname = "Sensei"
	u.current_hp = 17
	u.status = "poison"
	u.status_turns = 3
	var restored := UnitInstance.from_dict(registry, u.to_dict())
	check(restored.unit_id == "kakashi" and restored.level == 23 and restored.nickname == "Sensei"
		and restored.current_hp == 17 and restored.status == "poison"
		and restored.equipped_jutsu == u.equipped_jutsu, "UnitInstance survives to_dict/from_dict")
	var blob: PackedByteArray = var_to_bytes(u.to_dict())
	check(blob.size() < 1024, "one unit serializes well under 1KB (32KB budget holds)")
	var back = bytes_to_var(blob)
	check(back is Dictionary and back.get("unit_id") == "kakashi", "binary blob roundtrip intact")


func test_full_battle_terminates() -> void:
	print("\n[full battle simulation]")
	var s := _state([_mk("naruto", 12), _mk("sakura", 11)], [_mk("sound_genin", 9), _mk("mist_swordsman", 10)], 31337)
	var rounds := 0
	var battle_on := true
	while battle_on and rounds < 200:
		rounds += 1
		battle_on = BattleEngine.run_round(s, _greedy_player(s), BattleAI.choose_action(s))
	check(rounds < 200, "seeded AI-vs-AI battle terminates (%d rounds)" % rounds)
	check(s.side_defeated("player") or s.side_defeated("enemy"), "one side is actually defeated")
	var reward := BattleEngine.exp_reward(_mk("sound_genin", 9))
	check(reward == int(50 * 9 / 5.0), "exp reward formula exact (got %d)" % reward)


func _greedy_player(s: BattleState) -> Dictionary:
	# Reuse the enemy AI brain for the player side by flipping perspectives is
	# overkill here; just throw kunai or taijutsu.
	var u: UnitInstance = s.active("player")
	if not u.charging.is_empty():
		return {"type": "jutsu", "jutsu": u.charging["jutsu"]}
	if u.equipped_jutsu.has("kunai_throw") and s.player_cp >= 5:
		return {"type": "jutsu", "jutsu": "kunai_throw"}
	return {"type": "taijutsu"}


func test_combo_rules() -> void:
	print("\n[combination jutsu — QA checklist]")
	var naruto := _mk("naruto", 32)   # learns wind_rasenshuriken at 32
	var sasuke := _mk("sasuke", 20)
	sasuke.equipped_jutsu = ["fire_dragon_flame"]
	var s := _state([naruto, sasuke], [_mk("orochimaru", 20)], 7)
	var combos := ComboSystem.available_combos(s)
	var found := false
	for entry in combos:
		if entry["combo"]["id"] == "combo_incinerating_flare":
			found = true
	check(found, "combo offered when both units alive with both component jutsu")
	if found:
		var hp_before: int = s.active("enemy").current_hp
		for entry in combos:
			if entry["combo"]["id"] == "combo_incinerating_flare":
				ComboSystem.execute(s, entry["combo"])
		check(s.active("enemy").current_hp < hp_before, "combo deals damage")
		check(ComboSystem.available_combos(s).filter(func(e): return e["combo"]["id"] == "combo_incinerating_flare").is_empty(),
			"one combo per pair per battle enforced")
	sasuke.current_hp = 0
	check(ComboSystem.available_combos(s).filter(func(e): return e["combo"]["id"] == "combo_incinerating_flare").is_empty(),
		"combo unavailable when a participant is down")


func test_story_triggers() -> void:
	print("\n[story triggers — pure resolvers]")
	var flags := {"a": true}
	check(StoryTriggers.flags_ok({"require_flags": ["a"]}, flags), "require_flags met")
	check(not StoryTriggers.flags_ok({"require_flags": ["b"]}, flags), "require_flags unmet blocks")
	check(not StoryTriggers.flags_ok({"unless_flags": ["a"]}, flags), "unless_flags set blocks")
	var map := {"on_enter": [{"cutscene": "intro", "unless_flags": ["seen_it"]}]}
	check(StoryTriggers.on_enter_cutscene(map, {}, {}) == "intro", "on_enter fires when eligible")
	check(StoryTriggers.on_enter_cutscene(map, {"seen_it": true}, {}) == "", "on_enter gated by flag")
	check(StoryTriggers.on_enter_cutscene(map, {}, {"intro": true}) == "", "seen one-shot does not replay")
	var bnpc := {"boss": {"flag": "boss_done"}}
	check(StoryTriggers.npc_visible(bnpc, {}), "boss visible before defeat")
	check(not StoryTriggers.npc_visible(bnpc, {"boss_done": true}), "boss hidden after its flag set")
	var snpc := {"dialogue": ["base"], "states": [{"require_flags": ["x"], "dialogue": ["after"]}]}
	check(StoryTriggers.resolve_npc(snpc, {}).get("dialogue")[0] == "base", "base NPC dialogue by default")
	check(StoryTriggers.resolve_npc(snpc, {"x": true}).get("dialogue")[0] == "after", "state dialogue when flag set")
	check(StoryTriggers.warp_locked({"require_flags": ["key"]}, {}), "warp locked without flag")
	check(not StoryTriggers.warp_locked({"require_flags": ["key"]}, {"key": true}), "warp opens with flag")
	var emap := {"events": [{"cell": [3, 4], "cutscene": "e1"}]}
	check(StoryTriggers.tile_event(emap, Vector2i(3, 4), {}, {}).get("cutscene", "") == "e1", "tile event matches its cell")
	check(StoryTriggers.tile_event(emap, Vector2i(0, 0), {}, {}).is_empty(), "no tile event off-cell")


func test_cutscene_data() -> void:
	print("\n[cutscene + quest data]")
	check(registry.cutscenes.has("graduation"), "graduation cutscene loads")
	var cs: Dictionary = registry.cutscene("graduation")
	check(cs.get("steps", []).size() > 0, "graduation has scripted steps")
	var fin: Dictionary = cs.get("on_finish", {})
	check(fin.get("set_flags", []).has("seen_graduation"), "graduation sets seen_graduation")
	for r in fin.get("recruit", []):
		check(registry.units.has(r.get("unit", "")), "graduation recruit '%s' exists" % r.get("unit", ""))
	check(registry.quests.size() >= 5, "quest log loaded (%d objectives)" % registry.quests.size())
	for q in registry.quests:
		check(q.get("flag", "") != "", "quest '%s' has a completion flag" % q.get("id", "?"))


func test_commander_skills() -> void:
	print("\n[commander skills]")
	var s := _state([_mk("naruto", 20)], [_mk("forest_snake", 10)], 51)
	s.player_cp = 10
	BattleEngine.run_round(s, {"type": "commander", "skill": "chakra_infusion"}, {"type": "none"})
	check(s.commander_used.get("chakra_infusion", false), "chakra_infusion marked used")
	check(s.player_cp > 10, "chakra_infusion restored team CP")
	var s2 := _state([_mk("naruto", 20)], [_mk("forest_snake", 10)], 52)
	var before := int(s2.active("player").stat_stages.get("str", 0))
	BattleEngine.run_round(s2, {"type": "commander", "skill": "tactical_order"}, {"type": "none"})
	var after := int(s2.active("player").stat_stages.get("str", 0))
	check(after > before, "tactical_order raised STR stage")
	check(s2.commander_used.get("tactical_order", false), "tactical_order marked used")
	BattleEngine.run_round(s2, {"type": "commander", "skill": "tactical_order"}, {"type": "none"})
	check(int(s2.active("player").stat_stages.get("str", 0)) == after, "tactical_order is once per battle")


func test_cursed_seal() -> void:
	print("\n[cursed seal]")
	check(registry.status_defs.has("cursed_seal"), "cursed_seal status defined")
	check(registry.jutsu_db.has("cursed_seal_form"), "cursed_seal_form jutsu defined")
	var u := _mk("sasuke", 20)
	var clean := _mk("sasuke", 20)
	u.status = "cursed_seal"
	check(u.effective_stat("str") > clean.effective_stat("str"), "cursed seal boosts STR")
	check(u.effective_stat("nin") > clean.effective_stat("nin"), "cursed seal boosts NIN")
	var s := _state([u], [_mk("forest_snake", 5)], 99)
	u.current_hp = u.max_hp()
	u.status = "cursed_seal"
	u.status_turns = 3
	var hp_before := u.current_hp
	BattleEngine._status_tick(s, "player")
	check(u.current_hp < hp_before, "cursed seal drains HP each turn")


func test_starter_scroll() -> void:
	print("\n[starter scroll]")
	var gs = load("res://src/autoloads/GameState.gd").new()
	gs.story_flags = {"chose_taijutsu": true}
	check(gs.scroll_starter_unit() == "rock_lee", "taijutsu scroll -> rock_lee")
	gs.story_flags = {"chose_ninjutsu": true}
	check(gs.scroll_starter_unit() == "tenten", "ninjutsu scroll -> tenten")
	gs.story_flags = {"chose_genjutsu": true}
	check(gs.scroll_starter_unit() == "shino", "genjutsu scroll -> shino")
	gs.story_flags = {}
	check(gs.scroll_starter_unit() == "", "no scroll chosen -> none")
	for uid in ["rock_lee", "tenten", "shino"]:
		check(registry.units.has(uid), "scroll unit '%s' exists in data" % uid)
	gs.seen_cutscenes = {"graduation": true}
	check(gs.to_dict().get("seen_cutscenes", {}).has("graduation"), "seen_cutscenes serializes")
	gs.free()


func test_act_one() -> void:
	print("\n[act I — land of waves]")
	check(registry.maps.has("wave_bridge"), "wave_bridge map loads")
	check(registry.cutscenes.has("bell_test"), "bell_test cutscene loads")
	check(registry.cutscenes.has("wave_zabuza"), "wave_zabuza cutscene loads")
	check(registry.cutscenes.has("wave_aftermath"), "wave_aftermath cutscene loads")
	var sb: Dictionary = registry.cutscene("wave_zabuza").get("on_finish", {}).get("start_battle", {})
	check(sb.get("boss", {}).get("flag", "") == "land_of_waves_cleared", "wave boss sets land_of_waves_cleared")
	for entry in sb.get("party", []):
		check(registry.units.has(entry[0]), "wave boss unit '%s' exists" % entry[0])
	check(registry.cutscene("wave_aftermath").get("on_finish", {}).get("recruit", []).size() > 0, "aftermath recruits an ally")
	var konoha: Dictionary = registry.map_def("konoha")
	var gated := 0
	for w in konoha.get("warps", []):
		if not w.get("require_flags", []).is_empty():
			gated += 1
	check(gated >= 2, "konoha mission warps are flag-gated (%d)" % gated)
	check(registry.items.has("soothing_balm"), "paralysis cure item exists")


func test_act_two() -> void:
	print("\n[act II — chunin exams]")
	check(registry.maps.has("chunin_stadium"), "chunin_stadium map loads")
	check(registry.cutscenes.has("forest_shadow"), "forest_shadow cutscene loads")
	check(registry.cutscenes.has("forest_curse"), "forest_curse cutscene loads")
	check(registry.cutscene("forest_curse").get("on_finish", {}).get("set_flags", []).has("sasuke_cursed"), "forest_curse marks Sasuke")
	var proctor: Dictionary = {}
	for npc in registry.map_def("chunin_stadium").get("npcs", []):
		if npc.get("id", "") == "proctor":
			proctor = npc
	check(not proctor.is_empty(), "stadium has a proctor")
	var bracket: Array = proctor.get("states", [])
	check(bracket.size() == 4, "bracket has 4 matches (%d)" % bracket.size())
	var final_flag := ""
	for st in bracket:
		for entry in st.get("boss", {}).get("party", []):
			check(registry.units.has(entry[0]), "bracket foe '%s' exists" % entry[0])
		if st.get("boss", {}).get("flag", "") == "chunin_exam_cleared":
			final_flag = "chunin_exam_cleared"
			check(st.get("boss", {}).get("reward_items", {}).has("chunin_vest"), "final match rewards the Chunin Vest")
	check(final_flag == "chunin_exam_cleared", "bracket final sets chunin_exam_cleared")
	check(registry.items.has("chunin_vest"), "chunin_vest item exists")


func test_act_three() -> void:
	print("\n[act III — breaking of bonds]")
	check(registry.units.has("itachi"), "itachi unit loads")
	check(registry.units.has("kisame"), "kisame unit loads")
	check(registry.jutsu_db.has("tsukuyomi"), "tsukuyomi jutsu defined")
	check(registry.jutsu_db.has("water_dome"), "water_dome jutsu defined")
	var s := _state([_mk("kisame", 20)], [_mk("naruto", 20)], 7)
	s.field["water_dome"] = 3
	check(BattleEngine._field_multiplier(s, registry.jutsu("water_shark_bullet")) > 1.0, "water_dome boosts water jutsu")
	check(BattleEngine._field_multiplier(s, registry.jutsu("fire_fireball")) < 1.0, "water_dome suppresses fire jutsu")
	check(registry.cutscene("defection").get("on_finish", {}).get("release", []).has("sasuke"), "defection releases Sasuke")
	var msf: Dictionary = registry.cutscene("myoboku_sage").get("on_finish", {})
	check(msf.get("set_flags", []).has("sage_mode_unlocked"), "myoboku unlocks Sage Mode")
	check(msf.get("grant_items", {}).has("forbidden_scroll"), "myoboku grants the Forbidden Scroll")
	check(int(registry.item("forbidden_scroll").get("price", 0)) <= 0, "Forbidden Scroll is not purchasable (Sage Mode story-gated)")
	check(registry.maps.has("myoboku") and registry.maps.has("akatsuki_road"), "Act III maps load")


func test_act_four() -> void:
	print("\n[act IV — valley of the end]")
	check(registry.maps.has("valley_of_the_end"), "valley map loads")
	for cid in ["valley_finale", "valley_duel", "valley_ending"]:
		check(registry.cutscenes.has(cid), "%s cutscene loads" % cid)
	check(registry.cutscene("valley_finale").get("on_finish", {}).get("start_battle", {}).get("boss", {}).get("flag", "") == "valley_phase1_done", "phase 1 sets valley_phase1_done")
	check(registry.cutscene("valley_duel").get("on_finish", {}).get("start_battle", {}).get("boss", {}).get("flag", "") == "game_complete", "phase 2 sets game_complete (ending trigger)")
	var cm2: UnitData = registry.unit("sasuke_cm2")
	var has_curse := false
	for e in cm2.learnset:
		if e.get("jutsu", "") == "cursed_seal_form":
			has_curse = true
	check(has_curse, "final Sasuke knows cursed_seal_form")
	var oe: Array = registry.map_def("valley_of_the_end").get("on_enter", [])
	check(oe.size() == 3, "valley on_enter has the 3-phase chain (%d)" % oe.size())
	var has_valley_warp := false
	for w in registry.map_def("konoha").get("warps", []):
		if w.get("to_map", "") == "valley_of_the_end" and w.get("require_flags", []).has("akatsuki_repelled"):
			has_valley_warp = true
	check(has_valley_warp, "konoha Valley warp gated on akatsuki_repelled")
