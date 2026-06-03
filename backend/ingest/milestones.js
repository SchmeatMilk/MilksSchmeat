import { all, get, run } from '../db.js';
import { calculateStreak } from '../utils/streak.js';

const THRESHOLDS = {
  revenue: [100, 500, 1000, 2500, 5000, 10000],
  hours: [10, 25, 50, 100, 200, 500],
  streak: [7, 14, 30, 60, 90],
  uberShifts: [1, 10, 50, 100],
  uberEarnings: [100, 500, 1000, 2500],
};

const MILESTONE_EMOJIS = {
  revenue: '💰',
  hours: '⏱️',
  streak: '🔥',
  uberShifts: '🚗',
  uberEarnings: '💵',
  pathFirstDollar: '🌱',
  experimentCompleted: '✅',
};

export async function checkMilestones() {
  const awardedCount = { new: 0, existing: 0, errors: 0 };

  try {
    // Revenue milestones
    const revData = await get(`SELECT SUM(revenueCumulative) as total FROM experiments`);
    const totalRevenue = revData?.total || 0;

    for (const threshold of THRESHOLDS.revenue) {
      if (totalRevenue >= threshold) {
        await awardMilestone(`revenue-${threshold}`, 'revenue', threshold,
          `${MILESTONE_EMOJIS.revenue} Earned $${threshold} cumulative`, awardedCount);
      }
    }

    // Hours milestones
    const hoursData = await get(`SELECT SUM(hoursInvested) as total FROM experiments`);
    const totalHours = hoursData?.total || 0;

    for (const threshold of THRESHOLDS.hours) {
      if (totalHours >= threshold) {
        await awardMilestone(`hours-${threshold}`, 'hours', threshold,
          `${MILESTONE_EMOJIS.hours} Invested ${threshold} hours`, awardedCount);
      }
    }

    // Streak milestones
    const { currentStreak } = await calculateStreak();
    for (const threshold of THRESHOLDS.streak) {
      if (currentStreak >= threshold) {
        await awardMilestone(`streak-${threshold}`, 'streak', threshold,
          `${MILESTONE_EMOJIS.streak} ${threshold}-day consistency streak`, awardedCount);
      }
    }

    // Uber shift count
    const uberShiftData = await get(`SELECT COUNT(*) as count FROM uber_shifts`);
    const uberShiftCount = uberShiftData?.count || 0;

    for (const threshold of THRESHOLDS.uberShifts) {
      if (uberShiftCount >= threshold) {
        await awardMilestone(`uberShifts-${threshold}`, 'uberShifts', threshold,
          `${MILESTONE_EMOJIS.uberShifts} Logged ${threshold} Uber shift${threshold > 1 ? 's' : ''}`, awardedCount);
      }
    }

    // Uber earnings
    const uberEarningsData = await get(`SELECT SUM(earnings) as total FROM uber_shifts`);
    const uberEarnings = uberEarningsData?.total || 0;

    for (const threshold of THRESHOLDS.uberEarnings) {
      if (uberEarnings >= threshold) {
        await awardMilestone(`uberEarnings-${threshold}`, 'uberEarnings', threshold,
          `${MILESTONE_EMOJIS.uberEarnings} Earned $${threshold} on Uber`, awardedCount);
      }
    }

    // Path-specific: first dollar per path
    const paths = ['ai-consulting', 'ai-tools', 'online-work', 'apps', 'uber-delivery'];
    for (const path of paths) {
      const pathData = await get(`SELECT revenueCumulative FROM experiments WHERE path = ?`, [path]);
      if (pathData?.revenueCumulative > 0) {
        await awardMilestone(`pathFirstDollar-${path}`, 'pathFirstDollar', 1,
          `${MILESTONE_EMOJIS.pathFirstDollar} First dollar from ${path}`, awardedCount);
      }
    }

    // Experiment completed
    const completed = await all(`SELECT id FROM experiments WHERE status = 'completed'`);
    for (const exp of completed) {
      await awardMilestone(`experimentCompleted-${exp.id}`, 'experimentCompleted', 1,
        `${MILESTONE_EMOJIS.experimentCompleted} Completed an experiment`, awardedCount);
    }

  } catch (e) {
    console.error('Milestone check error:', e.message);
    awardedCount.errors++;
  }

  return awardedCount;
}

async function awardMilestone(id, type, value, message, counter) {
  try {
    const result = await run(
      `INSERT OR IGNORE INTO earned_milestones (id, milestoneType, milestoneValue, emoji, message, earnedAt)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [id, type, value, message.split(' ')[0], message]
    );

    if (result.changes === 1) {
      counter.new++;
    } else {
      counter.existing++;
    }
  } catch (e) {
    console.error(`Error awarding milestone ${id}:`, e.message);
    counter.errors++;
  }
}
