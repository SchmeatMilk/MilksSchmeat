import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { AnimatePresence, motion } from 'framer-motion';
import './App.css';
import LoadingScreen from './components/LoadingScreen';
import AnimatedBackground from './components/AnimatedBackground';
import Dashboard from './components/Dashboard';
import NewsRail from './components/NewsRail';
import TrendsRail from './components/TrendsRail';
import ReminderBanner from './components/ReminderBanner';
import MilestoneToast from './components/MilestoneToast';
import ProjectMenu from './components/ProjectMenu';
import ProjectPage from './components/ProjectPage';

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
  const [updating, setUpdating] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [clock, setClock] = useState(new Date());
  const [dark, setDark] = useState(() => localStorage.getItem('ms-dark') === 'true');
  const [route, setRoute] = useState(window.location.hash);

  // Reflect dark-mode preference onto <body> and persist it.
  useEffect(() => {
    document.body.classList.toggle('dark', dark);
    localStorage.setItem('ms-dark', String(dark));
  }, [dark]);

  // Lightweight hash router (no dependency) for project detail pages.
  useEffect(() => {
    const onHash = () => setRoute(window.location.hash);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const projectMatch = route.match(/^#\/project\/(.+)$/);
  const goDashboard = () => { window.location.hash = ''; };

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

  // Push current dashboard state into Claude Desktop memory (reverse sync).
  const handlePush = async () => {
    setPushing(true);
    try {
      await axios.post('/api/export-status');
    } catch (e) {
      console.error('Push to Claude failed:', e);
    } finally {
      setTimeout(() => setPushing(false), 600);
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
                  <div className="brand-name">MILK'S SCHMEAT</div>
                  <div className="brand-sub">$ Hunter</div>
                </div>
              </div>
              <ProjectMenu experiments={experiments} />
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
              <button className="sync-btn push-btn" onClick={() => setDark((d) => !d)} title="Toggle dark mode">
                <span className="sync-icon">{dark ? '☀️' : '🌙'}</span>
                {dark ? 'Light' : 'Dark'}
              </button>
              <button className={`sync-btn ${updating ? 'spinning' : ''}`} onClick={handleUpdate} title="Pull latest from source files">
                <span className="sync-icon">⟳</span>
                {updating ? 'Syncing' : 'Sync'}
              </button>
              <button className={`sync-btn push-btn ${pushing ? 'spinning' : ''}`} onClick={handlePush} title="Write live status into Claude Desktop memory">
                <span className="sync-icon">↗</span>
                {pushing ? 'Pushing' : 'Push to Claude'}
              </button>
            </div>
          </header>

          {!projectMatch && <ReminderBanner />}

          {projectMatch ? (
            <div className="main-area">
              <main className="dashboard-area">
                <ProjectPage projectId={decodeURIComponent(projectMatch[1])} onBack={goDashboard} />
              </main>
            </div>
          ) : (
            <div className="main-area">
              <TrendsRail />

              <main className="dashboard-area">
                <Dashboard experiments={experiments} revenue={revenue} countdown={countdown} />
              </main>

              <NewsRail />
            </div>
          )}

          <MilestoneToast />
        </div>
      )}
    </>
  );
}

export default App;
