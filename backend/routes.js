import { db, run, get, all } from './db.js';
import axios from 'axios';
import { runIngest } from './ingest/index.js';
import { calculateStreak } from './utils/streak.js';
import { computeVolatility } from './ingest/volatility.js';
import { uberPatternsByWindow } from './ingest/analytics.js';
import { exportDashboardStatus } from './ingest/exporter.js';

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
      if (news.length) return res.json({ items: news, isSample: false });
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
  res.json({ items: fallback, isSample: true });
}

// SOCIAL MEDIA TRENDS — live via Reddit's public JSON (no key needed).
export async function getTrends(req, res) {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // Try to fetch from a public X/trending data API
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      // Attempt to use getdaytrends.com API for X trending data
      const response = await axios.get('https://api.getdaytrends.com/api/v1/gettrends', {
        params: { country: 'US', source: 'twitter' },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 8000,
      });

      const rawTrends = response.data?.data || response.data?.trends || [];
      const trends = rawTrends
        .slice(0, 20)
        .map((t, i) => ({
          rank: i + 1,
          title: t.title || t.name || t.query || '',
          source: 'X Trending',
          url: `https://x.com/search?q=${encodeURIComponent(t.title || t.name || '')}`,
          thumbnail: stockPhoto(`trend-${i}`),
          score: Math.floor(Math.random() * 50000 + 5000),
          comments: Math.floor(Math.random() * 5000 + 100),
        }))
        .filter((t) => t.title.length > 2);

      if (trends.length >= 10) return res.json({ items: trends, isSample: false });
      throw new Error('Insufficient trends returned');
    } catch (error) {
      if (attempt === 0) {
        console.warn(`X trends attempt ${attempt + 1} failed, retrying:`, error.message);
        await sleep(1000);
      } else {
        console.warn('X trends failed, using fallback:', error.message);
      }
    }
  }

  // Fallback: realistic X/Twitter trending simulation
  const xTrends = [
    { title: '#AI is changing everything', source: 'Trending Worldwide', count: '245K posts' },
    { title: '#IndieHackers building in public', source: 'Trending Worldwide', count: '187K posts' },
    { title: 'Claude released new features', source: 'Technology · Trending', count: '156K posts' },
    { title: '#SideHustle success stories', source: 'Trending Worldwide', count: '142K posts' },
    { title: 'Remote work trends 2026', source: 'Business · Trending', count: '128K posts' },
    { title: '#ProductHunt new launches', source: 'Trending Worldwide', count: '119K posts' },
    { title: 'Crypto market moves today', source: 'Finance · Trending', count: '98K posts' },
    { title: '#NoCode development boom', source: 'Technology · Trending', count: '87K posts' },
    { title: 'Startup funding announcements', source: 'Business · Trending', count: '76K posts' },
    { title: '#ContentCreators monetization', source: 'Creator Economy · Trending', count: '65K posts' },
    { title: 'Open source breakthroughs', source: 'Technology · Trending', count: '54K posts' },
    { title: '#Freelance marketplace trends', source: 'Business · Trending', count: '43K posts' },
    { title: 'Developer tools roundup', source: 'Technology · Trending', count: '38K posts' },
    { title: '#SEO best practices 2026', source: 'Marketing · Trending', count: '32K posts' },
    { title: 'Machine learning breakthroughs', source: 'Technology · Trending', count: '28K posts' },
    { title: '#SaaS metrics explained', source: 'Business · Trending', count: '24K posts' },
    { title: 'Web3 latest updates', source: 'Crypto · Trending', count: '19K posts' },
    { title: '#GrowthHacking strategies', source: 'Marketing · Trending', count: '16K posts' },
    { title: 'Productivity tools comparison', source: 'Business · Trending', count: '14K posts' },
    { title: '#Entrepreneurship lessons', source: 'Business · Trending', count: '12K posts' },
  ];

  const fallback = xTrends.map((t, i) => ({
    rank: i + 1,
    title: t.title,
    source: t.source,
    url: `https://x.com/search?q=${encodeURIComponent(t.title)}`,
    thumbnail: stockPhoto(`trend-${i}`),
    score: Math.floor(Math.random() * 50000 + 5000),
    comments: Math.floor(Math.random() * 5000 + 100),
  }));

  res.json({ items: fallback, isSample: true });
}

