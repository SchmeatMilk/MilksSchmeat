# Handoff — Game Preview Startup (Godot)

## Where the game lives
Branch `claude/naruto-shinobi-chronicles-ptmcjl` (PR #3) → folder `naruto-shinobi-chronicles/`.
The file Godot opens is `naruto-shinobi-chronicles/project.godot`. Nothing is on `main` yet.

## How to start a preview

**Desktop (simplest):**
1. Install Godot 4.3 (standard build) from godotengine.org.
2. Clone/download the branch, open Godot → Import → select `naruto-shinobi-chronicles/project.godot`.
3. Press F5 (Play). Controls: arrows move, Enter confirm/interact, Esc cancel/pause menu.

**Android phone (no PC):**
1. Sideload the Godot 4.3 Android *editor* APK (godotengine.org/download/android).
2. Download the branch ZIP to the phone, extract, Import the `naruto-shinobi-chronicles` folder, press Play.
3. ⚠ Blocker: the game is keyboard/gamepad-driven — touch controls are NOT implemented yet.
   A Bluetooth gamepad works today; on-screen D-pad + A/B buttons are the next task.

## Where we are right now
- Game boots clean and is playable: title → starter pick → Konoha overworld → wild battles →
  catch/level/promote → Forest of Death boss. Verified headless: 63/63 engine tests +
  end-to-end smoke test pass; CI green on the PR.
- No real art/audio yet (placeholder color blocks + synth blips).
- Phone startup has not been attempted yet by the user; the only known blocker is touch input.
- Android export preset exists but has `use_gradle_build=true` — untick "Use Gradle Build"
  in the export preset for a quick APK, or flip the default in `export_presets.cfg`.

## Next step
Add touch controls (on-screen D-pad + confirm/cancel buttons) so the Android editor preview
is playable without a gamepad.
