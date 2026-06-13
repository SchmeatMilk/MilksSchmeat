# COMPLETE PROJECT HANDOFF — Naruto: Shinobi Chronicles
*State as of 2026-06-13, commit `cda80bd`. This is the single authoritative
handoff: a new coder/session should be able to work from this document alone.*

---

## 1. What this project is

A **GBA FireRed-style turn-based RPG / ninja collector** ("Pokémon mechanics,
Naruto flavor") built in **Godot 4.3** with self-imposed GBA constraints:
240×160 viewport with integer scaling, palette-driven art, 32KB-budget binary
saves. Non-commercial fan project; no Nintendo/Shueisha assets shipped — Wave-1
art was user-supplied.

**Where it lives**
- Repo: `SchmeatMilk/MilksSchmeat`, folder `naruto-shinobi-chronicles/`
- Branch: `claude/naruto-shinobi-chronicles-ptmcjl` → **draft PR #3** (CI green)
- The sibling folder `income-hunt/` is an unrelated project (income dashboard).
  Do not touch it. (Restructure note: its SQLite file now resolves to
  `income-hunt/goals.db`, not repo root.)
- Cloud session containers are ephemeral — **GitHub is the only durable copy**.

---

## 2. Quick start

**Play (desktop):** install Godot 4.3 → Import → select
`naruto-shinobi-chronicles/project.godot` → F5.
Controls: arrows move · Enter/Space confirm/interact · Esc cancel / pause menu.

**Play (Android, no PC):** sideload the Godot 4.3 *Android editor* APK
(godotengine.org/download/android), copy the branch ZIP to the phone, extract,
Import the project folder, Play. ⚠ **Touch controls are not implemented** —
a Bluetooth gamepad is required until backlog item #1 lands.

**Verify (headless — run before AND after changes):**
```bash
cd naruto-shinobi-chronicles
godot --headless --import                          # build .godot cache (first time / after asset changes)
godot --headless -s tests/run_tests.gd             # expect: 67 passed, 0 failed
godot --headless res://tests/smoke/SmokeRunner.tscn  # expect: SMOKE_OK
```
CI (`.github/workflows/shinobi-chronicles-ci.yml`) runs a Python JSON
cross-reference check (no Godot needed) plus both suites on Godot 4.3-stable.

---

## 3. Architecture — DO-NOT-BREAK rules

1. **`BattleEngine` and `BattleState` are pure.** No scene/node access, no
   autoload reads. ALL randomness flows through `BattleState.rng` (seedable →
   deterministic tests, future replays/netplay). `BattleController` only draws
   and routes input. Item consumption from inventory is the caller's job.
2. **JSON under `data/` is the single source of truth.**
   `DataRegistry.load_all()` parses everything into typed Resources and fails
   validation on broken cross-references (learnset jutsu ids, promotion
   targets, affinities, traits, combo components, visual asset paths).
3. **Everything in `GameState` must round-trip `to_dict()/from_dict()`** —
   that dict becomes the checksummed binary save blob (`SaveManager`).
4. **Maps are data.** A map = char grid (`#` wall, `,` grass/encounter,
   `~` water, other = floor) + NPC/warp/encounter/boss tables. New areas need
   zero GDScript.
5. **Art is optional everywhere.** Texture pipeline fallback chain:
   `battle_sprite` → `overworld_sprite` → palette-block ColorRect. The game
   must stay fully playable with zero assets present.

---

## 4. Codebase map

```
naruto-shinobi-chronicles/
├── project.godot                  # 240×160 viewport, 5 autoloads, GL Compatibility
├── export_presets.cfg             # Android / Web / Linux / Windows presets
├── src/
│   ├── autoloads/
│   │   ├── DataRegistry.gd        # JSON → Resources, validation, unit_texture() resolver
│   │   ├── GameState.gd           # commander, party, archive, inventory, flags, save dict
│   │   ├── SaveManager.gd         # 3 slots, magic+checksum header, var_to_bytes blob
│   │   ├── SceneRouter.gd         # scene transitions w/ payload (battle params, warps)
│   │   └── AudioDirector.gd       # BGM no-ops until files exist; synth square-wave SFX
│   ├── battle/
│   │   ├── BattleEngine.gd        # PURE: turn pipeline, damage, status, traits, catch
│   │   ├── BattleState.gd         # PURE: parties, CP pools, field effects, seeded rng, log
│   │   ├── JutsuExecutor.gd       # PURE: data-driven effect list applier
│   │   ├── ComboSystem.gd         # PURE: combination jutsu rules + execution
│   │   ├── BattleAI.gd            # PURE: greedy one-ply scorer w/ CP awareness
│   │   ├── UnitInstance.gd        # PURE: runtime unit (stats, exp, promote, serialize)
│   │   └── BattleController.gd    # SCENE: renders state, routes input, rewards, exits
│   ├── overworld/OverworldScene.gd  # map render, grid movement, encounters, NPCs, warps
│   ├── ui/                        # TitleScreen, MenuSystem (pause), ShopUI,
│   │                              # CustomBuilderUI, ListMenu + DialogueBox widgets
│   └── resources/                 # UnitData, JutsuData, TypeChart (from_dict loaders)
├── data/                          # 31 units · 59 jutsu · 8 combos · 10 statuses ·
│   │                              # 15 traits · 17 items · 3 maps · 11 visual entries
│   ├── units/  jutsu/  types/  status/  items/  progress/  maps/  visuals/
├── assets/                        # Wave-1 art (see §6); reference + live sprites
├── tests/
│   ├── run_tests.gd               # 67 assertions, seeded RNG, exits 1 on failure
│   └── smoke/SmokeRunner.tscn     # full loop incl. synthesized-input regression guard
├── docs/WAVE1_VISUALS_HANDOFF.md  # verbatim Wave-1 art review/integration doc
└── scenes/ Title.tscn · Overworld.tscn · Battle.tscn  (thin shells; UI built in code)
```

**Key mechanics already implemented** (spec-exact, all tested): damage formula
`floor(floor((2L/5+2)·Pow·Atk/Def)/50)+2 × Type×Crit×Rand×Field×Trait`; dual-type
multiplication; shared team CP replacing PP; HSC charge turns (release at start
of user's NEXT turn); status immunities (Fire↛burn, Lightning↛paralysis,
Yin↛seal); promotion w/ level reset (item or story-flag gated); sealing-tag
catch formula; combos (both alive, both equipped, summed CP, 1/pair/battle);
exp `floor(BaseExp·Level/5)` to all alive members; level cap 50; jutsu slots
3→8 (+1 per 5 levels).

---

## 5. Systems status

| System | Status |
|---|---|
| Battle engine, statuses, traits, fields, combos, catching | ✅ Done, tested |
| Progression: exp/level/learnsets/promotion | ✅ Done, tested |
| Overworld: maps, encounters, NPCs, warps, bosses | ✅ Done (3 maps) |
| Party/bag/shop/Bingo Book/save UI | ✅ Done |
| Custom Shinobi builder | ✅ Done (village/affinities/trait) |
| Texture pipeline + Wave-1 art | ✅ Done — 11/31 units have live art |
| Battle input | ✅ Fixed (`6a73ee3`) + regression guard in smoke test |
| Commander skills (Analyze/Tactical Order/Chakra Infusion/Sealing Tag) | ⚠ Modeled in `GameState` + `BattleState.commander_used` but **not surfaced in battle menu** |
| Jutsu learning with 8/8 slots full | ⚠ **Silently skipped** — needs replace-a-move UI |
| Nature mastery picks (Lv 10/20/30) | ⚠ Field exists on `UnitInstance`, no picker UI |
| Enemy AI personality variance | ⚠ One generic scorer for all enemies |
| Quest log UI | ⚠ `story_flags` exist; no player-facing journal |
| Touch controls | ❌ Not implemented (blocks phone play) |
| Real audio | ❌ Synth blips only; `AudioDirector` ready for .ogg/.it drops |
| Chunin Exam Stadium, Acts 4–6 | ❌ Not started |

---

## 6. History: fixes & recorded decisions

- **Battle input freeze** — root cause: `BattleController` had no input
  handler, menu rendered but never received events. Fix: `_unhandled_input` →
  `menu.handle_input()` guarded by `_busy`. The smoke test now drives the menu
  with synthesized `ui_accept`/`ui_cancel` events so this can't regress.
- **Wave-1 fork decisions** (full reasoning in `docs/WAVE1_VISUALS_HANDOFF.md`
  §5–6; all reversible):
  - *Map scale:* keep one-screen maps; camera/scrolling deferred to Phase 3;
    grow Konoha via multi-screen warps if needed sooner.
  - *Sasuke:* delivered purple/Hebi-style sprite ships as **base** Sasuke
    (intentional stylization). `sasuke_cm2` still needs its own promoted art.
  - *Tailed-Beast-Cloak art:* stored for a sequel-tier form. `naruto_sage`
    keeps placeholder until true Sage Mode art (eye markings, no cloak).
  - *Display boxes locked:* overworld 16×24 (feet-on-tile), battle 48×48,
    keep-aspect. Raw JPEGs used as-is; 16-color indexed-PNG re-export is
    follow-up art work (prefer `konoha11_roster_sheet.png` as source — far
    cleaner than the individual JPEGs).
- **Repo restructure** — Income Hunt moved to `income-hunt/` (100% git renames,
  history preserved); root README indexes both projects; CLAUDE.md updated.

---

## 7. Verified state (commit `cda80bd`)

- `godot --headless -s tests/run_tests.gd` → **67 passed, 0 failed**
- Smoke test → **SMOKE_OK** (input-event check included)
- CI green on PR #3; data validation also re-run in pure Python in CI
- Known cosmetic noise at headless exit: "ObjectDB instances leaked" warning —
  harmless, from quit-without-teardown in the test runner.

---

## 8. Prioritized backlog

1. **Touch controls** — CanvasLayer D-pad + A/B emitting `ui_*` actions
   (`Input.parse_input_event`), shown on touch devices. Unblocks phone play.
   Also set `use_gradle_build=false` in `export_presets.cfg` for easy APKs.
2. **Commander skills in battle UI** — surface the four skills in
   `BattleController`'s root menu; state/once-per-battle flags already exist.
3. **Chunin Exam Stadium** — new map JSON + tournament bracket (Neji → Gaara →
   Temari → Kankuro scripted 1v1s); reward Chunin Vest (+1 tactical slot) +
   story flag (promotion gate already reads flags).
4. **Jutsu slot-replacement UI** when learning with 8/8 slots full.
5. **Art pipeline follow-ups** — slice Neji from the roster sheet; 16-color
   indexed-PNG re-exports; Batch 2 art (Kakashi, Gaara, Jiraiya, Tsunade,
   Orochimaru); resolve `sasuke_cm2` + `naruto_sage` promoted sprites.
6. **AI personality variance** — per-archetype weights in `BattleAI._score_jutsu`
   (glass cannons favor damage, supports favor status/heal).
7. **Quest log UI** — MenuSystem page rendering active/completed `story_flags`.
8. **Nature mastery picker** at Lv 10/20/30.
9. **Land of Waves arc** — map + Zabuza/Haku boss chain, Haku join reward.
10. **Audio pass** — tracker/.ogg BGM into `assets/audio/music/`
    (`AudioDirector.play_bgm` already no-ops gracefully).
11. **Phase 3 (engine):** Camera2D scrolling for large maps; Acts 5–6 →
    Valley of the End finale + ending-choice flag for the sequel import.

---

## 9. Next-session starter prompt (copy-paste)

```
Continue the Naruto: Shinobi Chronicles game in SchmeatMilk/MilksSchmeat.

- Branch: claude/naruto-shinobi-chronicles-ptmcjl (open draft PR #3 — push
  there, don't create new branches). Game lives in naruto-shinobi-chronicles/;
  income-hunt/ is a separate project, don't touch it.
- READ FIRST: naruto-shinobi-chronicles/HANDOFF.md — complete project handoff
  with architecture rules (§3 is non-negotiable: BattleEngine stays pure, all
  content is data-driven JSON), systems status, and the prioritized backlog (§8).
- Verify before and after changes (download Godot 4.3 headless if needed):
    cd naruto-shinobi-chronicles
    godot --headless --import
    godot --headless -s tests/run_tests.gd            # expect 67+ passed, 0 failed
    godot --headless res://tests/smoke/SmokeRunner.tscn  # expect SMOKE_OK
- Work the backlog in §8 order unless told otherwise. Commit + push after each
  item, keep CI green, add headless test coverage for anything testable, and
  update HANDOFF.md (§5/§7/§8) when done so the next session starts hot.
```