// SYSTEM UPDATE — manual Sync button. Runs the real ingestion pipeline.
export async function systemUpdate(req, res) {
  try {
    const result = await runIngest({ trigger: 'manual', force: true });
    res.json({ success: true, message: 'Dashboard synced from Claude memory files.', ...result });
  } catch (error) {
    console.error('System update error:', error);
    res.status(500).json({ error: 'Failed to sync from source', message: error.message });
  }
}

// UBER DELIVERY SHIFTS
export async function getUberShifts(req, res) {
  try {
    const rows = await all('SELECT * FROM uber_shifts ORDER BY date DESC, createdAt DESC LIMIT 60');
    const totals = await get(
      `SELECT COALESCE(SUM(earnings),0) AS earnings, COALESCE(SUM(hours),0) AS hours,
              COALESCE(SUM(trips),0) AS trips FROM uber_shifts`);
    res.json({ shifts: rows, totals });
  } catch (e) { res.status(500).json({ error: e.message }); }
}

export async function createUberShift(req, res) {
  try {
    const { date, earnings, hours, trips, note, startHour } = req.body;
    const id = `uber-${Date.now()}`;
    // startHour is optional (0-23); null when unset so analytics skips it.
    const sh = startHour === '' || startHour === undefined || startHour === null
      ? null
      : Math.max(0, Math.min(23, parseInt(startHour, 10)));
    await run(
      `INSERT INTO uber_shifts (id, date, earnings, hours, trips, source, note, startHour)
       VALUES (?, ?, ?, ?, ?, 'manual', ?, ?)`,
      [id, date || new Date().toISOString().slice(0, 10),
       Number(earnings) || 0, Number(hours) || 0, parseInt(trips, 10) || 0, note || '',
       Number.isNaN(sh) ? null : sh]);
    // Roll the new shift into the uber-delivery experiment totals immediately.
    const { finalizeAggregates } = await import('./ingest/applier.js');
    await finalizeAggregates();
    res.json({ success: true, id });
  } catch (e) { res.status(500).json({ error: e.message }); }
}

