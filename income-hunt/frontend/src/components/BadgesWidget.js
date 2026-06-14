import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './BadgesWidget.css';

function BadgesWidget() {
  const [milestones, setMilestones] = useState([]);

  useEffect(() => {
    const fetch = () => axios.get('/api/milestones').then((r) => setMilestones(r.data.earned || [])).catch(() => {});
    fetch();
    const t = setInterval(fetch, 30000);
    return () => clearInterval(t);
  }, []);

  const sortedBadges = [...milestones].sort((a, b) => new Date(b.earnedAt) - new Date(a.earnedAt));

  return (
    <div className="badges-widget">
      {sortedBadges.length === 0 ? (
        <div className="badges-empty">Your first badge is one log away 🌱</div>
      ) : (
        <div className="badges-grid">
          {sortedBadges.map((badge) => {
            const isRecent = new Date() - new Date(badge.earnedAt) < 24 * 60 * 60 * 1000;
            return (
              <div
                key={badge.id}
                className={`badge-item ${isRecent ? 'recent' : ''}`}
                title={badge.message}
              >
                <div className="badge-emoji">{badge.emoji}</div>
                <div className="badge-title">{badge.milestoneType}</div>
                <div className="badge-date">
                  {new Date(badge.earnedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default BadgesWidget;
