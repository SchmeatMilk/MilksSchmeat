# COMPLETE PROJECT HANDOFF — Naruto: Shinobi Chronicles
*State as of 2026-06-14. This is the single authoritative handoff: a new
coder/session should be able to work from this document alone.*

> **Latest milestone — Story Mode (Academy → Valley of the End).** A full,
> data-driven narrative now ships: a cutscene system, flag-gated story triggers,
> conditional NPC dialogue, a quest/Missions log, and Commander battle skills,
> plus four acts of content (Bell Test, Land of Waves, Chunin Exams, Sasuke's
> defection, Sage Mode, Akatsuki, and the two-phase Valley of the End finale).
> 170 headless tests pass; the smoke test now drives the graduation cutscene and
> a multi-unit save/load. See §5–§8.

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
Import the project folder, Play. On-screen touch controls (D-pad + A/B)
appear automatically on touch devices via the `TouchControls` autoload
(press **F9** to force the overlay on/off for desktop preview/testing).

**Verify (headless — run before AND after changes):**
```bash
cd naruto-shinobi-chronicles
godot --headless --import                          # build .godot cache (first time / after asset changes)
godot --headless -s tests/run_tests.gd             # expect: 170 passed, 0 failed
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
   targets, affinities, traits, combo components, visual asset paths, **cutscene
   recruit/warp/battle refs, map-trigger cutscene ids, quest flags**).
6. **Story is data too.** Cutscenes (`data/cutscenes/*.json`), map `on_enter` /
   tile `events`, flag-gated warps, and conditional NPC `states` are all JSON;
   gating is resolved by the pure `StoryTriggers` helper. New story beats need
   zero GDScript. Only Commander skills and the Cursed Seal status touch the
   battle engine, and both are pure `BattleState` operations.
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
│   ├── overworld/OverworldScene.gd  # map render, movement, encounters, NPCs, warps,
│   │                              # cutscene playback, on_enter/tile triggers, recruits
│   ├── story/StoryTriggers.gd     # PURE: cutscene/tile/warp gating + NPC state resolution
│   ├── ui/                        # TitleScreen, MenuSystem (pause + Missions), ShopUI,
│   │                              # CustomBuilderUI, ListMenu, DialogueBox, CutscenePlayer
│   └── resources/                 # UnitData, JutsuData, TypeChart (from_dict loaders)
├── data/                          # 33 units · 63 jutsu · 8 combos · 11 statuses · 15 traits
│   │                              # 19 items · 8 maps · 14 cutscenes · 8 quests · 11 visuals
│   ├── units/ jutsu/ types/ status/ items/ progress/ maps/ visuals/ cutscenes/ story/
├── assets/                        # Wave-1 art (see §6); reference + live sprites
├── tests/
│   ├── run_tests.gd               # 170 assertions, seeded RNG, exits 1 on failure
│   └── smoke/SmokeRunner.tscn     # new game → graduation cutscene recruits Team 7 →
│                                  # wild battle (input regression guard) → multi-unit save
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
| Overworld: maps, encounters, NPCs, warps, bosses | ✅ Done (8 maps) |
| Party/bag/shop/Bingo Book/save UI | ✅ Done |
| Custom Shinobi builder | ✅ Done (village/affinities/trait) |
| Texture pipeline + Wave-1 art | ✅ Done — 11/33 units have live art |
| Battle input | ✅ Fixed (`6a73ee3`) + regression guard in smoke test |
| **Cutscene system + story triggers** | ✅ Done — `CutscenePlayer`, `data/cutscenes/*`, pure `StoryTriggers` (on_enter / tile events / gated warps / conditional NPC states) |
| **Story Mode (Academy → Valley of the End)** | ✅ Done — 14 cutscenes across 4 acts; recruits, defection, Sage Mode gate, 2-phase finale + ending |
| **Commander skills (Analyze/Tactical Order/Chakra Infusion/Sealing Tag)** | ✅ Done — Commander submenu in `BattleController`; once-per-battle flags enforced in `BattleEngine` |
| **Quest log UI** | ✅ Done — pause-menu "Missions" page (checklist) from `data/story/quests.json` |
| **Cursed Seal status** | ✅ Done — STR/NIN x1.3 + HP drain; `cursed_seal_form` jutsu; final Sasuke uses it |
| **Chunin Exam Stadium** | ✅ Done — Neji→Kankuro→Temari→Gaara bracket (one proctor, flag-gated states) |
| Starter choice (three scrolls) | ✅ Done — Naruto + themed scroll unit recruited at graduation |
| Jutsu learning with 8/8 slots full | ⚠ **Silently skipped** — needs replace-a-move UI |
| Nature mastery picks (Lv 10/20/30) | ⚠ Field exists on `UnitInstance`, no picker UI |
| Enemy AI personality variance | ⚠ One generic scorer for all enemies |
| Touch controls | ✅ Done — `TouchControls` autoload overlay (D-pad + A/B), auto-shown on touch devices; **F9** force-toggles for desktop testing |
| Real audio | ❌ Synth blips only; `AudioDirector` ready for .ogg/.it drops |
| Acts 5–6 (sequel: KCM/Six Paths, post-game) | ❌ Not started |

---

## 6. History: fixes & recorded decisions

- **Story Mode build (2026-06-14)** — translated the narrative team's notes into
  the data-driven engine. Decisions made (creative latitude was delegated):
  - *Framing:* player is the Commander **named Naruto**; Team 7 are units you
    command. The three "scrolls" at the title pick a themed 4th starter
    (Taijutsu→Rock Lee, Ninjutsu→Tenten, Genjutsu→Shino); Sasuke/Sakura + the
    scroll unit are recruited by the **graduation cutscene**, NOT `new_game`
    (keeps `new_game("naruto")` a single-unit, smoke-stable start).
  - *Simplified to fit the GBA/pure-engine model:* Itachi's "invert controls" →
    a strong genjutsu (Tsukuyomi: sleep + accuracy down); Kisame's "underwater"
    → a real `water_dome` field effect (water ×1.3 / fire ×0.7); the final
    "QTE duel" → a scripted **2-phase turn battle** chained by flags +
    cutscenes; Sage Mode → existing promotion gated by the (unpurchasable)
    Forbidden Scroll granted at Myoboku; Akatsuki "open world" → a focused
    two-boss road.
  - *Deferred (sequel/Phase 3):* Camera2D scrolling, full Akatsuki roster, real
    audio, summon roster, literal control inversion, KCM/Six-Paths forms.
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

## 7. Verified state (current HEAD)

- `godot --headless -s tests/run_tests.gd` → **170 passed, 0 failed**
- Smoke test → **SMOKE_OK** — now drives the graduation cutscene to completion
  (asserts Team 7 recruited), the wild-battle input-regression guard, and a
  multi-unit save/load roundtrip.
- CI green on PR #3; data validation also re-run in pure Python in CI
- Known cosmetic noise at headless exit: "ObjectDB instances leaked" warning and
  two `set_input_as_handled` null errors from the touch-controls unit test —
  both harmless (no live viewport in `-s` mode); suites still report 0 failed.

---

## 8. Prioritized backlog

*Story Mode, Commander skills, the Chunin Stadium, the quest log, and the Land of
Waves arc are now DONE (see §5/§6). Remaining:*

1. **Jutsu slot-replacement UI** when learning with 8/8 slots full (still silently
   skipped in `UnitInstance.gain_exp`).
2. **AI personality variance** — per-archetype weights in `BattleAI._score_jutsu`
   (glass cannons favor damage, supports favor status/heal). Would make the new
   boss fights (Itachi/Kisame/Gaara) feel distinct.
3. **Art pipeline follow-ups** — slice Neji from the roster sheet; 16-color
   indexed-PNG re-exports; Batch 2 art (Kakashi, Gaara, Jiraiya, Tsunade,
   Orochimaru, Itachi, Kisame); resolve `sasuke_cm2` + `naruto_sage` promoted
   sprites. Cutscene backgrounds reuse the two establishing-shot references; new
   per-scene art would lift the story beats.
4. **Nature mastery picker** at Lv 10/20/30.
5. **Audio pass** — tracker/.ogg BGM into `assets/audio/music/`
   (`AudioDirector.play_bgm` already no-ops gracefully). Story beats key BGM by
   name (`battle_boss`, `town_theme`, etc.) — just drop files in.
6. **Narrative polish** — branching cutscene choices (a `choice` step kind),
   per-character battle intro barks, and a New Game+ that keeps the squad.
7. **Phase 3 (engine):** Camera2D scrolling for large maps; Acts 5–6 (KCM /
   Six-Paths forms, post-game) for the sequel import.

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
    godot --headless -s tests/run_tests.gd            # expect 170+ passed, 0 failed
    godot --headless res://tests/smoke/SmokeRunner.tscn  # expect SMOKE_OK
- Work the backlog in §8 order unless told otherwise. Commit + push after each
  item, keep CI green, add headless test coverage for anything testable, and
  update HANDOFF.md (§5/§7/§8) when done so the next session starts hot.
```
