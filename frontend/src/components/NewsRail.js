import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Rail.css';

function timeAgo(iso) {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function NewsRail() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () => {
      setLoading(true);
      return axios.get('/api/news').then((r) => {
        setNews(r.data.items || r.data);
      }).catch((err) => {
        console.warn('News fetch failed:', err.message);
        setNews([]);
      }).finally(() => setLoading(false));
    };
    load();
    const t = setInterval(load, 15 * 60 * 1000); // refresh every 15 min
    return () => clearInterval(t);
  }, []);

  return (
    <aside className="rail">
      <div className="rail-head">
        <span className="rail-dot" /> LIVE HEADLINES
      </div>
      <div className="rail-scroll">
        {loading && news.length === 0 && <div className="rail-empty">Fetching headlines…</div>}
        {!loading && news.length === 0 && <div className="rail-empty">Set NEWS_API_KEY to see headlines</div>}
        {news.map((n, i) => (
          <a key={i} className="news-card" href={n.url} target="_blank" rel="noopener noreferrer">
            <div className="news-thumb">
              <img src={n.image} alt="" loading="lazy" onError={(e) => { e.currentTarget.parentElement.style.display = 'none'; }} />
            </div>
            <div className="news-body">
              <div className="news-title">{n.title}</div>
              <div className="news-meta">
                <span className="news-source">{n.source}</span>
                {n.publishedAt && <span className="news-time">{timeAgo(n.publishedAt)}</span>}
              </div>
            </div>
          </a>
        ))}
      </div>
    </aside>
  );
}

export default NewsRail;
