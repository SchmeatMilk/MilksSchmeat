# Naruto: Shinobi Chronicles

A Pokémon Diamond/Pearl-style **turn-based tactical RPG / ninja collector**, built in
**Godot 4.3** (256×192 DS-native viewport, integer scaling, 32KB-budget binary saves).

This is a non-commercial fan project. It ships **no Nintendo/Shueisha assets** — all
art is **procedurally generated original pixel art** (see `tools/art/` and
[HANDOFF_V2_VISUALS.md](HANDOFF_V2_VISUALS.md)), all data is original JSON.

**V2 Visual Edition:** real tileset + animated sprites, a scrolling Konoha
(Hokage Rock, Hokage Tower, Academy, Hospital, **Ichiraku Ramen heal-stalls**,
gate, river), a D/P-style battle screen, and a painted title — all rendered
in-engine. The renderer falls back to palette blocks for any missing texture.

## What's implemented (Vertical Slice foundation)

| System | Status | Where |
|---|---|---|
| Commander system (no trainer avatar; Authority / Chakra Reserve / Tactical Slots) | ✅ | `src/autoloads/GameState.gd` |
| Shared team Chakra Pool (CP) replacing per-move PP | ✅ | `src/battle/BattleState.gd` |
| 7-nature affinity chart (Fire/Wind/Lightning/Earth/Water/Yin/Yang + None), dual-type multiplication | ✅ | `data/types/type_chart.json`, `src/resources/TypeChart.gd` |
| Locked damage formula `floor(floor((2L/5+2)·Pow·Atk/Def)/50)+2` × Type×Crit×Rand×Field×Trait | ✅ | `src/battle/BattleEngine.gd` |
| Hand Seal Count (HSC) charge turns — releases at the start of the user's *next* turn | ✅ | engine + test |
| 10 status conditions with exact tick mechanics + affinity immunities | ✅ | `data/status/status_defs.json` |
| 15 traits (Sharingan evade+copy, Byakugan true-hit, Jinchuriki rage, Medical revive, …) | ✅ | engine hooks |
| 59 jutsu incl. Kirin (thundercloud requirement), Rasengan, field-setting AoEs | ✅ | `data/jutsu/jutsu_master.json` |
| 8 Combination Jutsu (both units alive, both components equipped, 1/pair/battle) | ✅ | `src/battle/ComboSystem.gd` |
| 31 units: starters + promoted forms, Rookie 9, Sand sibs, Sannin, wilds | ✅ | `data/units/*.json` |
| Promotion system (level reset to 1 on stronger base; item/story-flag gates) | ✅ | `UnitInstance.promote()` |
| Sealing-tag catching with the spec's catch-rate formula | ✅ | engine + test |
| Data-driven overworld (Konoha hub, Training Grounds, Forest of Death + Orochimaru boss) | ✅ | `data/maps/*.json`, `src/overworld/` |
| Wild encounters (weighted tables, per-tile grass rolls) | ✅ | `OverworldScene.gd` |
| Pause menu: party / promote / bag / Bingo Book / save | ✅ | `src/ui/MenuSystem.gd` |
| Shop, dialogue, warps, boss rewards, commander rank-ups | ✅ | `src/ui/`, maps |
| Custom Shinobi builder (village, 2 affinities, innate trait) | ✅ | `src/ui/CustomBuilderUI.gd` |
| 3-slot checksummed binary saves (SRAM style) | ✅ | `src/autoloads/SaveManager.gd` |
| Headless deterministic test suite (seeded RNG) + CI | ✅ | `tests/run_tests.gd`, `.github/workflows/` |

Done in V2: real pixel art (overworld + battle + UI), scrolling village + camera.
Not yet: tracker music (synthesized blips for now), Chunin Exam arena, Acts 4–6,
Android signing config.

## Run it

```bash
# Play (requires Godot 4.3)
godot --path naruto-shinobi-chronicles

# Run the battle-engine test suite headless
cd naruto-shinobi-chronicles
godot --headless --import   # first time only, builds the .godot cache
godot --headless -s tests/run_tests.gd
```

Controls: arrows move · Enter/Space confirm & interact · Esc cancel / pause menu.

## Architecture rules (do not break)

1. **`BattleEngine` is pure.** No scene/node access, no autoload reads. All
   randomness flows through `BattleState.rng` (seedable → deterministic tests
   and future replays/netplay). `BattleController` only draws and routes input.
2. **JSON is the single source of truth.** `DataRegistry.load_all()` parses
   everything under `data/` into typed Resources and runs the QA-checklist
   validation (learnset refs, promotion targets, affinities, combo components).
   CI re-runs the same checks in Python without Godot.
3. **Maps are data.** A map is a grid of chars (`#` wall, `,` grass, `~` water)
   plus NPC/warp/encounter tables. New areas need zero GDScript.
4. **Everything in `GameState` round-trips** through `to_dict()/from_dict()`
   into the checksummed save blob.

## Data file layout

```
data/
  units/           31 files — one per unit + custom_template.json
  jutsu/           jutsu_master.json (59), combo_list.json (8)
  types/           type_chart.json (8×8 matrix)
  status/          status_defs.json (10), traits.json (15)
  items/           items.json (17)
  progress/        level_curve.json, natures.json
  maps/            konoha, training_grounds, forest_of_death
```

## Roadmap (per the locked 24-week plan)

- **Next:** Chunin Exam Stadium (scripted tournament bracket), pixel-art pass
  on the 16-color palette pipeline, .it tracker BGM, Land of Waves arc.
- **Then:** Konoha Crush, Search for Tsunade, Valley of the End finale,
  ending choice flag for the Shippuden sequel import.
