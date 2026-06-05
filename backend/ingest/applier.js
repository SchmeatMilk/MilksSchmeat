// Apply extracted facts idempotently. Facts are deduped by factKey (value +
// source span); experiment totals are RE-DERIVED from the fact table on every
// run (never incremented), so cron + manual Sync + catch-up can't double-count.
import crypto from 'crypto';
import { run, get, all } from '../db.js';

const PATHS = ['ai-consulting', 'ai-tools', 'online-work', 'apps', 'uber-delivery'];

function sha1(s) {
  return crypto.createHash('sha1').update(s).digest('hex');
}

function monthPrefix(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Insert one fact; returns true if it was newly inserted (not a dedup hit).
async function insertFact(fact, sourceFile) {
  const factKey = `${fact.value ?? fact.textValue}|${sourceFile}|${sha1(fact.sourceQuote || '')}`;
  const id = sha1(factKey);
  const res = await run(
    `INSERT INTO extracted_facts
       (id, factKey, factType, path, value, textValue, sourceFile, sourceQuote, sourceDate, confidence, method)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(factKey) DO NOTHING`,
    [id, factKey, fact.factType, fact.path, fact.value, fact.textValue,
     sourceFile, fact.sourceQuote, fact.sourceDate, fact.confidence, fact.method]
  );
  return { newlyInserted: res.changes === 1, id };
}

async function primaryExperiment(path) {
  return get('SELECT id FROM experiments WHERE path=? ORDER BY createdAt LIMIT 1', [path]);
}

// Re-derive per-path revenue/hours from facts + manual uber shifts → primary experiment.
async function recomputePathTotals() {
  const month = monthPrefix();
  for (const path of PATHS) {
    const exp = await primaryExperiment(path);
    if (!exp) continue;

    const revAll = await get(
      `SELECT COALESCE(SUM(value),0) AS v FROM extracted_facts
       WHERE path=? AND factType IN ('revenue','uber')`, [path]);
    const revMonth = await get(
      `SELECT COALESCE(SUM(value),0) AS v FROM extracted_facts
       WHERE path=? AND factType IN ('revenue','uber') AND substr(sourceDate,1,7)=?`, [path, month]);
    const hoursAll = await get(
      `SELECT COALESCE(SUM(value),0) AS v FROM extracted_facts
       WHERE path=? AND factType='hours'`, [path]);

    let cumulative = revAll.v;
    let thisMonth = revMonth.v;
    let hours = hoursAll.v;

    if (path === 'uber-delivery') {
      const uShift = await get(
        `SELECT COALESCE(SUM(earnings),0) AS e, COALESCE(SUM(hours),0) AS h FROM uber_shifts WHERE source='manual'`);
      const uShiftMonth = await get(
        `SELECT COALESCE(SUM(earnings),0) AS e FROM uber_shifts WHERE source='manual' AND substr(date,1,7)=?`, [month]);
      cumulative += uShift.e;
      thisMonth += uShiftMonth.e;
      hours += uShift.h;
    }

    await run(
      `UPDATE experiments SET revenueCumulative=?, revenueThisMonth=?, hoursInvested=?, lastActivityDate=? WHERE id=?`,
      [cumulative, thisMonth, hours, new Date().toISOString(), exp.id]
    );
  }
}

// Apply the most recent status / nextAction / learnings text per path.
async function applyTextFacts() {
  for (const path of PATHS) {
    const exp = await primaryExperiment(path);
    if (!exp) continue;

    const status = await get(
      `SELECT textValue FROM extracted_facts WHERE path=? AND factType='status'
       ORDER BY createdAt DESC LIMIT 1`, [path]);
    if (status?.textValue) {
      await run(`UPDATE experiments SET status=? WHERE id=?`, [status.textValue, exp.id]);
    }

    const next = await get(
      `SELECT textValue FROM extracted_facts WHERE path=? AND factType='nextAction'
       ORDER BY createdAt DESC LIMIT 1`, [path]);
    if (next?.textValue) {
      await run(`UPDATE experiments SET nextAction=? WHERE id=?`, [next.textValue, exp.id]);
    }

    const learnings = await all(
      `SELECT DISTINCT textValue FROM extracted_facts WHERE path=? AND factType='learning'
       ORDER BY createdAt DESC LIMIT 8`, [path]);
    if (learnings.length) {
      await run(`UPDATE experiments SET learnings=? WHERE id=?`,
        [JSON.stringify(learnings.map((l) => l.textValue)), exp.id]);
    }
  }
}

// Ingested Uber earnings → an uber_shifts row (idempotent by deterministic id).
async function applyUberShifts(uberFactIds) {
  for (const { id, fact } of uberFactIds) {
    await run(
      `INSERT INTO uber_shifts (id, date, earnings, hours, trips, source, note)
       VALUES (?, ?, ?, 0, 0, 'ingest', ?)
       ON CONFLICT(id) DO UPDATE SET earnings=excluded.earnings, date=excluded.date`,
      [id, fact.sourceDate, fact.value || 0, (fact.sourceQuote || '').slice(0, 140)]
    );
  }
}

async function writeSnapshot() {
  const today = new Date();
  const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const totals = await get(
    `SELECT COALESCE(SUM(revenueCumulative),0) AS cum, COALESCE(SUM(revenueThisMonth),0) AS month FROM experiments`);
  await run(
    `INSERT INTO revenue_snapshots (date, cumulativeRevenue, monthRevenue)
     VALUES (?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET cumulativeRevenue=excluded.cumulativeRevenue, monthRevenue=excluded.monthRevenue`,
    [date, totals.cum, totals.month]
  );
}

// Apply a batch of facts from one file. Returns count of newly-applied facts.
async function recomputePathExpenses() {
  for (const path of PATHS) {
    const exp = await primaryExperiment(path);
    if (!exp) continue;

    const expenseData = await get(
      `SELECT COALESCE(SUM(amount),0) AS v FROM expenses
       WHERE path=? AND deductible=1`, [path]);
    const totalExpenses = expenseData?.v || 0;

    await run(`UPDATE experiments SET totalExpenses=? WHERE id=?`, [totalExpenses, exp.id]);
  }
}

async function applyExpenses() {
  const expenseFacts = await all(
    `SELECT id FROM extracted_facts WHERE factType='expense' AND id NOT IN (SELECT id FROM expenses)`
  );

  for (const fact of expenseFacts) {
    const expFact = await get(`SELECT * FROM extracted_facts WHERE id=?`, [fact.id]);

    // Use the deterministic fact id as the expense id so re-running finalize is
    // idempotent — the NOT IN check above and INSERT OR IGNORE both rely on this.
    await run(
      `INSERT OR IGNORE INTO expenses (id, date, amount, category, path, source, deductible, createdAt)
       VALUES (?, ?, ?, ?, ?, 'ingest', 1, CURRENT_TIMESTAMP)`,
      [expFact.id, expFact.sourceDate, expFact.value, expFact.textValue, expFact.path]
    );
  }
}

async function applyTasks() {
  const taskFacts = await all(
    `SELECT id FROM extracted_facts WHERE factType='task' AND id NOT IN (SELECT id FROM tasks)`
  );

  for (const fact of taskFacts) {
    const taskFact = await get(`SELECT * FROM extracted_facts WHERE id=?`, [fact.id]);
    const today = new Date().toISOString().split('T')[0];

    await run(
      `INSERT OR IGNORE INTO tasks (id, date, taskName, priority, linkedPath, status, createdAt)
       VALUES (?, ?, ?, 'should-do', ?, 'not-started', CURRENT_TIMESTAMP)`,
      [taskFact.id, taskFact.sourceDate || today, taskFact.textValue, taskFact.path]
    );
  }
}

export async function applyFacts(facts, sourceFile) {
  let applied = 0;
  const uberShiftRows = [];
  for (const fact of facts) {
    const { newlyInserted, id } = await insertFact(fact, sourceFile);
    if (newlyInserted) applied++;
    if (fact.factType === 'uber' && fact.value) uberShiftRows.push({ id, fact });
  }
  await applyUberShifts(uberShiftRows);
  return applied;
}

// Called once per run after all files applied — derive aggregates + snapshot.
export async function finalizeAggregates() {
  await recomputePathTotals();
  // applyExpenses() must run BEFORE recomputePathExpenses() so the freshly
  // ingested expense rows are summed into experiment.totalExpenses this pass,
  // not one sync later.
  await applyExpenses();
  await recomputePathExpenses();
  await applyTextFacts();
  await applyTasks();
  await writeSnapshot();

  // Import dynamically to avoid circular dependency at load time
  const { checkMilestones } = await import('./milestones.js');
  const { exportDashboardStatus } = await import('./exporter.js');

  await checkMilestones();
  await exportDashboardStatus();
}
