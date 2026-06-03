// Orchestrates the daily ingestion. Called by:
//  - cron at 8:30 AM            → runIngest({ trigger: 'cron' })
//  - startup catch-up           → runIngest({ trigger: 'startup-catchup' })
//  - manual Sync button (route) → runIngest({ trigger: 'manual', force: true })
import { discoverMemoryDirs } from './discovery.js';
import { listIngestibleFiles, readFileSafe } from './reader.js';
import { extract } from './extractor.js';
import { applyFacts, finalizeAggregates } from './applier.js';
import { localDate, claimRun, finishRun, fileUnchanged, recordFile } from './ledger.js';

export async function runIngest({ trigger = 'manual', force = false } = {}) {
  const date = localDate();
  const claimed = await claimRun(date, trigger, force);
  if (!claimed) {
    return { skipped: true, reason: 'already-ran-today', date };
  }

  let filesRead = 0;
  let factsApplied = 0;
  let errorCount = 0;
  let touchedFiles = false;

  try {
    const dirs = discoverMemoryDirs();
    if (!dirs.length) {
      await finishRun(date, { status: 'no_source', message: 'No Claude memory directory found. Set CLAUDE_MEMORY_DIR.' });
      return { success: true, updatesApplied: 0, filesRead: 0, noSource: true, date };
    }

    for (const { dir } of dirs) {
      for (const filePath of listIngestibleFiles(dir)) {
        try {
          const { text, hash, mtime, size } = await readFileSafe(filePath);
          if (!force && (await fileUnchanged(filePath, mtime, size, hash))) continue;

          const sourceDate = mtime.slice(0, 10);
          const facts = await extract(text, filePath, sourceDate);
          const applied = await applyFacts(facts, filePath);

          factsApplied += applied;
          filesRead++;
          touchedFiles = true;
          await recordFile(filePath, mtime, size, hash);
        } catch (err) {
          errorCount++;
          console.warn(`Ingest skipped file ${filePath}:`, err.message);
        }
      }
    }

    // Re-derive aggregates + snapshot even if no new files (keeps snapshot fresh).
    await finalizeAggregates();

    await finishRun(date, {
      status: errorCount && !touchedFiles ? 'error' : 'success',
      filesRead, factsApplied, errorCount,
      message: `Ingested ${factsApplied} new facts from ${filesRead} file(s).`,
    });

    return { success: true, updatesApplied: factsApplied, filesRead, errorCount, date };
  } catch (err) {
    console.error('Ingest run failed:', err);
    await finishRun(date, { status: 'error', filesRead, factsApplied, errorCount, message: err.message });
    return { success: false, error: err.message, date };
  }
}
