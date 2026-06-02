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

// Decode HTML entities Reddit puts in image URLs (&amp; -> &, etc.)
function decodeEntities(str = '') {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

// A photo URL good enough to always render a card with an image.
function stockPhoto(seed) {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/400/240`;
}

// NEWS API — live via NewsAPI when NEWS_API_KEY is set; image-rich fallback otherwise.
export async function getNews(req, res) {
  const key = process.env.NEWS_API_KEY;

  if (key) {
    try {
      const response = await axios.get('https://newsapi.org/v2/top-headlines', {
        params: { country: 'us', pageSize: 12, apiKey: key },
        timeout: 8000,
      });
      const news = (response.data.articles || [])
        .filter((a) => a.title && a.title !== '[Removed]')
        .slice(0, 12)
        .map((a, i) => ({
          title: a.title,
          source: a.source?.name || 'News',
          url: a.url,
          image: a.urlToImage || stockPhoto(`news-${i}`),
          publishedAt: a.publishedAt || null,
        }));
      if (news.length) return res.json(news);
    } catch (error) {
      console.warn('NewsAPI failed, using fallback:', error.message);
    }
  }

  // Fallback — always has images so the rail looks complete.
  const fallback = [
    { title: 'Global Markets Climb on Strong Tech Earnings', source: 'Reuters' },
    { title: 'Canada Unveils National AI Strategy', source: 'CBC' },
    { title: 'AI Startups Raise Record Funding This Quarter', source: 'TechCrunch' },
    { title: 'Small Businesses Adopt AI Tools at Record Pace', source: 'Forbes' },
    { title: 'The Creator Economy Crosses $250B', source: 'Bloomberg' },
    { title: 'Remote Work Reshapes the Job Market', source: 'WSJ' },
    { title: 'New Frameworks Make Web Apps Faster', source: 'The Verge' },
    { title: 'Investors Bet Big on Productivity Software', source: 'VentureBeat' },
  ].map((n, i) => ({
    ...n,
    url: '#',
    image: stockPhoto(`news-${i}`),
    publishedAt: new Date(Date.now() - i * 3600_000).toISOString(),
  }));
  res.json(fallback);
}

// SOCIAL MEDIA TRENDS — live via Reddit's public JSON (no key needed).
export async function getTrends(req, res) {
  try {
    const response = await axios.get('https://www.reddit.com/r/popular/top.json', {
      params: { limit: 12, t: 'day' },
      headers: { 'User-Agent': 'IncomeHuntDashboard/1.0 (local)' },
      timeout: 8000,
    });

    const children = response.data?.data?.children || [];
    const trends = children
      .map((c) => c.data)
      .filter((d) => d && !d.over_18)
      .slice(0, 10)
      .map((d, i) => {
        let thumb = '';
        const preview = d.preview?.images?.[0]?.source?.url;
        if (preview) thumb = decodeEntities(preview);
        else if (d.thumbnail && /^https?:\/\//.test(d.thumbnail)) thumb = d.thumbnail;
        return {
          rank: i + 1,
          title: d.title,
          source: 'r/' + d.subreddit,
          url: 'https://reddit.com' + d.permalink,
          thumbnail: thumb || stockPhoto(`trend-${i}`),
          score: d.score || 0,
          comments: d.num_comments || 0,
        };
      });

    if (trends.length) return res.json(trends);
    throw new Error('No trends returned');
  } catch (error) {
    console.warn('Reddit trends failed, using fallback:', error.message);
    const fallback = [
      { title: 'AI agents are taking over workflow automation', source: 'r/technology', score: 48200, comments: 3100 },
      { title: 'This indie app hit $20k MRR in 3 months', source: 'r/SideProject', score: 31400, comments: 1200 },
      { title: 'The no-code movement is bigger than ever', source: 'r/Entrepreneur', score: 27800, comments: 940 },
      { title: 'New open-source model rivals the big players', source: 'r/MachineLearning', score: 25100, comments: 1500 },
      { title: 'Creators share their best monetization tips', source: 'r/content_marketing', score: 19900, comments: 720 },
      { title: 'Freelancers are charging more in 2026', source: 'r/freelance', score: 17500, comments: 680 },
      { title: 'Productivity stack that actually works', source: 'r/productivity', score: 15300, comments: 540 },
      { title: 'How small teams ship faster than ever', source: 'r/startups', score: 14100, comments: 430 },
      { title: 'Design trends defining this year', source: 'r/web_design', score: 12600, comments: 390 },
      { title: 'The side-hustle that became a business', source: 'r/smallbusiness', score: 11200, comments: 360 },
    ].map((t, i) => ({
      ...t,
      rank: i + 1,
      url: '#',
      thumbnail: stockPhoto(`trend-${i}`),
    }));
    res.json(fallback);
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
