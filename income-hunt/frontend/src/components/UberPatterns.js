import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './UberPatterns.css';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function UberPatterns() {
  const [patterns, setPatterns] = useState(null);

  useEffect(() => {
    const fetch = () => axios.get('/api/uber-patterns').then((r) => setPatterns(r.data)).catch(() => {});
    fetch();
    const t = setInterval(fetch, 30000);
    return () => clearInterval(t);
  }, []);

  if (!patterns) return null;
  if (patterns.insufficient) {
    return <div className="uber-patterns-msg">Log 3+ shifts with start time to unlock pattern insights</div>;
  }

  const topWindows = patterns.topWindows || [];

  if (topWindows.length === 0) {
    return <div className="uber-patterns-msg">No patterns found yet</div>;
  }

  return (
    <div className="uber-patterns">
      <div className="patterns-title">🔥 Best windows</div>
      <div className="patterns-list">
        {topWindows.map((w, i) => (
          <div key={i} className="pattern-row">
            <span className="pattern-window">
              {DAY_NAMES[w.dayOfWeek]} {w.hourRange}
            </span>
            <span className="pattern-rate">${w.avgEarningsPerHour}/hr</span>
            <span className="pattern-count">{w.shiftCount} shifts</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default UberPatterns;
