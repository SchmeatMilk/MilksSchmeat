// Safe file reading for files Claude Desktop may be writing concurrently.
//  - Skip *.tmp / *.json.tmp (incomplete, per research).
//  - Retry on Windows transient locks (EBUSY/EPERM/EACCES) with backoff.
//  - JSON parsed in try/catch (a torn read surfaces as SyntaxError → retry).
//  - Content hash + mtime/size for the file-ledger.
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const TRANSIENT = new Set(['EBUSY', 'EPERM', 'EACCES']);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function listIngestibleFiles(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .filter((n) => {
      // Skip .tmp files and the auto-generated status file
      if (/\.tmp$/i.test(n)) return false;
      if (n === 'INCOME_HUNT_STATUS.md') return false;
      return /\.(md|json)$/i.test(n);
    })
    .map((n) => path.join(dir, n));
}

export async function readFileSafe(filePath, retries = 3) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const st = fs.statSync(filePath);
      const text = fs.readFileSync(filePath, 'utf8');
      // For JSON, validate it parses; a partial write throws → treat as transient.
      if (/\.json$/i.test(filePath)) {
        JSON.parse(text);
      }
      const hash = crypto.createHash('sha1').update(text).digest('hex');
      return { text, hash, mtime: st.mtime.toISOString(), size: st.size };
    } catch (err) {
      lastErr = err;
      const transient = TRANSIENT.has(err.code) || err instanceof SyntaxError;
      if (!transient || attempt === retries) break;
      await sleep(100 * Math.pow(3, attempt)); // 100, 300, 900ms
    }
  }
  throw lastErr;
}
