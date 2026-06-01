import React from 'react';
import './Countdown.css';

function Countdown({ countdown }) {
  const isUrgent = countdown.daysLeft < 100;

  return (
    <div className={`countdown-card ${isUrgent ? 'urgent' : ''}`}>
      <h2>⏳ Deadline Countdown</h2>
      <div className="countdown-number">{countdown.daysLeft}</div>
      <p className="countdown-label">days remaining</p>
      <p className="countdown-date">Target: December 1, 2026</p>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${Math.min(100, (184 - countdown.daysLeft) / 1.84)}%` }}></div>
      </div>
      <p className="countdown-status">
        {countdown.daysLeft > 90 ? '✅ Plenty of time' : countdown.daysLeft > 30 ? '⚠️ Halfway there' : '🔥 Final push!'}
      </p>
    </div>
  );
}

export default Countdown;
