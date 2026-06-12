# Project Memory

## Repo layout (two independent projects)
- **`income-hunt/`** — the Income Hunt tracking dashboard (Node/Express backend + React frontend). Everything below applies to this project.
- **`naruto-shinobi-chronicles/`** — Godot 4.3 GBA-style RPG demake. Has its own README with architecture rules; key one: `BattleEngine` stays pure (no scene/autoload access, all RNG through `BattleState.rng`).

# Income Hunt — Project Memory

## Design principles

### Checklist-first UX (user preference — important)
The user loves checklists. Whenever a widget surfaces a **list of items**, prefer the
checklist pattern over plain lists or dropdowns:
- Visible status per row (☐ / ✅), one tap to complete, completion is the "win" state.
- Apply this to: reminders, milestone badges (earned = ✅ with date, unearned = ☐ with
  the next threshold so the user sees what's next), expense category pickers (tappable
  chips, not dropdowns), and Uber "drive this window" intents.
- Empty states should point at the single next action ("Your first badge is one log away 🌱").

### Encouragement, never alarm
Behind-pace and missed-day states use **amber**, never red. Framing is loss-aversion but
supportive ("You're on a 5-day streak. One log keeps it alive.") — coach, not scold.

### Honesty over vanity metrics
Only display figures we can actually derive from logged data. Don't fabricate a
"net of mileage" rate when per-shift mileage isn't tracked — show gross $/hr (the real,
derivable number) instead.

## Architecture (do not rebuild)
- **DB:** SQLite via Promise helpers `run` / `get` / `all` in `income-hunt/backend/db.js`.
- **Idempotent fact log:** extracted facts deduped by `factKey`; experiment totals are always
  **re-derived** from the fact table in `finalizeAggregates()`, never incremented in place.
- **`finalizeAggregates()`** (`income-hunt/backend/ingest/applier.js`) is the single choke point — it
  recomputes path totals + expenses, applies text facts, writes a snapshot, awards
  milestones, and reverse-syncs the status file. Cron, manual Sync, and every CRUD route
  call it, so all aggregates and side effects stay consistent.
- **Reverse sync:** `income-hunt/backend/ingest/exporter.js` atomically writes `INCOME_HUNT_STATUS.md`
  (`.tmp` + rename) into each discovered memory dir so the user's Claude Desktop assistant
  always has fresh context. The ingest reader skips that filename to prevent a re-ingest loop.
- **Frontend widgets:** use the `Widget` shell + `theme.colors` + `AnimatedNumber` + `ChartCard`;
  self-poll with `useEffect` + `axios.get` + `setInterval` + silent `.catch(() => {})`.
- **Dashboard layout:** `react-grid-layout` with `lg`/`md`/`sm` breakpoints. The details toggle
  swaps between `layoutsFull` (all widgets) and `layoutsFocus` (6 primary widgets); detail
  widgets are conditionally rendered so RGL children always match the active layout.

## Build / run
- Frontend: `cd income-hunt/frontend && CI=false npx react-scripts build`
- Backend: `cd income-hunt/backend && node server.js` (port 5000)
- Game: `godot --path naruto-shinobi-chronicles` (Godot 4.3); tests: `godot --headless -s tests/run_tests.gd`
