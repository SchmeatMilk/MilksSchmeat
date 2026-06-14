# Project Handoff — Naruto: Shinobi Chronicles
## Visuals Integration — Wave 1

**Status:** Battle freeze bug FIXED (input handler added to `BattleController.gd`, verified working). Phase 2 (visual redesign) is now underway. This document supersedes the previous `HANDOFF.md` — replace it with this file, or merge as you see fit.

**Role of this document:** organize everything currently on the table — corrected engine status, the first wave of delivered art, a proposed asset pipeline, and a prioritized task list — so the final coder can pick up cleanly. Per the original handoff note, **everything below is a recommendation**. The final coder has full authority to deviate where the engine or art makes more sense a different way.

---

## 1. Corrected System Status

The earlier "Missing Core Features" list did not match the actual codebase. Here is the verified state, checked directly against `src/`:

| System | Actual Status | Evidence |
|---|---|---|
| Items / Inventory | **Implemented.** Flat `Dictionary` inventory, `has_item/consume_item/grant_item`, Bag menu, Shop UI. | `GameState.gd`, `MenuSystem.gd`, `ShopUI.gd` |
| Capture / sealing | **Implemented.** Full catch-rate formula, Seal menu, sealing/cursed tags. | `BattleEngine._attempt_catch`, `BattleController._show_seal_menu` |
| Evolution / promotion | **Implemented and wired.** "PROMOTE!" menu item appears when `can_promote()` is true; calls `UnitInstance.promote()`. | `MenuSystem.gd` lines ~81-159, `UnitInstance.gd` |
| Field effects | **Implemented.** `state.field` dict with decay timers; `scorched_earth`, `fissure`, `thundercloud` multipliers feed the damage formula. | `BattleEngine.gd` |
| Dialogue system | **Implemented.** `DialogueBox.gd`, wired into `OverworldScene`. | `src/ui/DialogueBox.gd` |
| Enemy AI | **Partially implemented.** One generic "greedy scorer" (`BattleAI.choose_action`) used for every enemy — no per-character personality variance yet. | `src/battle/BattleAI.gd` |
| Quest / mission tracking | **Partially implemented.** `story_flags` (boolean dict) gate bosses/rewards, but there's no player-facing quest log/journal UI listing current objectives. | `GameState.story_flags` |

**Net effect:** the only genuinely open "core feature" items are (a) AI personality variance and (b) a quest log UI. Both are small, scoped tasks — see Section 8.

---

## 2. Visual Asset Inventory — Wave 1 (Delivered This Round)

18 files were delivered. They've been re-organized into a proposed `assets/` tree (zipped alongside this document). Nothing has been resized, re-palettized, or cropped yet — that's first-pass work for the final coder.

### 2.1 Character Sprites (Overworld) — `assets/sprites/units/overworld/`

| File | Character | Maps to `data/units/` | Notes |
|---|---|---|---|
| `naruto.jpg` | Naruto Uzumaki | `naruto.json` | Orange/blue jacket, blonde spikes, blue headband — matches Genin canon ✅ |
| `sasuke.jpg` | Sasuke Uchiha | `sasuke.json` *or* `sasuke_cm2.json` | **See QA flag 6.1** — outfit reads as lavender/purple with cream sash, not navy Genin blue |
| `sakura.jpg` | Sakura Haruno | `sakura.json` | Pink hair + red top read correctly; silhouette is closer to a separate top/skirt than a one-piece qipao — close enough, minor stylization |
| `rock_lee.jpg` | Rock Lee | `rock_lee.json` | Green jumpsuit + flak jacket + orange legwarmers + bowl cut ✅ |
| `hinata.jpg` | Hinata Hyuga | `hinata.json` | Lavender jacket, dark hair ✅ |
| `shikamaru.jpg` | Shikamaru Nara | `shikamaru.json` | ✅ |
| `choji.jpg` | Choji Akimichi | `choji.json` | ✅ |
| `ino.jpg` | Ino Yamanaka | `ino.json` | ✅ |
| `kiba.jpg` | Kiba Inuzuka | `kiba.json` | ✅ |
| `shino.jpg` | Shino Aburame | `shino.json` | ✅ |
| `tenten.jpg` | Tenten | `tenten.json` | ✅ |
| `konoha11_roster_sheet.png` | **Composite reference** — same 11 above + a 12th unlabeled figure (white/cream robe, long dark hair) | The 12th figure is almost certainly **Neji Hyuga** (`neji.json` exists in data but had no individual file delivered) | This sheet is the cleanest source file (PNG, ~379 colors vs. ~2,500-3,700 JPEG-noise colors in the individual files) — **prefer slicing sprites from this sheet** over the individual JPEGs where possible |

