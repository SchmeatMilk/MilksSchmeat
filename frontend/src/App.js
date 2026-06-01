import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import Dashboard from './components/Dashboard';
import RevenueMilestone from './components/RevenueMilestone';
import ExperimentsTracker from './components/ExperimentsTracker';
import DailyTasks from './components/DailyTasks';
import Countdown from './components/Countdown';

function App() {
  const [experiments, setExperiments] = useState([]);
  const [revenue, setRevenue] = useState({ thisMonth: 0, cumulative: 0, target: 5000, progress: 0 });
  const [countdown, setCountdown] = useState({ daysLeft: 0, deadline: '', targetRevenue: 5000 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [exp, rev, count] = await Promise.all([
        axios.get('/api/experiments'),
        axios.get('/api/revenue-summary'),
        axios.get('/api/countdown')
      ]);
      setExperiments(exp.data);
      setRevenue(rev.data);
      setCountdown(count.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">📊 Loading your progress...</div>;
  }

  return (
    <div className="app">
      <header className="header">
        <h1>🚀 Income Hunt Dashboard</h1>
        <p>Track 4 paths to $5,000/month by December 1, 2026</p>
      </header>

      <nav className="tabs">
        <button className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => setActiveTab('dashboard')}>
          📊 Overview
        </button>
        <button className={activeTab === 'experiments' ? 'active' : ''} onClick={() => setActiveTab('experiments')}>
          🔬 Experiments
        </button>
        <button className={activeTab === 'tasks' ? 'active' : ''} onClick={() => setActiveTab('tasks')}>
          ✅ Today's Tasks
        </button>
      </nav>

      <div className="content">
        {activeTab === 'dashboard' && (
          <>
            <div className="hero">
              <Countdown countdown={countdown} />
              <RevenueMilestone revenue={revenue} />
            </div>
            <Dashboard experiments={experiments} onRefresh={fetchData} />
          </>
        )}

        {activeTab === 'experiments' && (
          <ExperimentsTracker experiments={experiments} onRefresh={fetchData} />
        )}

        {activeTab === 'tasks' && (
          <DailyTasks experiments={experiments} onRefresh={fetchData} />
        )}
      </div>

      <footer className="footer">
        <p>💪 You've got this! Last updated: {new Date().toLocaleTimeString()}</p>
      </footer>
    </div>
  );
}

export default App;
