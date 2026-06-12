# MilksSchmeat

For the Milk and Schmeat. Two independent projects live here:

## [`income-hunt/`](income-hunt/)
Income Hunt — a tracking dashboard for 4 parallel income paths.
Node/Express + SQLite backend, React frontend.

```bash
cd income-hunt
npm run install-all
npm run dev          # backend :5000 + frontend dev server
```

See [`income-hunt/SETUP.md`](income-hunt/SETUP.md) for full setup and
[`income-hunt/DESIGN_VISION.md`](income-hunt/DESIGN_VISION.md) for the product vision.

## [`naruto-shinobi-chronicles/`](naruto-shinobi-chronicles/)
Naruto: Shinobi Chronicles — a GBA FireRed-style turn-based RPG / ninja
collector demake built in Godot 4.3.

```bash
godot --path naruto-shinobi-chronicles            # play
cd naruto-shinobi-chronicles
godot --headless -s tests/run_tests.gd            # battle engine test suite
```

See [`naruto-shinobi-chronicles/README.md`](naruto-shinobi-chronicles/README.md)
for systems, architecture rules, and the roadmap.
