class_name StoryTriggers
extends RefCounted
## Pure, scene-free resolution of data-driven story gating: which cutscene fires on
## map entry, which tile event fires, which NPC dialogue/action variant applies given
## the current story flags, and whether a warp is locked. NO node/autoload access ->
## fully unit-testable headless (see tests/run_tests.gd::test_story_triggers).
##
## Flag conditions on any trigger dict:
##   "require_flags": [..]  — ALL must be set
##   "unless_flags":  [..]  — NONE may be set


static func flags_ok(cond: Dictionary, flags: Dictionary) -> bool:
	for f in cond.get("require_flags", []):
		if not flags.get(f, false):
			return false
	for f in cond.get("unless_flags", []):
		if flags.get(f, false):
			return false
	return true


## First eligible on_enter cutscene id for this map, or "" if none.
## `seen` is GameState.seen_cutscenes; a non-replayable cutscene already seen is skipped.
static func on_enter_cutscene(map: Dictionary, flags: Dictionary, seen: Dictionary) -> String:
	for trig in map.get("on_enter", []):
		var cid: String = trig.get("cutscene", "")
		if cid == "":
			continue
		if not trig.get("replayable", false) and seen.get(cid, false):
			continue
		if flags_ok(trig, flags):
			return cid
	return ""


## First eligible tile event whose cell matches `cell`, or {} if none.
static func tile_event(map: Dictionary, cell: Vector2i, flags: Dictionary, seen: Dictionary) -> Dictionary:
	for trig in map.get("events", []):
		var c: Array = trig.get("cell", [])
		if c.size() != 2 or Vector2i(int(c[0]), int(c[1])) != cell:
			continue
		var cid: String = trig.get("cutscene", "")
		if cid != "" and not trig.get("replayable", false) and seen.get(cid, false):
			continue
		if flags_ok(trig, flags):
			return trig
	return {}


## Whether an NPC should be drawn / be interactable given current flags.
## Defeated bosses (their flag set) stay gone; hide_if/show_if gate story NPCs.
static func npc_visible(npc: Dictionary, flags: Dictionary) -> bool:
	var boss: Dictionary = npc.get("boss", {})
	if not boss.is_empty() and flags.get(boss.get("flag", ""), false):
		return false
	for f in npc.get("hide_if_flags", []):
		if flags.get(f, false):
			return false
	for f in npc.get("show_if_flags", []):
		if not flags.get(f, false):
			return false
	return true


## Resolve the effective NPC interaction for current flags: returns the first matching
## entry in npc.states (each may override dialogue/action/etc.), else the base npc dict.
static func resolve_npc(npc: Dictionary, flags: Dictionary) -> Dictionary:
	for st in npc.get("states", []):
		if flags_ok(st, flags):
			return st
	return npc


## A warp is locked until all its require_flags are set.
static func warp_locked(warp: Dictionary, flags: Dictionary) -> bool:
	for f in warp.get("require_flags", []):
		if not flags.get(f, false):
			return true
	return false