**Roster math:** 11 individual + 1 (Neji, from the sheet) = **12 of 31 roster units now have first-pass overworld art.**

### 2.2 Naruto Battle-Pose References — `assets/sprites/units/battle_reference/naruto/`

| File | Content | Likely Use |
|---|---|---|
| `naruto_battle_rasengan.jpg` | Naruto mid-attack with a cyan/white spinning-sphere effect in hand | Battle sprite for base Naruto using **Rasengan** (learned at Lv18 per `naruto.json`) |
| `naruto_battle_stance.jpg` | Naruto in a dynamic battle-ready pose | General battle-screen idle/active sprite for base Naruto |
| `naruto_battle_3pose_sheet.jpg` | Three poses of base Naruto side-by-side | Likely idle / attack / hit-reaction frame set |
| `naruto_battle_tailedbeast_cloak.png` | Naruto on all fours, fully cloaked in a red, multi-tailed chakra aura | **See QA flag 6.2** — this depicts the **Tailed Beast Cloak (Kurama Mode)**, not "Sage Mode" |

### 2.3 Environment Reference Art — `assets/environments/reference/`

Three reference images for the **Konoha hub**, in three different art-fidelity tiers:

| File | Style | What It Shows |
|---|---|---|
| `konoha_layout_ref_A_firered_style.webp` | Clean GBA FireRed-style top-down, with labeled UI callouts | Full village layout: Hokage Tower (central, round), Ninja Academy, Hospital, Ichiraku Ramen, Residential/Shopping districts, bridge, river, Forest of Death entrance |
| `konoha_layout_ref_B_painterly_style.webp` | SNES-era painterly, more detailed shading | Walled village with **5 Hokage faces** on the cliff, central round Hokage Tower, gate watchtowers, training grounds, pond |
| `konoha_layout_ref_C_clean_mobile_style.webp` | Clean modern "mobile RPG" tile style, populated with NPCs | Hokage Rock (**7 faces** shown — more than canon's 4 at series-start, but useful for tile variety), market stalls with awnings, gate with signage, river + waterfall, NPCs in black ninja outfits with Uchiha-fan-style markings |

**These are inspiration/composition references, not sliceable tilesets** — none of the three matches the game's current 16px-tile grid 1:1. Treat them as the **target layout and mood**; new tiles should be authored at the project's native tile size (see Section 4).

### 2.4 Cutscene / Establishing-Shot Art — `assets/cutscenes/reference/`

| File | Content | Likely Use |
|---|---|---|
| `hokage_rock_establishing_shot.png` | Wide shot of the Hokage Rock cliff face above a forest valley, with a line of ninjas (red/white Uchiha-fan emblem on backs) facing it | Title screen, intro cutscene, or "approaching Konoha" story beat |
| `village_gate_establishing_shot.jpg` | Looking through Konoha's open green double-gate toward the village interior, Hokage Rock visible beyond | Title screen or "entering the village" transition |

Both are high-resolution illustrations — good as **static background images** for cutscene/title scenes (which don't need to obey the 16px tile grid), not as in-world tiles.

---

## 3. Character Roster Coverage Tracker

Cross-referencing the original 25-character creative brief, the 31 units actually in `data/units/`, and Wave-1 art delivery:

| # | Character | In `data/units/`? | Art Status (Wave 1) |
|---|---|---|---|
| 1 | Naruto Uzumaki | ✅ `naruto.json` + `naruto_sage.json` | ✅ Overworld + 4 battle refs |
| 2 | Sasuke Uchiha | ✅ `sasuke.json` + `sasuke_cm2.json` | ✅ Overworld (outfit TBD — see 6.1) |
| 3 | Sakura Haruno | ✅ `sakura.json` + `sakura_apprentice.json` | ✅ Overworld |
| 4 | Kakashi Hatake | ✅ `kakashi.json` | ⬜ Not yet (covered in design research) |
| 5 | Rock Lee | ✅ `rock_lee.json` | ✅ Overworld |
| 6 | Gaara | ✅ `gaara.json` + `gaara_kazekage.json` | ⬜ Not yet |
| 7 | Gamabunta | ⬜ Not in data yet | ⬜ Not yet |
| 8 | Manda | ⬜ Not in data yet | ⬜ Not yet |
| 9 | Katsuyu | ⬜ Not in data yet | ⬜ Not yet |
| 10 | Nine-Tails (Kurama) | ⬜ Not in data as standalone unit | ⚠️ Tailed-Beast-Cloak art delivered (see 6.2) — may represent a *Naruto* form rather than standalone Kurama |
| 11 | Jiraiya | ✅ `jiraiya.json` | ⬜ Not yet |
| 12 | Tsunade | ✅ `tsunade.json` | ⬜ Not yet |
| 13 | Orochimaru | ✅ `orochimaru.json` | ⬜ Not yet |
| 14 | Shikamaru Nara | ✅ `shikamaru.json` | ✅ Overworld |
| 15 | Choji Akimichi | ✅ `choji.json` | ✅ Overworld |
| 16 | Ino Yamanaka | ✅ `ino.json` | ✅ Overworld |
| 17 | Kiba Inuzuka | ✅ `kiba.json` | ✅ Overworld |
| 18 | Shino Aburame | ✅ `shino.json` | ✅ Overworld |
| 19 | Hinata Hyuga | ✅ `hinata.json` | ✅ Overworld |
| 20 | Tenten | ✅ `tenten.json` | ✅ Overworld |
| 21 | Might Guy | ⬜ Not in data yet | ⬜ Not yet |
| 22 | Iruka Sensei | ⬜ Not a collectible unit — appears as an NPC in `konoha.json` | N/A (NPC sprite, not roster sprite) |
| 23 | Zabuza Momochi | ✅ `zabuza.json` | ⬜ Not yet |
| 24 | Haku | ✅ `haku.json` | ⬜ Not yet |
| 25 | Konohamaru Sarutobi | ⬜ Not in data yet | ⬜ Not yet |

**Bonus units in data not on the original 25-list** (already implemented, will need art eventually too): `neji.json` (✅ art delivered via roster sheet), `temari.json`, `kankuro.json` (Sand siblings — pairs naturally with Gaara), plus generic "wild" units (`leaf_genin`, `sound_genin`, `forest_snake`, `giant_centipede`, `mist_swordsman`, `custom_template`).

**Suggested Batch 2 (next 5):** Kakashi, Gaara, Jiraiya, Tsunade, Orochimaru — these are the next highest-priority named characters with zero art so far, and Kakashi/Gaara already have full canon research from the Wave 1 design doc.

---

## 4. Proposed Technical Standards (Suggestions — Final Coder Decides)

None of this is locked. It's offered so the final coder isn't starting from zero.

### 4.1 Sprite Sizes
- **Overworld sprites:** the engine's tile grid is `CELL = 16px` (see `OverworldScene.gd`). A natural fit is **16×32px** (one tile wide, two tiles tall — classic GBA/DS trainer-sprite proportions), anchored so the feet sit on the tile and the head overlaps the tile above. The delivered character art (~130×175px JPEGs, ~0.74 aspect ratio) is proportionally close to 16:22 — a 16×32 frame with some headroom would fit well.
- **Battle sprites:** Pokémon D/P used 80×80px. At the project's 240×160 viewport, an 80×80 sprite is exactly 1/3 of the screen height — large but appropriate for the "highly detailed, D/P-replica" goal stated for this phase. Current placeholder code draws 32×32 — this will need to scale up regardless of final size chosen.

### 4.2 File Format & Palette
- Re-export everything as **PNG** (the JPEGs carry compression noise — 2,500-3,700 unique colors where a clean pixel-art sprite should have ~16-32). The composite `konoha11_roster_sheet.png` is already much cleaner and should be the preferred source where it overlaps with individual files.
- Target a **16-color-per-sprite palette** (4bpp), consistent with the Pokémon D/P reference and the existing `palette: {primary, secondary, accent}` fields already in every unit JSON. Those existing palette entries can seed the final per-character palettes rather than being discarded.

### 4.3 Proposed Folder Structure
```
assets/
  sprites/
    units/
      overworld/<unit_id>.png        # 16x32, walk-cycle frames as a sheet or separate files
      battle/<unit_id>.png           # 80x80 (or chosen size), battle-idle + action frames
  tiles/
    konoha/                          # new tileset(s) derived from Section 2.3 references
    forest_of_death/
    training_grounds/
  ui/                                 # menu/HP-bar/icon art
  fx/                                 # jutsu effect sprites (Rasengan, Chidori, etc.)
  cutscenes/
    hokage_rock_establishing.png
    village_gate_establishing.png
```

### 4.4 Proposed `data/visuals/units.json` Schema
Currently, `UnitData.palette` is the *only* visual hook, and both `BattleController._make_unit_sprite()` and `OverworldScene` draw flat `ColorRect`s from it. A small new data file would let `DataRegistry` resolve real textures without touching every unit JSON:

```json
{
  "naruto": {
    "overworld_sprite": "res://assets/sprites/units/overworld/naruto.png",
    "battle_sprite": "res://assets/sprites/units/battle/naruto.png",
    "battle_sprite_promoted": "res://assets/sprites/units/battle/naruto_sage.png"
  },
  "sasuke": {
    "overworld_sprite": "res://assets/sprites/units/overworld/sasuke.png",
    "battle_sprite": "res://assets/sprites/units/battle/sasuke.png"
  }
}
```
Fallback rule: if a unit has no entry (or the engine fails to load the texture), fall back to the current `ColorRect` palette-block rendering — this keeps the game playable while art rolls out incrementally, batch by batch.

---

## 5. Architecture Gap: Overworld Map Scale

This is the single biggest structural finding from this review, and it affects how Section 2.3's reference art gets used.

**Current state:** all three existing maps (`konoha.json`, `training_grounds.json`, `forest_of_death.json`) are **exactly 10×15 tiles** — at `CELL=16px`, that's precisely `240×160`, i.e. **one full screen, no more**. There is no `Camera2D` anywhere in the project and no scrolling logic. `konoha.json` currently has only 4 NPCs and the four tile types `# (wall) , (grass) ~ (water) <floor>`.

**The new reference art** (Section 2.3) all depicts a **multi-building village** — Hokage Tower, Academy, Hospital, Ichiraku, shops, residential district, bridges, a river loop — clearly more than one 10×15 screen's worth of content.

**Three ways to reconcile this** (final coder's call):

1. **Expand `konoha.json` to a larger grid + add a `Camera2D`** that follows the player, with the viewport acting as a window into the bigger map. Most faithful to the reference art and to Pokémon D/P itself, but is a real scope addition (camera/scroll logic doesn't exist yet).
2. **Keep the one-screen-per-map pattern**, but split "Konoha" into several connected single-screen maps via the existing `warps` mechanism (e.g., `konoha_square.json`, `konoha_market.json`, `konoha_academy.json`, `konoha_residential.json`) — each one screen, stitched together like classic GBA "Route" transitions. Zero new engine code; just more map JSON files plus tile art.
3. **Hybrid:** keep the hub small and D/P-screen-sized for now (ship Phase 2 visuals on the current architecture), and treat full-map scrolling as a **Phase 3 engine task** once the art pipeline is proven on Batch 1/2 characters.

**Recommendation for sequencing:** start with **Option 2 or 3** so visual progress isn't blocked on new camera/scrolling engine work, and revisit Option 1 once the character-art pipeline (the higher-priority ask) is flowing.

---

## 6. Story-Accuracy QA Flags

Per the "no detail too small, verify everything" directive, two things from Wave 1 are worth a deliberate decision rather than a silent guess:

### 6.1 Sasuke's Outfit — Genin Blue vs. Hebi-Era Purple
The delivered `sasuke.jpg` reads as a **lavender/purple top with a cream sash/rope-belt**. Canon Genin-era Sasuke (Part I, matching `sasuke.json`) wears a **navy-blue high-collared shirt with white arm warmers** (confirmed in the Wave 1 design research). However, **post-timeskip "Hebi" era Sasuke** (after defecting to Orochimaru) wears a **purple/lavender top with a rope-style sash** — which is much closer to what's in the delivered art.

**Two clean resolutions:**
- (a) Treat the delivered sprite as **`sasuke_cm2.json`'s promoted-form art** (Hebi-era look fits a "promoted/evolved" Sasuke thematically), and commission/adjust a separate navy-blue sprite for base `sasuke.json`, **or**
- (b) Keep the delivered sprite as base Sasuke and treat the purple tone as an intentional stylization for this game's universe (the "suggestions only" framing gives full license to do this).

Either is fine — flagging so it's a **choice**, not an accidental mismatch once Sasuke's promoted form gets its own sprite later.

### 6.2 Naruto's "Tailed Beast Cloak" Art vs. `naruto_sage.json`
`naruto_battle_tailedbeast_cloak.png` depicts Naruto **on all fours, wrapped in a red multi-tailed chakra cloak** — this is the canon **Tailed Beast Cloak / Kurama-Chakra Mode**. The Wave 1 design research confirmed that canon **Sage Mode** (which is what `naruto.json`'s promotion path currently targets via `naruto_sage.json`) looks visually like **unchanged clothing + orange pigment markings around the eyes** — no cloak, no fox form.

**This is not a mistake to fix so much as a fork in the road:**
- (a) Use the Tailed-Beast-Cloak art for a **higher-tier "sequel" promotion** beyond `naruto_sage` (the original design doc already flagged "KCM/Six Paths" as sequel-only content) — store it now, use it later, **or**
- (b) Re-scope `naruto_sage.json`'s promoted sprite to actually be the Tailed Beast Cloak art, and treat "Sage Mode" as a flavor name for this game's version of Naruto's strongest Part-1-available form (deviating intentionally from strict canon for gameplay impact).

Both are legitimate; flagging because it changes what art is needed for the very next Naruto-related sprite task.

---

## 7. Prioritized Task List for Final Coder

In suggested order — each is independently scoped so they can be picked up by different sub-agents in parallel where marked.

1. **[Engine] Build the `data/visuals/units.json` pipeline** (Section 4.4): `DataRegistry` loader + fallback-to-`ColorRect` logic in both `BattleController._make_unit_sprite()` and `OverworldScene._build_player()/_build_npcs()`. This is the on-ramp every future sprite batch plugs into — do this first.
2. **[Art-Pipeline, parallelizable]** Clean/re-export the 12 Wave-1 character portraits as indexed PNGs at the agreed overworld size (Section 4.1), preferring `konoha11_roster_sheet.png` as source. Wire each into `data/visuals/units.json` for: Naruto, Sasuke, Sakura, Rock Lee, Hinata, Shikamaru, Choji, Ino, Kiba, Shino, Tenten, Neji.
3. **[Art-Pipeline, parallelizable]** Process the 4 Naruto battle-pose references into actual battle-sprite assets at the agreed battle size, resolving QA flag 6.2 first so the promoted-form asset lands in the right slot.
4. **[Decision + Map work]** Resolve the Section 5 architecture question, then build out the Konoha hub map(s) using the Section 2.3 references as the layout/mood target — new tiles for buildings, paths, bridges, water, plus whichever NPCs/warps the chosen option needs.
5. **[Small feature]** AI personality variance: differentiate `BattleAI` scoring per character archetype (e.g., aggressive glass-cannons prioritize damage, support units prioritize status/heal) — low-risk addition to the existing scorer.
6. **[Small feature]** Quest/objective log UI surfaced from `story_flags` — a new page in `MenuSystem` listing active/completed story beats.
7. **[Resolve 6.1]** Decide and execute the Sasuke outfit fork — affects whether `sasuke.json` needs a second sprite commissioned.
8. **Batch 2 character art**: Kakashi, Gaara, Jiraiya, Tsunade, Orochimaru (per Section 3) — research already exists for Kakashi and Gaara from Wave 1.

---

## 8. Open Decisions Needing Sign-Off

Quick list of the yes/no calls embedded above, gathered in one place:

- [ ] Map architecture: expand-with-camera vs. multi-screen-via-warps vs. defer to Phase 3 (Section 5)
- [ ] Sasuke sprite: Hebi-purple as base, or as promoted form with a new navy base sprite (Section 6.1)
- [ ] Naruto Tailed-Beast-Cloak art: save for a future sequel-tier form, or repurpose as `naruto_sage`'s promoted sprite now (Section 6.2)
- [ ] Confirm overworld sprite size (16×32 suggested) and battle sprite size (80×80 suggested) before the art pipeline locks in dimensions

---

## 9. What Shipped This Round (Recap)

- ✅ Battle-screen input freeze — root-caused (missing `_input()` handler on `BattleController`) and fixed.
- ✅ Wave 1 character/environment art received, reviewed, and reorganized into a proposed `assets/` tree (see attached zip).
- ✅ Engine status corrected — most "missing" features already exist; real gaps are AI personality and a quest log.
- ✅ Roster coverage tracked: 12/31 units have first-pass overworld art.
- ✅ Two story-accuracy questions flagged for explicit sign-off rather than silent assumptions.
