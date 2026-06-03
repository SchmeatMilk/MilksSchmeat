import { all } from '../db.js';

// Shared streak calculation — used by consistency route + milestones module.
export async function calculateStreak() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // Last 30 days
  const days = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.unshift(d.toISOString().slice(0, 10));
  }

  const checkins = await all(
    `SELECT date FROM checkins WHERE date IN (${days.map(() => '?').join(',')})`,
    days
  );
  const checkinDates = new Set(checkins.map((c) => c.date));

  // Current streak: consecutive days ending at today (or yesterday if today is missing)
  let streak = 0;
  let streakEndDate = null;

  for (let i = 0; i < days.length; i++) {
    if (checkinDates.has(days[i])) {
      if (streak === 0) streakEndDate = days[i];
      streak++;
    } else {
      break;
    }
  }

  return {
    currentStreak: streak,
    streakEndDate,
    allDays: days,
    checkinDates,
  };
}
