import { all, get } from '../db.js';

export async function computeVolatility() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // Last 28 days of snapshots
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 28);
  const startDateStr = startDate.toISOString().slice(0, 10);

  const snapshots = await all(`
    SELECT date, cumulativeRevenue FROM revenue_snapshots
    WHERE date >= ?
    ORDER BY date ASC
  `, [startDateStr]);

  if (snapshots.length < 7) {
    return { insufficient: true, sampleSize: snapshots.length };
  }

  // Calculate daily deltas (day-over-day change in cumulative revenue)
  const deltas = [];
  for (let i = 1; i < snapshots.length; i++) {
    const delta = snapshots[i].cumulativeRevenue - snapshots[i - 1].cumulativeRevenue;
    deltas.push(delta);
  }

  if (deltas.length === 0) {
    return { insufficient: true, sampleSize: 0 };
  }

  // Mean and standard deviation
  const mean = deltas.reduce((a, b) => a + b, 0) / deltas.length;
  const variance = deltas.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / deltas.length;
  const stdDev = Math.sqrt(variance);

  // Coefficient of variation (if mean is positive)
  const cv = mean > 0 ? stdDev / mean : 0;

  // Volatility score
  let score = 'low';
  if (cv > 0.4 && cv <= 0.8) score = 'medium';
  else if (cv > 0.8) score = 'high';

  // Month-end projection
  const thisMonth = snapshots[snapshots.length - 1]?.cumulativeRevenue || 0;
  const daysInMonth = 30;
  const todayDate = today.toISOString().slice(0, 10);
  const [year, month] = todayDate.split('-');
  const endOfMonth = new Date(`${year}-${month}-${daysInMonth}T23:59:59Z`);
  const daysRemaining = Math.max(0, Math.ceil((endOfMonth - today) / (1000 * 60 * 60 * 24)));

  // Project: p50 = current + (mean daily * daysRemaining)
  const p50 = Math.round(thisMonth + mean * daysRemaining);

  // p5 (pessimistic): mean - 1.645*stdDev (5th percentile)
  const p5 = Math.round(Math.max(0, thisMonth + (mean - 1.645 * stdDev) * daysRemaining));

  // p95 (optimistic): mean + 1.645*stdDev
  const p95 = Math.round(thisMonth + (mean + 1.645 * stdDev) * daysRemaining);

  return {
    mean: Math.round(mean * 100) / 100,
    stdDev: Math.round(stdDev * 100) / 100,
    cv: Math.round(cv * 1000) / 1000,
    score,
    forecast: { p5, p50, p95 },
    currentMonthRevenue: thisMonth,
    daysRemainingInMonth: daysRemaining,
    sampleSize: deltas.length,
  };
}
