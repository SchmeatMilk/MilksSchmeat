import React from 'react';

function CountdownWidget({ countdown }) {
  const percentage = ((184 - countdown.daysLeft) / 184) * 100;

  return (
    <div className="stat-box">
      <div className="stat-label">⏳ Days Until Deadline</div>
      <div className="stat-value">{countdown.daysLeft}</div>
      <div style={{ fontSize: '14px', marginTop: '10px' }}>December 1, 2026</div>
      <div style={{
        height: '8px',
        background: 'rgba(255,255,255,0.2)',
        borderRadius: '4px',
        marginTop: '10px',
        overflow: 'hidden'
      }}>
        <div style={{
          height: '100%',
          width: `${percentage}%`,
          background: '#90c695',
          transition: 'width 0.3s ease'
        }}></div>
      </div>
      <div style={{ fontSize: '11px', marginTop: '8px', opacity: 0.8 }}>
        {Math.round(percentage)}% complete
      </div>
    </div>
  );
}

export default CountdownWidget;
