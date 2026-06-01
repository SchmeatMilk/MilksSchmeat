import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import cron from 'node-cron';
import { initializeDatabase, seedDatabase } from './db.js';
import * as routes from './routes.js';

const app = express();
const PORT = 5000;

app.use(cors());
app.use(bodyParser.json());

initializeDatabase();

// Routes
app.get('/api/experiments', routes.getExperiments);
app.post('/api/experiments', routes.createExperiment);
app.put('/api/experiments/:id', routes.updateExperiment);
app.delete('/api/experiments/:id', routes.deleteExperiment);

app.get('/api/tasks/:date', routes.getTasksByDate);
app.post('/api/tasks', routes.createTask);
app.put('/api/tasks/:id', routes.updateTask);
app.delete('/api/tasks/:id', routes.deleteTask);

app.get('/api/stats', routes.getStats);
app.get('/api/revenue-summary', routes.getRevenueSummary);
app.get('/api/countdown', routes.getCountdown);

// Daily update trigger (runs at 8:30 AM)
cron.schedule('30 8 * * *', async () => {
  console.log('Running daily update at 8:30 AM');
  // This will be enhanced to sync with Claude projects later
  // For now, just logs
});

app.listen(PORT, () => {
  console.log(`📊 Goals Dashboard Backend running on http://localhost:${PORT}`);
  console.log(`Access from phone: http://<YOUR-COMPUTER-IP>:${PORT}`);
});
