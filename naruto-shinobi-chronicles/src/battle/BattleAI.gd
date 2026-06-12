class_name BattleAI
extends RefCounted
## Enemy decision-making. Greedy one-ply scorer with CP awareness — tuned for
## "GBA boss" feel, not perfection. Deterministic through state.rng.


static func choose_action(state: BattleState) -> Dictionary:
	var unit: UnitInstance = state.active("enemy")
	if not unit.charging.is_empty():
		return {"type": "jutsu", "jutsu": unit.charging["jutsu"]}  # locked in

	var target: UnitInstance = state.active("player")
	var best_score := -INF
	var best_action := {"type": "taijutsu"}

	for jid in unit.equipped_jutsu:
		var j: JutsuData = state.registry.jutsu(jid)
		if j == null or state.enemy_cp < j.cp_cost:
			continue
		var score := _score_jutsu(state, unit, target, j)
		score += state.rng.randf_range(0.0, 8.0)  # slight unpredictability
		if score > best_score:
			best_score = score
			best_action = {"type": "jutsu", "jutsu": jid}

	# Taijutsu fallback always scores something so the AI never passes.
	var tai_score := 30.0 + state.rng.randf_range(0.0, 8.0)
	if tai_score > best_score:
		best_action = {"type": "taijutsu"}
	return best_action


static func _score_jutsu(state: BattleState, unit: UnitInstance, target: UnitInstance, j: JutsuData) -> float:
	var score := 0.0
	if j.is_damaging():
		var mult: float = state.registry.type_chart.multiplier(j.nature, target.data().affinities)
		score = float(j.power) * mult
		# Prefer finishing blows; discount slow charge-ups when target is healthy.
		var atk := unit.effective_stat("str" if j.category == "physical" else "nin")
		var def := target.effective_stat("def" if j.category == "physical" else "res")
		var est := float(int(int((2.0 * unit.level / 5.0 + 2.0) * j.power * atk / maxf(1.0, float(def))) / 50.0) + 2) * mult
		if est >= target.current_hp:
			score += 60.0
		score -= float(j.hsc) * 25.0
		score -= float(j.cp_cost) * 0.5
	else:
		# Status moves: valuable early, useless on already-statused targets.
		for eff in j.effects:
			match eff.get("kind", ""):
				"status":
					score += 45.0 if target.status == "" else -50.0
				"heal", "heal_flat":
					var missing := 1.0 - float(unit.current_hp) / float(unit.max_hp())
					score += 90.0 * missing - 20.0
				"stat_stage":
					score += 25.0 if state.turn_count <= 2 else 8.0
				"field":
					score += 20.0 if state.field.is_empty() else 0.0
		score -= float(j.cp_cost) * 0.5
	return score
