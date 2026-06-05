import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import cron from 'node-cron';
import { initializeDatabase, seedDatabase } from './db.js';
import * as routes from './routes.js';
import { runIngest } from './ingest/index.js';

const app = express();
const PORT = 5000;

app.use(cors());
app.use(bodyParser.json());

initializeDatabase();
seedDatabase();

// Routes - Experiments
app.get('/api/experiments', routes.getExperiments);
app.post('/api/experiments', routes.createExperiment);
app.put('/api/experiments/:id', routes.updateExperiment);
app.delete('/api/experiments/:id', routes.deleteExperiment);

// Routes - Tasks
app.get('/api/tasks/:date', routes.getTasksByDate);
app.post('/api/tasks', routes.createTask);
app.put('/api/tasks/:id', routes.updateTask);
app.delete('/api/tasks/:id', routes.deleteTask);

// Routes - Stats
app.get('/api/stats', routes.getStats);
app.get('/api/revenue-summary', routes.getRevenueSummary);
app.get('/api/countdown', routes.getCountdown);

// Routes - External Data
app.get('/api/news', routes.getNews);
app.get('/api/trends', routes.getTrends);

// Routes - Uber delivery
app.get('/api/uber-shifts', routes.getUberShifts);
app.post('/api/uber-shifts', routes.createUberShift);
app.delete('/api/uber-shifts/:id', routes.deleteUberShift);

// Routes - Dashboard intelligence
app.get('/api/next-move', routes.getNextMove);
app.get('/api/burnup', routes.getBurnup);
app.get('/api/consistency', routes.getConsistency);

// Routes - Phase 3: Power features
app.get('/api/expenses', routes.getExpenses);
app.post('/api/expenses', routes.createExpense);
app.delete('/api/expenses/:id', routes.deleteExpense);

app.get('/api/volatility', routes.getVolatility);
app.get('/api/uber-patterns', routes.getUberPatterns);

app.get('/api/milestones', routes.getMilestones);
app.post('/api/milestones/:id/seen', routes.markMilestoneSeen);

app.get('/api/reminders', routes.getReminders);

app.post('/api/export-status', routes.exportStatus);

// Routes - Project detail pages
app.get('/api/projects/:id', routes.getProjectDetail);
app.post('/api/projects/:id/ideas', routes.getProjectIdeas);

// System Update (manual Sync)
app.post('/api/system-update', routes.systemUpdate);

// Daily update trigger (runs at 8:30 AM). node-cron is best-effort; the run is
// idempotent and the startup catch-up below covers a missed morning.
cron.schedule('30 8 * * *', async () => {
  console.log('🔄 Running daily ingestion at 8:30 AM');
  try {
    const result = await runIngest({ trigger: 'cron' });
    console.log('Daily ingestion result:', result);
  } catch (error) {
    console.error('Daily ingestion error:', error);
  }
});

app.listen(PORT, () => {
  console.log(`\n📊 Goals Dashboard Backend running on http://localhost:${PORT}`);
  console.log(`Access from phone: http://<YOUR-COMPUTER-IP>:${PORT}\n`);
  console.log('✅ Database initialized');
  console.log('🔄 Daily update scheduled for 8:30 AM');

  // Catch-up: if today's 8:30 run was missed (PC asleep/off), ingest on launch.
  // Idempotent — if it already ran today, this no-ops.
  runIngest({ trigger: 'startup-catchup' })
    .then((r) => { if (!r.skipped) console.log('Startup catch-up ingestion:', r); })
    .catch((e) => console.warn('Startup catch-up failed:', e.message));
});
