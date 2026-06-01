import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import Dashboard from './components/Dashboard';

function App() {
  const [experiments, setExperiments] = useState([]);
  const [revenue, setRevenue] = useState({ thisMonth: 0, cumulative: 0, target: 5000, progress: 0 });
  const [countdown, setCountdown] = useState({ daysLeft: 0, deadline: '', targetRevenue: 5000 });
  const [quote, setQuote] = useState('');
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchData();
    fetchQuote();
    fetchNews();
    const interval = setInterval(fetchData, 30000);
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

  const fetchQuote = () => {
    const quotes = [
      "The only way to do great work is to love what you do. - Steve Jobs",
      "Success is not final, failure is not fatal. - Winston Churchill",
      "Believe you can and you're halfway there. - Theodore Roosevelt",
      "Don't watch the clock; do what it does. Keep going. - Sam Levenson",
      "The future belongs to those who believe in the beauty of their dreams. - Eleanor Roosevelt",
      "It is during our darkest moments that we must focus to see the light. - Aristotle",
      "The only impossible journey is the one you never begin. - Tony Robbins",
      "Your limitation—it's only your imagination. Push beyond it.",
      "Great things never come from comfort zones.",
      "Dream bigger. Do bigger."
    ];
    setQuote(quotes[Math.floor(Math.random() * quotes.length)]);
  };

  const fetchNews = async () => {
    try {
      const response = await axios.get('/api/news');
      setNews(response.data);
    } catch (error) {
      console.warn('News fetch failed (optional):', error.message);
    }
  };

  const handleSystemUpdate = async () => {
    setUpdating(true);
    try {
      const response = await axios.post('/api/system-update');
      console.log('System update result:', response.data);
      await fetchData();
      alert('✅ Dashboard updated from source data!');
    } catch (error) {
      console.error('Update error:', error);
      alert('⚠️ Update encountered an issue. Check console.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <div className="loading">📊 Loading your dashboard...</div>;
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-top">
          <button
            onClick={handleSystemUpdate}
            disabled={updating}
            className="update-btn"
            title="Pull latest data from source files"
          >
            {updating ? '🔄 Updating...' : '🔄 Auto Update'}
          </button>
          <h1>Income Hunt Dashboard</h1>
          <div className="header-spacer"></div>
        </div>
        <div className="quote-section">
          <p className="daily-quote">💡 {quote}</p>
        </div>
      </header>

      <div className="main-container">
        <Dashboard
          experiments={experiments}
          revenue={revenue}
          countdown={countdown}
          onRefresh={fetchData}
        />

        <aside className="news-sidebar">
          <h3>📰 Today's Headlines</h3>
          <div className="news-list">
            {news.length > 0 ? (
              news.map((item, idx) => (
                <div key={idx} className="news-item">
                  <a href={item.url} target="_blank" rel="noopener noreferrer">
                    <strong>{item.title}</strong>
                  </a>
                  <p>{item.source}</p>
                </div>
              ))
            ) : (
              <p className="news-placeholder">News headlines loading...</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default App;
