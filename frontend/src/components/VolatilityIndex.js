import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { theme } from '../theme';
import './VolatilityIndex.css';

function VolatilityIndex() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetch = () => axios.get('/api/volatility').then((r) => setData(r.data)).catch(() => {});
    fetch();
    const t = setInterval(fetch, 30000);
    return () => clearInterval(t);
  }, []);

  if (!data) return <div className="volatility-empty">Loading…</div>;
  if (data.insufficient) return <div className="volatility-empty">Log more days to unlock forecast 📈</div>;

  const scoreColor = {
    low: theme.colors.sage,
    medium: theme.colors.sand,
    high: theme.colors.amber,
  }[data.score] || theme.colors.slate;

  const scoreEmoji = {
    low: '✅',
    medium: '⚠️',
    high: '🔴',
  }[data.score] || '❓';

  return (
    <div className="volatility">
      <div className="volatility-score">
        <div className="score-emoji">{scoreEmoji}</div>
        <div className="score-label">
          <div className="score-name" style={{ color: scoreColor }}>
            {data.score === 'low' ? 'Low' : data.score === 'medium' ? 'Medium' : 'High'} volatility
          </div>
          <div className="score-sub">σ = ${data.stdDev}</div>
        </div>
      </div>

      <div className="forecast-title">Month-end projection</div>
      <div className="forecast-range">
        <div className="forecast-bound">
          <div className="bound-label">Pessimistic</div>
          <div className="bound-value">${data.forecast.p5}</div>
        </div>
        <div className="forecast-mid">
          <div className="mid-label">Expected</div>
          <div className="mid-value" style={{ color: scoreColor }}>${data.forecast.p50}</div>
        </div>
        <div className="forecast-bound">
          <div className="bound-label">Optimistic</div>
          <div className="bound-value">${data.forecast.p95}</div>
        </div>
      </div>

      <div className="volatility-meta">
        <div className="meta-item">
          <span className="meta-label">Current</span>
          <span className="meta-value">${Math.round(data.currentMonthRevenue)}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Days left</span>
          <span className="meta-value">{data.daysRemainingInMonth}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Sample</span>
          <span className="meta-value">{data.sampleSize}d</span>
        </div>
      </div>
    </div>
  );
}

export default VolatilityIndex;
