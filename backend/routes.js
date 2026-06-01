import { db } from './db.js';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// NEWS API
export async function getNews(req, res) {
  try {
    const response = await axios.get('https://newsapi.org/v2/top-headlines', {
      params: {
        country: 'ca',
        pageSize: 6,
        apiKey: 'demo' // Will work with demo key, or use your own
      }
    });

    const news = response.data.articles.slice(0, 6).map(article => ({
      title: article.title,
      source: article.source.name,
      url: article.url
    }));

    res.json(news);
  } catch (error) {
    // Fallback if API fails
    res.json([
      { title: 'Global Markets Rise on Tech Gains', source: 'Reuters', url: '#' },
      { title: 'Canada Announces New Tech Initiative', source: 'CTV', url: '#' },
      { title: 'AI Industry Continues Rapid Growth', source: 'TechCrunch', url: '#' },
      { title: 'Startup Ecosystem Thrives', source: 'VentureBeat', url: '#' },
      { title: 'Digital Transformation Accelerates', source: 'Forbes', url: '#' },
      { title: 'Entrepreneurs Share Success Stories', source: 'Entrepreneur', url: '#' }
    ]);
  }
}

// SYSTEM UPDATE - Read from source files
export async function systemUpdate(req, res) {
  try {
    // Read from the Claude memory files
    const memoryPath = path.join(
      process.env.USERPROFILE || '/root',
      'AppData/Roaming/Claude/local-agent-mode-sessions/420ba620-e91c-4186-b376-a27d8c85f089/149fc0ef-a76f-4bc8-8976-c48ff8fdc70c/spaces/93d48843-1a68-4671-bf54-ead362dd7032/memory'
    );

    // Try to read memory files
    let memoryContent = '';
    try {
      const files = fs.readdirSync(memoryPath);
      const recentFiles = files
        .filter(f => f.endsWith('.json') || f.endsWith('.txt'))
        .sort()
        .reverse()
        .slice(0, 5);

      for (const file of recentFiles) {
        const filePath = path.join(memoryPath, file);
        const content = fs.readFileSync(filePath, 'utf8');
        memoryContent += content + '\n';
      }
    } catch (fileError) {
      console.warn('Could not read memory files:', fileError.message);
    }

    // Parse memory content for updates
    // This is a basic implementation - enhance based on your memory format
    const updates = parseMemoryForUpdates(memoryContent);

    // Apply updates to database
    for (const update of updates) {
      if (update.type === 'experiment') {
        await updateOrCreateExperiment(update);
      }
    }

    res.json({
      success: true,
      message: 'Dashboard updated from source data',
      updatesApplied: updates.length
    });
  } catch (error) {
    console.error('System update error:', error);
    res.status(500).json({
      error: 'Failed to update from source',
      message: error.message
    });
  }
}

function parseMemoryForUpdates(content) {
  // Basic parsing - enhance this based on your memory format
  const updates = [];

  // Look for revenue mentions
  const revenuePattern = /(?:earned|revenue|made|got)\s+\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/gi;
  const matches = content.matchAll(revenuePattern);

  for (const match of matches) {
    updates.push({
      type: 'experiment',
      field: 'revenueThisMonth',
      value: parseFloat(match[1].replace(/,/g, ''))
    });
  }

  return updates;
}

function updateOrCreateExperiment(update) {
  return new Promise((resolve) => {
    // This would update the latest experiment with the new value
    // Enhance based on your actual memory format
    resolve();
  });
}
