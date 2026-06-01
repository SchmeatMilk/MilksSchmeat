import React from 'react';

function RevenueTracker({ revenue }) {
  const percentage = Math.min(100, (revenue.thisMonth / revenue.target) * 100);
  const remaining = revenue.target - revenue.thisMonth;

  return (
    <div className="stat-box">
      <div className="stat-label">💰 Monthly Revenue Progress</div>
      <div className="stat-value">${revenue.thisMonth.toFixed(0)}</div>
      <div style={{ fontSize: '13px', marginTop: '5px' }}>of ${revenue.target} target</div>

      <div style={{
        height: '12px',
        background: 'rgba(255,255,255,0.2)',
        borderRadius: '4px',
        marginTop: '12px',
        overflow: 'hidden'
      }}>
        <div style={{
          height: '100%',
          width: `${percentage}%`,
          background: '#90c695',
          transition: 'width 0.3s ease'
        }}></div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '10px',
        marginTop: '12px',
        fontSize: '12px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ opacity: 0.8 }}>This Month</div>
          <div style={{ fontWeight: 700, fontSize: '14px' }}>${revenue.thisMonth.toFixed(0)}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ opacity: 0.8 }}>Remaining</div>
          <div style={{ fontWeight: 700, fontSize: '14px', color: remaining > 0 ? '#fff' : '#90c695' }}>
            ${Math.max(0, remaining).toFixed(0)}
          </div>
        </div>
      </div>

      <div style={{ fontSize: '11px', marginTop: '10px', opacity: 0.8 }}>
        {percentage >= 100 ? '🎉 Target reached!' : `${Math.round(percentage)}% of goal`}
      </div>
    </div>
  );
}

export default RevenueTracker;
