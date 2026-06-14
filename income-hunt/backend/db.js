import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../goals.db');
export const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('Database connection error:', err);
  else console.log('✅ Connected to SQLite database');
});

// ---- Promise helpers (the rest of the app uses the callback API; ingest/ prefers await) ----
export function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ changes: this.changes, lastID: this.lastID });
    });
  });
}

export function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
}

export function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])));
  });
}

export function initializeDatabase() {
  db.serialize(() => {
    // Experiments table
    db.run(`
      CREATE TABLE IF NOT EXISTS experiments (
        id TEXT PRIMARY KEY,
        path TEXT NOT NULL,
        name TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        revenueThisMonth REAL DEFAULT 0,
        revenueCumulative REAL DEFAULT 0,
        hoursInvested REAL DEFAULT 0,
        totalExpenses REAL DEFAULT 0,
        lastActivityDate TEXT,
        nextAction TEXT,
        learnings TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        completedAt TEXT
      )
    `);

    // Tasks table
    db.run(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        taskName TEXT NOT NULL,
        priority TEXT DEFAULT 'should-do',
        status TEXT DEFAULT 'not-started',
        hoursSpent REAL DEFAULT 0,
        linkedPath TEXT,
        notes TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Daily check-ins table
    db.run(`
      CREATE TABLE IF NOT EXISTS checkins (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL UNIQUE,
        summary TEXT,
        mood TEXT,
        nextDayFocus TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ---- Phase 2: ingestion + tracking tables ----

    // Run ledger: one claimed row per local date. Prevents double-ingest and
    // enables catch-up when the 8:30 job was missed (PC asleep/off).
    db.run(`
      CREATE TABLE IF NOT EXISTS ingest_runs (
        run_date TEXT PRIMARY KEY,
        trigger TEXT,
        status TEXT DEFAULT 'running',
        filesRead INTEGER DEFAULT 0,
        factsApplied INTEGER DEFAULT 0,
        errorCount INTEGER DEFAULT 0,
        message TEXT,
        startedAt TEXT DEFAULT CURRENT_TIMESTAMP,
        finishedAt TEXT
      )
    `);

    // File ledger: skip unchanged files; detect rewrites via hash.
    db.run(`
      CREATE TABLE IF NOT EXISTS ingest_files (
        filePath TEXT PRIMARY KEY,
        mtime TEXT,
        size INTEGER,
        hash TEXT,
        lastSeenAt TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Extracted facts with provenance. factKey is unique on value+source span,
    // so re-runs (cron + manual Sync) can never double-count.
    db.run(`
      CREATE TABLE IF NOT EXISTS extracted_facts (
        id TEXT PRIMARY KEY,
        factKey TEXT UNIQUE,
        factType TEXT,
        path TEXT,
        experimentId TEXT,
        value REAL,
        textValue TEXT,
        sourceFile TEXT,
        sourceQuote TEXT,
        sourceDate TEXT,
        confidence REAL,
        method TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Daily revenue snapshot → real history for the burn-up chart.
    db.run(`
      CREATE TABLE IF NOT EXISTS revenue_snapshots (
        date TEXT PRIMARY KEY,
        cumulativeRevenue REAL DEFAULT 0,
        monthRevenue REAL DEFAULT 0,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Uber delivery shifts — quick manual entry + auto-ingested mentions.
    db.run(`
      CREATE TABLE IF NOT EXISTS uber_shifts (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        earnings REAL DEFAULT 0,
        hours REAL DEFAULT 0,
        trips INTEGER DEFAULT 0,
        startHour INTEGER,
        source TEXT DEFAULT 'manual',
        note TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ---- Phase 3: Power features (expenses, volatility, milestones) ----

    // Expense tracking — categorized spending with deduction flags.
    db.run(`
      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        amount REAL NOT NULL,
        category TEXT NOT NULL,
        path TEXT,
        note TEXT,
        source TEXT DEFAULT 'manual',
        deductible INTEGER DEFAULT 1,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_expenses_path ON expenses(path)`);

    // Earned milestones — one row per badge, ever. Used to award exactly once and for Hall of Fame display.
    db.run(`
      CREATE TABLE IF NOT EXISTS earned_milestones (
        id TEXT PRIMARY KEY,
        milestoneType TEXT NOT NULL,
        milestoneValue REAL,
        emoji TEXT,
        message TEXT,
        earnedAt TEXT DEFAULT CURRENT_TIMESTAMP,
        seenAt TEXT
      )
    `);

    console.log('✅ Database tables initialized');
  });
}

export function seedDatabase() {
  db.all("SELECT COUNT(*) as count FROM experiments", (err, rows) => {
    if (rows[0].count === 0) {
      const experiments = [
        {
          id: 'exp-1',
          path: 'ai-consulting',
          name: 'First AI consulting project',
          status: 'active',
          nextAction: 'Reach out to 5 potential clients',
          learnings: JSON.stringify([])
        },
        {
          id: 'exp-2',
          path: 'ai-tools',
          name: 'Build AI tool',
          status: 'active',
          nextAction: 'Complete MVP',
          learnings: JSON.stringify([])
        },
        {
          id: 'exp-3',
          path: 'online-work',
          name: 'Content creation',
          status: 'active',
          nextAction: 'Publish first post',
          learnings: JSON.stringify([])
        },
        {
          id: 'exp-4',
          path: 'apps',
          name: 'Build first app',
          status: 'active',
          nextAction: 'Design mockups',
          learnings: JSON.stringify([])
        },
        {
          id: 'exp-5',
          path: 'uber-delivery',
          name: 'Uber delivery shifts',
          status: 'active',
          nextAction: 'Log this week\'s shifts',
          learnings: JSON.stringify([])
        }
      ];

      experiments.forEach((exp) => {
        db.run(
          `INSERT INTO experiments (id, path, name, status, nextAction, learnings)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [exp.id, exp.path, exp.name, exp.status, exp.nextAction, exp.learnings]
        );
      });

      console.log('✅ Sample experiments added');
    }
  });
}
