# Handoff — Naruto: Shinobi Chronicles (state as of 2026-06-12)

## Current state: VERIFIED PLAYABLE (Phase 1 complete)
Branch `claude/naruto-shinobi-chronicles-ptmcjl`, PR #3, CI green.
- 63/63 engine tests + end-to-end smoke test (incl. synthesized-input regression guard)
- Playable loop: title → starter/custom builder → Konoha → Training Grounds /
  Forest of Death → wild battles → catch/level/promote → Orochimaru boss → rewards
- Battle input freeze fixed in `6a73ee3` (BattleController._unhandled_input)

## Startup
Desktop: Godot 4.3 → Import `naruto-shinobi-chronicles/project.godot` → F5.
Android: sideload Godot 4.3 Android editor APK → import branch ZIP → Play
(⚠ needs Bluetooth gamepad until touch controls land — top Phase 2 item).
Headless checks: `godot --headless -s tests/run_tests.gd` and
`godot --headless res://tests/smoke/SmokeRunner.tscn` (expect `SMOKE_OK`).

## Architecture rules (do not break)
1. `BattleEngine`/`BattleState` stay pure — no scene/autoload access; all RNG
   through `BattleState.rng` (deterministic tests/replays).
2. All content is JSON under `data/`; `DataRegistry.load_all()` validates
   cross-references; CI re-validates in Python. New areas = new map JSON only.
3. Everything in `GameState` must round-trip `to_dict()/from_dict()` (save blob).

## Phase 2 backlog (priority order)
1. **Touch controls** — on-screen D-pad + A/B mapped to ui_* actions; unblocks
   phone testing. Also flip `use_gradle_build=false` in export_presets.cfg.
2. **Commander skills in battle UI** — Analyze / Tactical Order / Chakra
   Infusion / Sealing Tag exist in GameState + BattleState.commander_used but
   are NOT surfaced in BattleController's menu yet.
3. **Chunin Exam Stadium** — tournament bracket scene; scripted 1v1s
   (Neji, Gaara, Temari, Kankuro); reward: Chunin Vest (+1 tactical slot),
   story flag for promotions. Needs new map JSON + bracket UI.
4. **Art pass** — replace palette-block placeholders with 16-color sprites;
   `UnitData.palette` is the hook; add `assets/sprites/units/`.
5. **Audio pass** — .it tracker modules into `assets/audio/music/`
   (AudioDirector.play_bgm already no-ops gracefully until files exist).
6. **Land of Waves arc** — map + Zabuza/Haku boss chain; Haku join reward.
7. Jutsu slot-replacement UI when learnset exceeds 8 slots (currently silently
   skips); nature mastery picker at Lv10/20/30 (field exists on UnitInstance).

## Known quirks
- Wild-encounter battles only use the wild unit at its rolled level; trainers/
  bosses use fixed parties from map JSON (`npcs[].boss.party`).
- `goals.db` for the income-hunt app now lives at `income-hunt/goals.db`.
