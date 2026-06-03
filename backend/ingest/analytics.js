import { all, get } from '../db.js';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export async function uberPatternsByWindow() {
  // Group shifts by (day-of-week, hour-bucket)
  // Returns windows with >= 2 shifts (statistical minimum)
  const shifts = await all(`
    SELECT date, earnings, hours, startHour FROM uber_shifts
    WHERE earnings > 0 AND hours > 0 AND startHour IS NOT NULL
    ORDER BY date DESC
    LIMIT 100
  `);

  if (shifts.length < 3) {
    return { insufficient: true, sampleSize: shifts.length };
  }

  const windows = new Map();

  for (const shift of shifts) {
    const d = new Date(shift.date + 'T00:00:00Z');
    const dayOfWeek = d.getUTCDay();
    const hourBucket = Math.floor(shift.startHour / 2) * 2; // 0-2, 2-4, 4-6, etc.

    const key = `${dayOfWeek}-${hourBucket}`;
    if (!windows.has(key)) {
      windows.set(key, { dayOfWeek, hourBucket, earnings: [], hours: [], count: 0 });
    }

    const w = windows.get(key);
    w.earnings.push(shift.earnings);
    w.hours.push(shift.hours);
    w.count++;
  }

  // Filter to windows with >= 2 shifts, compute averages
  const results = [];
  for (const [key, w] of windows) {
    if (w.count >= 2) {
      const avgEarnings = w.earnings.reduce((a, b) => a + b, 0) / w.count;
      const avgHours = w.hours.reduce((a, b) => a + b, 0) / w.count;
      const avgPerHour = avgHours > 0 ? Math.round((avgEarnings / avgHours) * 10) / 10 : 0;

      results.push({
        dayOfWeek: w.dayOfWeek,
        dayName: DAY_NAMES[w.dayOfWeek],
        hourBucket: w.hourBucket,
        hourRange: `${w.hourBucket}-${w.hourBucket + 2}`,
        avgEarningsPerHour: avgPerHour,
        shiftCount: w.count,
        totalEarnings: avgEarnings * w.count,
      });
    }
  }

  // Sort by avgEarningsPerHour descending
  results.sort((a, b) => b.avgEarningsPerHour - a.avgEarningsPerHour);

  return {
    topWindows: results.slice(0, 3),
    allWindows: results,
    sampleSize: shifts.length,
  };
}

export async function topEarningWindows(limit = 3) {
  const patterns = await uberPatternsByWindow();
  if (patterns.insufficient) return patterns;
  return { topWindows: patterns.topWindows.slice(0, limit) };
}
