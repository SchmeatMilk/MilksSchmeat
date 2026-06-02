import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { AnimatePresence, motion } from 'framer-motion';
import './App.css';
import LoadingScreen from './components/LoadingScreen';
import AnimatedBackground from './components/AnimatedBackground';
import Dashboard from './components/Dashboard';

const QUOTES = [
  'Discipline is choosing between what you want now and what you want most.',
  'The future depends on what you do today.',
  'Small daily improvements are the key to staggering long-term results.',
  'Done is better than perfect. Ship it.',
  'You don’t have to be great to start, but you have to start to be great.',
  'Focus on being productive instead of busy.',
  'The best way to predict the future is to create it.',
  'Action is the foundational key to all success.',
];

function App() {
  const [booting, setBooting] = useState(true);
  const [experiments, setExperiments] = useState([]);
  const [revenue, setRevenue] = useState({ thisMonth: 0, cumulative: 0, target: 5000 });
  const [countdown, setCountdown] = useState({ daysLeft: 184 });
  const [quote, setQuote] = useState(QUOTES[0]);
  const [news, setNews] = useState([]);
  const [updating, setUpdating] = useState(false);
  const [clock, setClock] = useState(new Date());

  const fetchData = useCallback(async () => {
    try {
      const [exp, rev, cnt] = await Promise.all([
        axios.get('/api/experiments'),
        axios.get('/api/revenue-summary'),
        axios.get('/api/countdown'),
      ]);
      setExperiments(exp.data);
      setRevenue(rev.data);
      setCountdown(cnt.data);
    } catch (e) {
      console.error('Data fetch failed:', e);
    }
  }, []);

  useEffect(() => {
    fetchData();
    setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
    axios.get('/api/news').then((r) => setNews(r.data)).catch(() => {});
    const dataTimer = setInterval(fetchData, 30000);
    const clockTimer = setInterval(() => setClock(new Date()), 1000);
    return () => { clearInterval(dataTimer); clearInterval(clockTimer); };
  }, [fetchData]);

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      await axios.post('/api/system-update');
      await fetchData();
    } catch (e) {
      console.error('Update failed:', e);
    } finally {
      setTimeout(() => setUpdating(false), 600);
    }
  };

  return (
    <>
      <AnimatePresence>
        {booting && <LoadingScreen onComplete={() => setBooting(false)} />}
      </AnimatePresence>

      <AnimatedBackground />

      {!booting && (
        <div className="app-shell">
          <header className="topbar">
            <div className="topbar-particles">
              {Array.from({ length: 14 }).map((_, i) => (
                <span key={i} className="particle" style={{
                  left: `${(i * 7.3) % 100}%`,
                  animationDelay: `${(i % 7) * 0.8}s`,
                  animationDuration: `${6 + (i % 5)}s`,
                }} />
              ))}
            </div>

            <div className="topbar-left">
              <div className="brand">
                <span className="brand-mark" />
                <div>
                  <div className="brand-name">INCOME HUNT</div>
                  <div className="brand-sub">Command Dashboard</div>
                </div>
              </div>
            </div>

            <div className="topbar-center">
              <motion.p
                key={quote}
                className="quote"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                “{quote}”
              </motion.p>
            </div>

            <div className="topbar-right">
              <div className="clock">
                <div className="clock-time mono">{clock.toLocaleTimeString('en-US', { hour12: false })}</div>
                <div className="clock-date">{clock.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
              </div>
              <button className={`sync-btn ${updating ? 'spinning' : ''}`} onClick={handleUpdate} title="Pull latest from source files">
                <span className="sync-icon">⟳</span>
                {updating ? 'Syncing' : 'Sync'}
              </button>
            </div>
          </header>

          <div className="main-area">
            <main className="dashboard-area">
              <Dashboard experiments={experiments} revenue={revenue} countdown={countdown} />
            </main>

            <aside className="news-rail">
              <div className="news-head">
                <span className="news-dot" /> LIVE HEADLINES
              </div>
              <div className="news-items">
                {news.length === 0 && <div className="news-empty">Fetching headlines…</div>}
                {news.map((n, i) => (
                  <a key={i} className="news-card" href={n.url} target="_blank" rel="noopener noreferrer">
                    <div className="news-title">{n.title}</div>
                    <div className="news-source">{n.source}</div>
                  </a>
                ))}
              </div>
            </aside>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
