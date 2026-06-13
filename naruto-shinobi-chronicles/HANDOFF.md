# Handoff — Naruto: Shinobi Chronicles (state as of 2026-06-13)

## Wave 1 visuals integration (Phase 2) — DONE this round
Full art review doc: `docs/WAVE1_VISUALS_HANDOFF.md` (delivered with the assets).
- 21 Wave-1 asset files imported under `assets/` (12 overworld portraits, 4 Naruto
  battle refs, 3 Konoha layout refs, 2 establishing shots).
- **Texture pipeline built**: `data/visuals/units.json` → `DataRegistry.unit_texture()`
  with fallback chain battle → overworld → palette-block ColorRect. Validated at
  load (unknown unit ids / missing files fail validation).
- Wired: battle sprites (48×48 box, rebuilt on switch), overworld lead-unit
  walker (16×24, feet-on-tile), title screen backdrop (village gate shot, dimmed).
- 11 units have live art: naruto (overworld+battle), sasuke, sakura, rock_lee,
  hinata, shikamaru, choji, ino, kiba, shino, tenten. Neji pending a slice from
  `konoha11_roster_sheet.png` (cleanest source — prefer it for re-exports).

### Decisions taken on the flagged forks (revisit any time)
- **Map scale (doc §5):** Option 3 — keep one-screen maps now; camera/scrolling
  deferred to Phase 3; Konoha can grow via multi-screen warps with zero engine work.
- **Sasuke outfit (§6.1):** Option (b) — delivered purple sprite ships as base
  Sasuke (intentional stylization). Commission navy Genin art later if desired;
  `sasuke_cm2` still needs its own promoted art either way.
- **Naruto cloak art (§6.2):** Option (a) — `naruto_battle_tailedbeast_cloak.png`
  stored for a sequel-tier form; `naruto_sage` keeps placeholder until proper
  Sage Mode art (eye markings, no cloak) lands.
- **Sizes:** display boxes locked (overworld 16×24, battle 48×48, keep-aspect);
  raw JPEGs used as-is this pass — indexed-PNG/16-color re-export is follow-up
  art work, not an engine blocker.

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
