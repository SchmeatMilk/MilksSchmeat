import React from 'react';
import './RevenueMilestone.css';

function RevenueMilestone({ revenue }) {
  const percentage = Math.min(100, (revenue.thisMonth / revenue.target) * 100);

  return (
    <div className="revenue-card">
      <h2>💰 This Month's Revenue</h2>
      <div className="revenue-amount">${revenue.thisMonth.toFixed(0)}</div>
      <div className="revenue-target">of ${revenue.target.toFixed(0)} target</div>

      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${percentage}%` }}></div>
      </div>

      <div className="revenue-stats">
        <div className="stat">
          <span className="label">This Month</span>
          <span className="value">${revenue.thisMonth.toFixed(0)}</span>
        </div>
        <div className="stat">
          <span className="label">Cumulative</span>
          <span className="value">${revenue.cumulative.toFixed(0)}</span>
        </div>
      </div>

      <p className="revenue-status">
        {percentage >= 100 ? '🎉 Target reached!' : `${Math.round(percentage)}% of goal`}
      </p>
    </div>
  );
}

export default RevenueMilestone;
