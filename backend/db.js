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
