import React from 'react';

const pathInfo = {
  'ai-consulting': { name: 'AI Consulting', emoji: '🤝', color: '#2d5016' },
  'ai-tools': { name: 'AI Tools', emoji: '⚙️', color: '#4a7c2c' },
  'online-work': { name: 'Online Work', emoji: '💻', color: '#90c695' },
  'apps': { name: 'Monetizable Apps', emoji: '📱', color: '#b8d9b8' }
};

function PathCard({ path, experiments, editMode }) {
  const pathExps = experiments.filter(e => e.path === path && e.status !== 'completed');
  const totalRevenue = pathExps.reduce((sum, e) => sum + (e.revenueThisMonth || 0), 0);
  const totalHours = pathExps.reduce((sum, e) => sum + (e.hoursInvested || 0), 0);
  const info = pathInfo[path];

  return (
    <div style={{
      borderTop: `4px solid ${info.color}`,
      cursor: editMode ? 'move' : 'default'
    }}>
      <div style={{
        background: info.color,
        color: '#fffbf0',
        padding: '15px',
        borderRadius: '6px 6px 0 0',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '15px'
      }}>
        <span style={{ fontSize: '24px' }}>{info.emoji}</span>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>{info.name}</h3>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
        marginBottom: '15px'
      }}>
        <div style={{
          background: '#f9f9f7',
          padding: '12px',
          borderRadius: '4px',
          borderLeft: `3px solid ${info.color}`
        }}>
          <div style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Active Experiments
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#2d5016', marginTop: '5px' }}>
            {pathExps.length}
          </div>
        </div>

        <div style={{
          background: '#f9f9f7',
          padding: '12px',
          borderRadius: '4px',
          borderLeft: `3px solid ${info.color}`
        }}>
          <div style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            This Month
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#2d5016', marginTop: '5px' }}>
            ${totalRevenue.toFixed(0)}
          </div>
        </div>
      </div>

      <div style={{
        background: '#f9f9f7',
        padding: '12px',
        borderRadius: '4px',
        borderLeft: `3px solid ${info.color}`,
        marginBottom: '15px'
      }}>
        <div style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Hours Invested
        </div>
        <div style={{ fontSize: '18px', fontWeight: 700, color: '#2d5016', marginTop: '5px' }}>
          {totalHours.toFixed(1)}h
        </div>
      </div>

      {pathExps.length > 0 && (
        <div>
          <div style={{
            fontSize: '12px',
            fontWeight: 600,
            color: '#666',
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Current Experiments
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {pathExps.slice(0, 3).map(exp => (
              <li key={exp.id} style={{
                fontSize: '13px',
                padding: '8px 0',
                borderBottom: '1px solid #eee',
                color: '#2d5016'
              }}>
                <strong>{exp.name}</strong>
              </li>
            ))}
          </ul>
          {pathExps.length > 3 && (
            <div style={{
              fontSize: '12px',
              color: '#90c695',
              fontWeight: 600,
              marginTop: '8px',
              textAlign: 'center'
            }}>
              +{pathExps.length - 3} more
            </div>
          )}
        </div>
      )}

      {pathExps.length === 0 && (
        <div style={{
          textAlign: 'center',
          color: '#999',
          fontSize: '13px',
          fontStyle: 'italic',
          padding: '15px 0'
        }}>
          No active experiments
        </div>
      )}
    </div>
  );
}

export default PathCard;
