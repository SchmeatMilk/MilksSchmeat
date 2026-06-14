# HANDOFF — Naruto: Shinobi Chronicles (Story Mode × V2 Visual Edition)
*State as of 2026-06-14. Branch `claude/naruto-story-on-256`. This merges the two
parallel lines: the design team's **256×192 V2 Visual Edition** (the primary visual
direction) and the **Story Mode** narrative layer (Academy → Valley of the End).*

> Read alongside `HANDOFF_V2_VISUALS.md` (the visual edition's own handoff — art
> pipeline in `tools/art/`, tileset/Camera2D overworld, D/P battle, `UiKit`).

---

## What this branch is

The 256×192 visual edition is the **trunk** (Camera2D scrolling 44×32 Konoha, real
tilesets + walk sprites, building/prop objects, D/P battle screen, `UiKit`, the
`tools/art` Pillow pipeline). Onto it, the full **Story Mode** layer has been
grafted, all data-driven:

- **Cutscene system** — `src/ui/CutscenePlayer.gd` (256×192) + `data/cutscenes/*.json`
  (14 scenes). `on_finish` effects: `set_flags / grant_items / recruit /
  recruit_scroll / release / goto_map / start_battle / heal`.
- **Story triggers** — `src/story/StoryTriggers.gd` (pure, unit-tested): map
  `on_enter` cutscenes, tile `events`, flag-gated warps, conditional NPC `states`,
  NPC visibility (`hide_if_flags` / `show_if_flags`).
- **Quest/Missions log** — pause-menu page from `data/story/quests.json`.
- **Commander battle skills** — Analyze / Tactical Order / Chakra Infusion / Sealing
  Tag (Commander submenu; once-per-battle flags in `BattleState.commander_used`).
- **Cursed Seal** status (STR/NIN ×1.3 + HP drain) + `cursed_seal_form` jutsu;
  **water_dome** field (water ×1.3 / fire ×0.7).
- New units `itachi`, `kisame`; items `soothing_balm`, `chunin_vest`.

## The story arc (data-driven, flag-gated)

New Game → pick a scroll (Taijutsu→Rock Lee / Ninjutsu→Tenten / Genjutsu→Shino);
the **graduation** cutscene recruits Team 7 + the scroll unit. Then:
- **Act I** Bell Test (Training Grounds) → Land of Waves (`wave_bridge`, Zabuza→Haku, Haku joins).
- **Act II** Forest of Death (Orochimaru → Cursed Seal) → `chunin_stadium` bracket (Neji→Kankuro→Temari→Gaara → Chunin Vest).
- **Act III** gate-night defection (Sasuke leaves) → `myoboku` Sage Mode → `akatsuki_road` (Itachi, Kisame).
- **Act IV** `valley_of_the_end` two-phase finale (squad → 1v1) + stalemate ending + credits.

Konoha gains flag-gated warps to each act's map (west wall) plus the existing
Training/Forest gates; `new_game` now spawns at Konoha's `spawn` point.

## Architecture notes (merge specifics)

- Pure engine files (`BattleEngine`, `BattleState`, `UnitInstance`, …) are shared and
  unchanged except additive Story logic (commander skills, cursed seal, water_dome).
- `DataRegistry` loads BOTH the visual manifests (`visuals/{units,tiles,buildings}.json`)
  AND cutscenes/quests, and validates story cross-refs.
- Story maps use the visual edition's schema (`size`/`spawn`/tile-legend `grid`);
  warps fire before the walkability check, so act exits sit on border cells.
- `itachi`/`kisame` and the cutscene backgrounds have no bespoke art yet → they fall
  back to ColorRect blocks / the establishing-shot references (game stays playable).
  Next art batch: roster sheets for the two Akatsuki + per-scene cutscene backdrops.

## Verify (headless)
```
cd naruto-shinobi-chronicles
godot --headless --path . --import
godot --headless --path . -s tests/run_tests.gd            # expect 152 passed, 0 failed
godot --headless --path . res://tests/smoke/SmokeRunner.tscn # expect SMOKE_OK
```
The smoke drives the graduation cutscene (asserts Team 7 recruited) + a multi-unit
save/load. CI (`.github/workflows/shinobi-chronicles-ci.yml`) runs a Python JSON
cross-reference check plus both suites on Godot 4.3-stable.

## Open product decision
Malik declared the 256×192 visuals primary; this branch realizes that with Story
Mode on top. If the 240×160 Story-Mode line (PR #3) is to be retired, point it here.
