import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Consistency.css';

// Consistency, not a fragile streak. Shows a 14-day grid + a rate. "Never miss
// twice": only warns (amber) if both yesterday and today are unlogged.
function Consistency() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetch = () => axios.get('/api/consistency').then((r) => setData(r.data)).catch(() => {});
    fetch();
    const t = setInterval(fetch, 60000);
    return () => clearInterval(t);
  }, []);

  if (!data) return <div className="consist-empty">Loading…</div>;

  const streak = data.currentStreak || 0;
  const onStreak = streak >= 3;

  return (
    <div className="consist">
      <div className="consist-top">
        {onStreak ? (
          <>
            <div className="consist-rate">🔥 {streak}-day streak</div>
            <div className="consist-sub">{data.rate}% · {data.count} of 14 days logged</div>
          </>
        ) : (
          <>
            <div className="consist-rate">{data.rate}%</div>
            <div className="consist-sub">{data.count} of 14 days logged</div>
          </>
        )}
      </div>

      <div className="consist-grid">
        {data.series.map((d) => (
          <div
            key={d.date}
            className={`consist-cell ${d.done ? 'done' : ''}`}
            title={`${d.date}: ${d.done ? 'logged' : 'no check-in'}`}
          />
        ))}
      </div>

      {data.missTwice ? (
        <div className="consist-nudge warn">Don't miss twice — log a quick check-in today. 🌱</div>
      ) : onStreak ? (
        <div className="consist-nudge ok">You're on a {streak}-day streak. One log keeps it alive. 🔥</div>
      ) : (
        <div className="consist-nudge ok">Nice rhythm. Consistency beats intensity. ✨</div>
      )}
    </div>
  );
}

export default Consistency;
