import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Rail.css';

function formatScore(n) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
}

function TrendsRail() {
  const [trends, setTrends] = useState([]);
  const [isSample, setIsSample] = useState(false);

  useEffect(() => {
    const load = () => axios.get('/api/trends').then((r) => {
      setTrends(r.data.items || r.data);
      setIsSample(r.data.isSample || false);
    }).catch(() => {});
    load();
    const t = setInterval(load, 10 * 60 * 1000); // refresh every 10 min
    return () => clearInterval(t);
  }, []);

  return (
    <aside className="rail">
      <div className="rail-head">
        <span className="rail-dot trends" /> TOP 20 X TRENDING
        {isSample && <span className="rail-badge">sample data</span>}
      </div>
      <div className="rail-scroll">
        {trends.length === 0 && <div className="rail-empty">Fetching trends…</div>}
        {trends.map((t, i) => (
          <a key={i} className="trend-card" href={t.url} target="_blank" rel="noopener noreferrer">
            <span className="trend-rank">{t.rank || i + 1}</span>
            <div className="trend-thumb">
              <img src={t.thumbnail} alt="" loading="lazy" onError={(e) => { e.currentTarget.parentElement.style.display = 'none'; }} />
            </div>
            <div className="trend-body">
              <div className="trend-title">{t.title}</div>
              <div className="trend-meta">
                <span className="trend-source">{t.source}</span>
                <span className="trend-score">▲ {formatScore(t.score)}</span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </aside>
  );
}

export default TrendsRail;
