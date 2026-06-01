import React from 'react';
import './Dashboard.css';

const pathInfo = {
  'ai-consulting': { name: 'Help Businesses Apply AI', emoji: '🤝', color: '#667eea' },
  'ai-tools': { name: 'Create AI Tools', emoji: '⚙️', color: '#764ba2' },
  'online-work': { name: 'AI-Powered Online Work', emoji: '💻', color: '#f093fb' },
  'apps': { name: 'Monetizable Apps', emoji: '📱', color: '#f5576c' }
};

function Dashboard({ experiments, onRefresh }) {
  const paths = ['ai-consulting', 'ai-tools', 'online-work', 'apps'];

  const getPathStats = (path) => {
    const pathExps = experiments.filter(e => e.path === path && e.status !== 'completed');
    const totalRevenue = pathExps.reduce((sum, e) => sum + (e.revenueThisMonth || 0), 0);
    const totalHours = pathExps.reduce((sum, e) => sum + (e.hoursInvested || 0), 0);

    return {
      count: pathExps.length,
      revenue: totalRevenue,
      hours: totalHours,
      experiments: pathExps
    };
  };

  return (
    <div className="dashboard">
      <h2>📊 Your 4 Income Paths</h2>
      <div className="paths-grid">
        {paths.map(path => {
          const stats = getPathStats(path);
          const info = pathInfo[path];

          return (
            <div key={path} className="path-card" style={{ borderLeftColor: info.color }}>
              <div className="path-header" style={{ backgroundColor: info.color }}>
                <span className="path-emoji">{info.emoji}</span>
                <h3>{info.name}</h3>
              </div>

              <div className="path-content">
                <div className="stat-row">
                  <span className="label">Active Experiments</span>
                  <span className="value">{stats.count}</span>
                </div>

                <div className="stat-row">
                  <span className="label">This Month Revenue</span>
                  <span className="value">${stats.revenue.toFixed(0)}</span>
                </div>

                <div className="stat-row">
                  <span className="label">Hours Invested</span>
                  <span className="value">{stats.hours.toFixed(1)}</span>
                </div>

                {stats.experiments.length > 0 && (
                  <div className="experiments-list">
                    <p className="list-title">Current experiments:</p>
                    <ul>
                      {stats.experiments.slice(0, 3).map(exp => (
                        <li key={exp.id}>
                          <strong>{exp.name}</strong>
                          {exp.nextAction && <small>→ {exp.nextAction}</small>}
                        </li>
                      ))}
                    </ul>
                    {stats.experiments.length > 3 && (
                      <p className="more-text">+{stats.experiments.length - 3} more</p>
                    )}
                  </div>
                )}

                {stats.count === 0 && (
                  <p className="no-experiments">No active experiments yet. Start one today! 🚀</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="action-section">
        <button onClick={onRefresh} className="refresh-btn">🔄 Refresh Data</button>
      </div>
    </div>
  );
}

export default Dashboard;