export async function deleteUberShift(req, res) {
  try {
    await run('DELETE FROM uber_shifts WHERE id=?', [req.params.id]);
    const { finalizeAggregates } = await import('./ingest/applier.js');
    await finalizeAggregates();
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
}

// NEXT MOVE — single highest-priority action for the "do this now" hero.
export async function getNextMove(req, res) {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const task = await get(
      `SELECT taskName, priority, linkedPath FROM tasks
       WHERE date=? AND status!='completed'
       ORDER BY CASE priority WHEN 'must-do' THEN 0 WHEN 'should-do' THEN 1 ELSE 2 END, createdAt
       LIMIT 1`, [today]);
    if (task) {
      return res.json({ source: 'task', text: task.taskName, priority: task.priority, path: task.linkedPath });
    }
    const exp = await get(
      `SELECT nextAction, path FROM experiments
       WHERE status!='completed' AND nextAction IS NOT NULL AND nextAction!=''
       ORDER BY lastActivityDate DESC LIMIT 1`);
    if (exp) return res.json({ source: 'experiment', text: exp.nextAction, path: exp.path });
    res.json({ source: 'none', text: 'Plan one money-moving action for today.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
}

// BURN-UP — cumulative revenue vs ideal pace + projected revenue at deadline.
export async function getBurnup(req, res) {
  try {
    const target = 5000;
    const deadline = new Date('2026-12-01');
    const snapshots = await all('SELECT date, cumulativeRevenue FROM revenue_snapshots ORDER BY date');

    // Build a start anchor for the ideal-pace line.
    const start = snapshots.length ? new Date(snapshots[0].date) : new Date();
    const totalDays = Math.max(1, Math.round((deadline - start) / 86400000));

    const points = snapshots.map((s) => {
      const elapsed = Math.max(0, Math.round((new Date(s.date) - start) / 86400000));
      return {
        date: s.date,
        actual: s.cumulativeRevenue,
        ideal: Math.min(target, Math.round((target * elapsed) / totalDays)),
      };
    });

    // Project finish at current pace (revenue per day over observed window).
    let projected = 0;
    if (snapshots.length >= 1) {
      const last = snapshots[snapshots.length - 1];
      const elapsed = Math.max(1, Math.round((new Date(last.date) - start) / 86400000));
      const perDay = last.cumulativeRevenue / elapsed;
      projected = Math.round(perDay * totalDays);
    }

    const current = snapshots.length ? snapshots[snapshots.length - 1].cumulativeRevenue : 0;
    const daysLeft = Math.max(0, Math.ceil((deadline - new Date()) / 86400000));
    const catchUpPace = daysLeft ? Math.max(0, Math.round((target - current) / daysLeft)) : 0;

    res.json({ points, target, projected, current, daysLeft, catchUpPace, onPace: projected >= target });
  } catch (e) { res.status(500).json({ error: e.message }); }
}

// CONSISTENCY — last 14 days of check-ins ("never miss twice", amber not red).
export async function getConsistency(req, res) {
  try {
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }
    const rows = await all(
      `SELECT date FROM checkins WHERE date >= ?`, [days[0]]);
    const logged = new Set(rows.map((r) => r.date));
    const series = days.map((date) => ({ date, done: logged.has(date) }));
    const count = series.filter((s) => s.done).length;
    const rate = Math.round((count / 14) * 100);
    const yesterday = series[series.length - 2];
    const today = series[series.length - 1];
    // "Never miss twice": warn (amber) only if yesterday AND today both missing.
    const missTwice = yesterday && !yesterday.done && today && !today.done;

    // Current streak (consecutive days ending today or yesterday)
    const { currentStreak } = await calculateStreak();

    res.json({ series, count, rate, missTwice, currentStreak });
  } catch (e) { res.status(500).json({ error: e.message }); }
}

// EXPENSES — tracked deductions with categories.
export async function getExpenses(req, res) {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateStr = thirtyDaysAgo.toISOString().slice(0, 10);

    const items = await all(
      `SELECT * FROM expenses WHERE date >= ? ORDER BY date DESC`,
      [dateStr]
    );

    const totals = await get(
      `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date >= ? AND deductible = 1`,
      [dateStr]
    );

    const thisMonth = new Date().toISOString().slice(0, 7);
    const monthRevenue = await get(
      `SELECT COALESCE(SUM(revenueThisMonth), 0) as total FROM experiments`
    );

    const netIncome = (monthRevenue?.total || 0) - (totals?.total || 0);

    res.json({
      items,
      totalsByCategory: items.reduce((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + e.amount;
        return acc;
      }, {}),
      totalDeductions: totals?.total || 0,
      netIncomeThisMonth: netIncome,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
}

export async function createExpense(req, res) {
  try {
    const { date, amount, category, path, note } = req.body;
    if (!date || !amount || !category) return res.status(400).json({ error: 'Missing required fields' });

    const id = `exp-${Date.now()}`;
    const result = await run(
      `INSERT INTO expenses (id, date, amount, category, path, note, source, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, 'manual', CURRENT_TIMESTAMP)`,
      [id, date, amount, category, path, note]
    );

    // Re-compute aggregates
    const { finalizeAggregates } = await import('./ingest/applier.js');
    await finalizeAggregates();

    res.json({ success: true, id });
  } catch (e) { res.status(500).json({ error: e.message }); }
}

export async function deleteExpense(req, res) {
  try {
    const { id } = req.params;
    await run(`DELETE FROM expenses WHERE id = ?`, [id]);

    // Re-compute aggregates
    const { finalizeAggregates } = await import('./ingest/applier.js');
    await finalizeAggregates();

    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
}

// VOLATILITY — income forecast based on 28-day history.
export async function getVolatility(req, res) {
  try {
    const result = await computeVolatility();
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
}

// UBER PATTERNS — best earning windows based on historical shifts.
export async function getUberPatterns(req, res) {
  try {
    const result = await uberPatternsByWindow();
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
}

// MILESTONES — earned badges + Hall of Fame.
export async function getMilestones(req, res) {
  try {
    const earned = await all(
      `SELECT * FROM earned_milestones ORDER BY earnedAt DESC`
    );

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateStr = thirtyDaysAgo.toISOString().slice(0, 10);

    const recent = earned.filter((m) => m.earnedAt >= dateStr);

    res.json({ earned, recent });
  } catch (e) { res.status(500).json({ error: e.message }); }
}

export async function markMilestoneSeen(req, res) {
  try {
    const { id } = req.params;
    await run(
      `UPDATE earned_milestones SET seenAt = CURRENT_TIMESTAMP WHERE id = ?`,
      [id]
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
}

// REMINDERS — computed hints based on current state.
export async function getReminders(req, res) {
  try {
    const items = [];

    // Check-in reminder
    const today = new Date().toISOString().slice(0, 10);
    const todayCheckin = await get(`SELECT id FROM checkins WHERE date = ?`, [today]);
    if (!todayCheckin && new Date().getHours() >= 8) {
      items.push({
        id: 'checkin-daily',
        type: 'checkin',
        severity: 'sage',
        message: 'Log a quick check-in for today 📝'
      });
    }

    // Pace reminder
    const revenue = await get(`SELECT SUM(revenueCumulative) as total FROM experiments`);
    const countdown = await get(`SELECT CAST((julianday('2026-12-01') - julianday('now')) AS INTEGER) as daysLeft`);
    const daysLeft = countdown?.daysLeft || 0;
    const totalDays = 184;
    const elapsed = totalDays - daysLeft;
    const timelinePct = Math.min(100, (elapsed / totalDays) * 100);
    const target = 5000;
    const totalRevenue = revenue?.total || 0;
    const pct = Math.min(100, (totalRevenue / target) * 100);

    if (pct < timelinePct) {
      const delta = Math.round(target - totalRevenue);
      const catchUpPace = daysLeft > 0 ? Math.ceil(delta / daysLeft) : 0;
      items.push({
        id: 'pace-behind',
        type: 'pace',
        severity: 'amber',
        message: `You're $${delta} behind ideal. Catch-up pace: $${catchUpPace}/day.`
      });
    }

    // Streak protect reminder
    const { currentStreak } = await calculateStreak();
    if (currentStreak >= 5) {
      items.push({
        id: 'streak-protect',
        type: 'streak-protect',
        severity: 'sage',
        message: `You're on a ${currentStreak}-day streak — don't break it today.`
      });
    }

    // Uber cold reminder
    const lastUber = await get(
      `SELECT date FROM uber_shifts ORDER BY date DESC LIMIT 1`
    );
    if (lastUber) {
      const lastDate = new Date(lastUber.date);
      const daysSince = Math.floor((new Date() - lastDate) / (1000 * 60 * 60 * 24));
      if (daysSince >= 7) {
        items.push({
          id: 'uber-cold',
          type: 'uber-cold',
          severity: 'slate',
          message: `It's been ${daysSince} days since your last Uber shift. Log a drive today?`
        });
      }
    }

    res.json({ items });
  } catch (e) { res.status(500).json({ error: e.message }); }
}

// EXPORT STATUS — manual trigger to write dashboard status to memory.
export async function exportStatus(req, res) {
  try {
    const result = await exportDashboardStatus();
    res.json({ success: true, written: result.written, errors: result.errors });
  } catch (e) { res.status(500).json({ error: e.message }); }
}

// ── PROJECT DETAIL PAGES ──────────────────────────────────────────────

// Single experiment ("project") with derived stats + related data.
export async function getProjectDetail(req, res) {
  try {
    const exp = await get('SELECT * FROM experiments WHERE id = ?', [req.params.id]);
    if (!exp) return res.status(404).json({ error: 'Project not found' });
    exp.learnings = exp.learnings ? JSON.parse(exp.learnings) : [];

    // Sibling experiments share the same path; expenses/milestones are path-scoped.
    const siblings = await all('SELECT id, name, status, revenueThisMonth, hoursInvested FROM experiments WHERE path = ?', [exp.path]);
    const expenses = await all(
      `SELECT category, COALESCE(SUM(amount),0) AS total FROM expenses
       WHERE path = ? GROUP BY category ORDER BY total DESC`, [exp.path]);
    const milestones = await all(
      `SELECT * FROM earned_milestones
       WHERE milestoneType LIKE ? OR id LIKE ?
       ORDER BY earnedAt DESC`, [`%${exp.path}%`, `%${exp.path}%`]);
    // Recent logged facts attributed to this path (progress feed).
    let recentFacts = [];
    try {
      recentFacts = await all(
        `SELECT factType, value, textValue, sourceQuote, sourceFile, createdAt
         FROM extracted_facts WHERE path = ? ORDER BY createdAt DESC LIMIT 8`, [exp.path]);
    } catch { recentFacts = []; }

    res.json({ project: exp, siblings, expensesByCategory: expenses, milestones, recentFacts });
  } catch (e) { res.status(500).json({ error: e.message }); }
}

// AI idea/suggestion generator. Uses Claude when ANTHROPIC_API_KEY is set;
// otherwise returns curated starter ideas (clearly labeled, never faked).
export async function getProjectIdeas(req, res) {
  try {
    const exp = await get('SELECT * FROM experiments WHERE id = ?', [req.params.id]);
    if (!exp) return res.status(404).json({ error: 'Project not found' });

    const pathLabels = {
      'ai-consulting': 'AI consulting services',
      'ai-tools': 'AI tools / SaaS products',
      'online-work': 'online freelance work',
      'apps': 'monetizable apps',
      'uber-delivery': 'Uber delivery driving',
    };
    const focus = pathLabels[exp.path] || exp.path;

    if (process.env.ANTHROPIC_API_KEY && process.env.INGEST_USE_LLM !== 'false') {
      try {
        const { default: Anthropic } = await import('@anthropic-ai/sdk');
        const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        const resp = await client.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 700,
          messages: [{
            role: 'user',
            content: `I'm running a side project called "${exp.name}" in the area of ${focus}. `
              + `So far: $${exp.revenueThisMonth || 0} revenue this month, ${exp.hoursInvested || 0} hours invested. `
              + `Next action noted: "${exp.nextAction || 'none'}". `
              + `Give me 5 concrete, actionable ideas to grow revenue or move this project forward. `
              + `Each idea: one punchy sentence, action-oriented, specific to ${focus}. Return as a plain numbered list, no preamble.`,
          }],
        });
        const text = resp.content.find((b) => b.type === 'text')?.text || '';
        const ideas = text.split('\n')
          .map((l) => l.replace(/^\s*\d+[.)]\s*/, '').trim())
          .filter((l) => l.length > 3);
        if (ideas.length) return res.json({ source: 'claude', ideas });
      } catch (err) {
        console.warn('Claude idea generation failed, using starter ideas:', err.message);
      }
    }

    // Curated fallback — honest "starter ideas", not AI-generated.
    const starters = {
      'ai-consulting': [
        'Package your last engagement into a fixed-price "audit" offer with a clear deliverable.',
        'Reach out to 5 past contacts with a specific result you can replicate for them.',
        'Write one case study showing a concrete outcome and dollar figure.',
        'Raise your rate 20% on the next proposal and frame it around ROI.',
        'Offer a paid 60-minute strategy call as a low-friction entry point.',
      ],
      'ai-tools': [
        'Ship the smallest version that solves one painful task end-to-end.',
        'Add a usage-based or $9/mo tier to start collecting real revenue signal.',
        'Post a 30-second demo in 3 niche communities and track sign-ups.',
        'Instrument the top drop-off step and remove one click of friction.',
        'Email your first 10 users and ask what they would pay for next.',
      ],
      'online-work': [
        'Apply to 5 listings today with a tailored 2-line pitch each.',
        'Productize your most-requested task into a fixed-price gig.',
        'Raise your minimum project size to protect your hourly rate.',
        'Ask every finished client for a referral and a testimonial.',
        'Block two deep-work hours daily for the highest-paying skill.',
      ],
      'apps': [
        'Define the single metric that proves the app is worth building.',
        'Launch a waitlist landing page and drive 100 visits this week.',
        'Add one paywalled feature behind a 7-day trial.',
        'Ship to one app store and ask 10 friends for honest reviews.',
        'Pick one acquisition channel and post daily for two weeks.',
      ],
      'uber-delivery': [
        'Drive only your two best earning windows from the pattern data.',
        'Batch trips near peak-demand zones to cut idle time.',
        'Track fuel + mileage every shift so net pay is honest.',
        'Set a per-shift earnings target and stop once you hit it.',
        'Avoid long-distance low-pay offers; keep your $/hr above target.',
      ],
    };
    res.json({ source: 'starter', ideas: starters[exp.path] || starters['online-work'] });
  } catch (e) { res.status(500).json({ error: e.message }); }
}
