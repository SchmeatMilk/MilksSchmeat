// Run-ledger + file-ledger. The run-ledger makes the daily job idempotent and
// enables catch-up: a run is "claimed" per local date, so a missed 8:30 (PC was
// off) ingests on the next app open, and repeated ticks no-op.
import { run, get } from '../db.js';

export function localDate(d = new Date()) {
  // Local YYYY-MM-DD (not UTC) so the day-key matches the user's calendar.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Try to claim today's run. Returns true if THIS caller won the claim and should
// ingest. A manual Sync passes force=true to ingest regardless (idempotency is
// still guaranteed downstream by extracted_facts.factKey).
export async function claimRun(date, trigger, force = false) {
  const res = await run(
    `INSERT INTO ingest_runs (run_date, trigger, status)
     VALUES (?, ?, 'running')
     ON CONFLICT(run_date) DO NOTHING`,
    [date, trigger]
  );
  if (res.changes === 1) return true;       // we claimed it
  if (force) {
    // Manual Sync: reopen the day's row so the run is recorded as re-run.
    await run(
      `UPDATE ingest_runs SET status='running', trigger=?, startedAt=CURRENT_TIMESTAMP WHERE run_date=?`,
      [trigger, date]
    );
    return true;
  }
  return false;
}

export async function finishRun(date, { status, filesRead, factsApplied, errorCount, message }) {
  await run(
    `UPDATE ingest_runs
     SET status=?, filesRead=?, factsApplied=?, errorCount=?, message=?, finishedAt=CURRENT_TIMESTAMP
     WHERE run_date=?`,
    [status, filesRead || 0, factsApplied || 0, errorCount || 0, message || '', date]
  );
}

// File-ledger: has this exact file (by mtime+size+hash) already been processed?
export async function fileUnchanged(filePath, mtime, size, hash) {
  const row = await get('SELECT mtime, size, hash FROM ingest_files WHERE filePath=?', [filePath]);
  return !!row && row.mtime === mtime && row.size === size && row.hash === hash;
}

export async function recordFile(filePath, mtime, size, hash) {
  await run(
    `INSERT INTO ingest_files (filePath, mtime, size, hash, lastSeenAt)
     VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(filePath) DO UPDATE SET
       mtime=excluded.mtime, size=excluded.size, hash=excluded.hash, lastSeenAt=CURRENT_TIMESTAMP`,
    [filePath, mtime, size, hash]
  );
}
