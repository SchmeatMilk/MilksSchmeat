import { db, run, get, all } from './db.js';
import axios from 'axios';
import { runIngest } from './ingest/index.js';

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
    const { date, earnings, hours, trips, note } = req.body;
    const id = `uber-${Date.now()}`;
    await run(
      `INSERT INTO uber_shifts (id, date, earnings, hours, trips, source, note)
       VALUES (?, ?, ?, ?, ?, 'manual', ?)`,
      [id, date || new Date().toISOString().slice(0, 10),
       Number(earnings) || 0, Number(hours) || 0, parseInt(trips, 10) || 0, note || '']);
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
    res.json({ series, count, rate, missTwice });
  } catch (e) { res.status(500).json({ error: e.message }); }
}
