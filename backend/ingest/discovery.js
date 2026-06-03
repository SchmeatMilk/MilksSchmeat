// Locate Claude Desktop memory directories WITHOUT hardcoding session GUIDs.
// Research findings handled here:
//  - Memory lives in a dir literally named "memory" under a "spaces/<id>" segment.
//  - The Win32 installer path is %AppData%\Roaming\Claude\...
//  - The Microsoft Store (MSIX) build virtualizes it to
//    %LocalAppData%\Packages\Claude_*\LocalCache\Roaming\Claude\...
//  - The session container dir was renamed across versions, so we glob, not assume.
import fs from 'fs';
import path from 'path';
import os from 'os';

const MAX_DEPTH = 8;
// Only descend into dirs whose names look relevant — keeps the walk fast and
// avoids scanning unrelated AppData subtrees.
const ALLOWED_SEGMENTS = /claude|sessions|spaces|memory|localcache|roaming|packages/i;

function candidateBases() {
  const bases = [];
  const appData = process.env.APPDATA;                 // Win32: ...\Roaming
  const localAppData = process.env.LOCALAPPDATA;       // MSIX root

  if (appData) bases.push(path.join(appData, 'Claude'));

  if (localAppData) {
    const pkgRoot = path.join(localAppData, 'Packages');
    // Glob Claude_* package families → LocalCache\Roaming\Claude
    try {
      for (const entry of fs.readdirSync(pkgRoot)) {
        if (/^Claude_/i.test(entry)) {
          bases.push(path.join(pkgRoot, entry, 'LocalCache', 'Roaming', 'Claude'));
        }
      }
    } catch { /* Packages may not exist on non-MSIX installs */ }
  }

  // Cross-platform dev fallbacks
  bases.push(path.join(os.homedir(), '.config', 'Claude'));
  bases.push(path.join(os.homedir(), 'Library', 'Application Support', 'Claude'));

  return bases.filter((b) => {
    try { return fs.existsSync(b); } catch { return false; }
  });
}

// Bounded, prefix-filtered walk collecting every dir named "memory" that sits
// under a "spaces" segment. Each readdir is isolated so an EPERM subtree can't
// abort discovery.
function findMemoryDirs(base) {
  const found = [];
  function walk(dir, depth, underSpaces) {
    if (depth > MAX_DEPTH) return;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch { return; }
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const full = path.join(dir, e.name);
      if (e.name === 'memory' && underSpaces) {
        found.push(full);
        continue;
      }
      if (ALLOWED_SEGMENTS.test(e.name) || underSpaces) {
        walk(full, depth + 1, underSpaces || e.name === 'spaces');
      }
    }
  }
  walk(base, 0, false);
  return found;
}

function lastActivity(dir) {
  let newest = 0;
  try {
    for (const f of fs.readdirSync(dir)) {
      if (!/\.(md|json)$/i.test(f) || /\.tmp$/i.test(f)) continue;
      try {
        const st = fs.statSync(path.join(dir, f));
        if (st.mtimeMs > newest) newest = st.mtimeMs;
      } catch { /* skip */ }
    }
  } catch { /* skip */ }
  return newest;
}

// Returns [{ dir, lastActivity }] newest-first. Manual override wins.
export function discoverMemoryDirs() {
  const override = process.env.CLAUDE_MEMORY_DIR;
  if (override) {
    try {
      if (fs.existsSync(override)) {
        return [{ dir: override, lastActivity: lastActivity(override) }];
      }
      console.warn('CLAUDE_MEMORY_DIR set but does not exist:', override);
    } catch { /* fall through to auto-discovery */ }
  }

  const dirs = new Set();
  for (const base of candidateBases()) {
    for (const d of findMemoryDirs(base)) dirs.add(d);
  }

  return [...dirs]
    .map((dir) => ({ dir, lastActivity: lastActivity(dir) }))
    .sort((a, b) => b.lastActivity - a.lastActivity);
}
