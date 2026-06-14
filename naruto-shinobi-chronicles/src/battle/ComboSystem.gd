class_name ComboSystem
extends RefCounted
## Combination Jutsu (spec section 8): two specific units, both alive, both
## component jutsu equipped, sum CP cost, one use per pair per battle.


## Returns available combos for the player's party in this battle.
static func available_combos(state: BattleState) -> Array:
	var out: Array = []
	for combo in state.registry.combos:
		var a_idx := _party_index_with(state, combo["unit_a"], combo["jutsu_a"])
		var b_idx := _party_index_with(state, combo["unit_b"], combo["jutsu_b"])
		if a_idx < 0 or b_idx < 0 or a_idx == b_idx:
			continue
		var pair_key: String = combo["unit_a"] + "|" + combo["unit_b"]
		if state.combo_used_pairs.has(pair_key):
			continue
		var ja: JutsuData = state.registry.jutsu(combo["jutsu_a"])
		var jb: JutsuData = state.registry.jutsu(combo["jutsu_b"])
		var total_cp: int = ja.cp_cost + jb.cp_cost
		if state.player_cp < total_cp:
			continue
		out.append({"combo": combo, "cp": total_cp})
	return out


static func _party_index_with(state: BattleState, unit_id: String, jutsu_id: String) -> int:
	for i in state.player_party.size():
		var u: UnitInstance = state.player_party[i]
		# Promoted forms still count for their base id (naruto_sage starts with naruto).
		if not u.is_fainted() and u.unit_id.begins_with(unit_id) and u.equipped_jutsu.has(jutsu_id):
			return i
	return -1


static func execute(state: BattleState, combo: Dictionary) -> void:
	var pair_key: String = combo["unit_a"] + "|" + combo["unit_b"]
	state.combo_used_pairs.append(pair_key)
	var ja: JutsuData = state.registry.jutsu(combo["jutsu_a"])
	var jb: JutsuData = state.registry.jutsu(combo["jutsu_b"])
	state.spend_cp("player", ja.cp_cost + jb.cp_cost)

	var fused := JutsuData.new()
	fused.id = combo["id"]
	fused.display_name = combo["name"]
	fused.nature = combo.get("nature", ja.nature)
	fused.category = "special"
	fused.power = int(combo.get("power", 180))
	fused.accuracy = int(combo.get("accuracy", 100))
	fused.effects = combo.get("effects", [])
	fused.flags = combo.get("flags", [])

	state.emit("COMBINATION JUTSU: %s!" % fused.display_name)
	var user: UnitInstance = state.active("player")
	var target: UnitInstance = state.active("enemy")
	BattleEngine._deal_damage(state, "player", user, target, fused)
	JutsuExecutor.apply_effects(state, "player", user, target, fused, 0)
	BattleEngine._handle_faints(state)
