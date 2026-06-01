import { db } from './db.js';
import { v4 as uuidv4 } from 'crypto';

// EXPERIMENTS
export function getExperiments(req, res) {
  db.all('SELECT * FROM experiments ORDER BY path, createdAt', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(row => ({
      ...row,
      learnings: row.learnings ? JSON.parse(row.learnings) : []
    })));
  });
}

export function createExperiment(req, res) {
  const { path, name, nextAction } = req.body;
  const id = `exp-${Date.now()}`;
  const now = new Date().toISOString();

  db.run(
    `INSERT INTO experiments (id, path, name, status, nextAction, createdAt, learnings)
     VALUES (?, ?, ?, 'active', ?, ?, ?)`,
    [id, path, name, nextAction || '', now, JSON.stringify([])],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id, path, name, status: 'active', nextAction, learnings: [] });
    }
  );
}

export function updateExperiment(req, res) {
  const { id } = req.params;
  const { revenueThisMonth, revenueCumulative, hoursInvested, status, nextAction, learnings } = req.body;
  const now = new Date().toISOString();

  db.run(
    `UPDATE experiments
     SET revenueThisMonth = ?, revenueCumulative = ?, hoursInvested = ?, status = ?, nextAction = ?, learnings = ?, lastActivityDate = ?
     WHERE id = ?`,
    [revenueThisMonth, revenueCumulative, hoursInvested, status, nextAction, JSON.stringify(learnings || []), now, id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
}

export function deleteExperiment(req, res) {
  const { id } = req.params;
  db.run('DELETE FROM experiments WHERE id = ?', [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
}

// TASKS
export function getTasksByDate(req, res) {
  const { date } = req.params;
  db.all('SELECT * FROM tasks WHERE date = ? ORDER BY priority DESC, createdAt', [date], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
}

export function createTask(req, res) {
  const { date, taskName, priority, linkedPath } = req.body;
  const id = `task-${Date.now()}`;
  const now = new Date().toISOString();

  db.run(
    `INSERT INTO tasks (id, date, taskName, priority, linkedPath, createdAt, status)
     VALUES (?, ?, ?, ?, ?, ?, 'not-started')`,
    [id, date, taskName, priority || 'should-do', linkedPath || null, now],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id, date, taskName, priority, status: 'not-started' });
    }
  );
}

export function updateTask(req, res) {
  const { id } = req.params;
  const { status, hoursSpent, notes } = req.body;

  db.run(
    `UPDATE tasks SET status = ?, hoursSpent = ?, notes = ? WHERE id = ?`,
    [status, hoursSpent, notes, id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
}

export function deleteTask(req, res) {
  const { id } = req.params;
  db.run('DELETE FROM tasks WHERE id = ?', [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
}

// STATS
export function getStats(req, res) {
  db.all('SELECT path, COUNT(*) as count, SUM(revenueThisMonth) as revenue FROM experiments WHERE status != "completed" GROUP BY path', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    const stats = {
      'ai-consulting': { count: 0, revenue: 0 },
      'ai-tools': { count: 0, revenue: 0 },
      'online-work': { count: 0, revenue: 0 },
      'apps': { count: 0, revenue: 0 }
    };

    (rows || []).forEach(row => {
      stats[row.path] = { count: row.count, revenue: row.revenue || 0 };
    });

    res.json(stats);
  });
}

export function getRevenueSummary(req, res) {
  db.get('SELECT SUM(revenueThisMonth) as thisMonth, SUM(revenueCumulative) as cumulative FROM experiments', (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({
      thisMonth: row?.thisMonth || 0,
      cumulative: row?.cumulative || 0,
      target: 5000,
      progress: ((row?.thisMonth || 0) / 5000) * 100
    });
  });
}

export function getCountdown(req, res) {
  const deadline = new Date('2026-12-01');
  const today = new Date();
  const daysLeft = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));

  res.json({
    deadline: deadline.toISOString(),
    daysLeft,
    targetRevenue: 5000,
    currency: 'CAD'
  });
}
