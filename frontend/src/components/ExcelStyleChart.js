import React from 'react';

function ExcelStyleChart({ experiments, revenue }) {
  const paths = ['ai-consulting', 'ai-tools', 'online-work', 'apps'];
  const pathLabels = {
    'ai-consulting': '🤝 AI Consulting',
    'ai-tools': '⚙️ AI Tools',
    'online-work': '💻 Online Work',
    'apps': '📱 Apps'
  };

  const getPathStats = (path) => {
    const pathExps = experiments.filter(e => e.path === path);
    const revenue = pathExps.reduce((sum, e) => sum + (e.revenueThisMonth || 0), 0);
    const hours = pathExps.reduce((sum, e) => sum + (e.hoursInvested || 0), 0);
    const active = pathExps.filter(e => e.status === 'active').length;
    return { revenue, hours, active, total: pathExps.length };
  };

  const stats = paths.map(path => ({
    path,
    ...getPathStats(path)
  }));

  const maxRevenue = Math.max(...stats.map(s => s.revenue), 1000);
  const maxHours = Math.max(...stats.map(s => s.hours), 10);

  return (
    <div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '15px',
        marginBottom: '30px'
      }}>
        {stats.map(stat => (
          <div key={stat.path} style={{
            background: 'linear-gradient(135deg, #4a7c2c 0%, #2d5016 100%)',
            color: '#fffbf0',
            padding: '15px',
            borderRadius: '6px',
            border: '1px solid #90c695'
          }}>
            <div style={{ fontSize: '13px', marginBottom: '8px' }}>{pathLabels[stat.path]}</div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px',
              fontSize: '12px'
            }}>
              <div>
                <div style={{ opacity: 0.8 }}>Revenue</div>
                <div style={{ fontSize: '16px', fontWeight: 700 }}>${stat.revenue.toFixed(0)}</div>
              </div>
              <div>
                <div style={{ opacity: 0.8 }}>Hours</div>
                <div style={{ fontSize: '16px', fontWeight: 700 }}>{stat.hours.toFixed(0)}h</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bar Chart */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ color: '#2d5016', marginBottom: '15px', fontSize: '14px', fontWeight: 700 }}>
          📊 Revenue by Path
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {stats.map(stat => (
            <div key={stat.path}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '13px' }}>
                <span style={{ fontWeight: 600, color: '#2d5016' }}>{pathLabels[stat.path]}</span>
                <span style={{ color: '#90c695', fontWeight: 700 }}>${stat.revenue.toFixed(0)}</span>
              </div>
              <div style={{
                height: '24px',
                background: '#f0f0ed',
                borderRadius: '4px',
                overflow: 'hidden',
                border: '1px solid #e8e8e5'
              }}>
                <div style={{
                  height: '100%',
                  width: `${(stat.revenue / maxRevenue) * 100}%`,
                  background: 'linear-gradient(90deg, #4a7c2c 0%, #90c695 100%)',
                  transition: 'width 0.3s ease'
                }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Hours Invested Chart */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ color: '#2d5016', marginBottom: '15px', fontSize: '14px', fontWeight: 700 }}>
          ⏱️ Hours Invested by Path
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {stats.map(stat => (
            <div key={stat.path}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '13px' }}>
                <span style={{ fontWeight: 600, color: '#2d5016' }}>{pathLabels[stat.path]}</span>
                <span style={{ color: '#90c695', fontWeight: 700 }}>{stat.hours.toFixed(1)}h</span>
              </div>
              <div style={{
                height: '24px',
                background: '#f0f0ed',
                borderRadius: '4px',
                overflow: 'hidden',
                border: '1px solid #e8e8e5'
              }}>
                <div style={{
                  height: '100%',
                  width: `${(stat.hours / maxHours) * 100}%`,
                  background: 'linear-gradient(90deg, #2d5016 0%, #4a7c2c 100%)',
                  transition: 'width 0.3s ease'
                }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary Table */}
      <div>
        <h3 style={{ color: '#2d5016', marginBottom: '15px', fontSize: '14px', fontWeight: 700 }}>
          📋 Summary Table
        </h3>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '13px'
        }}>
          <thead>
            <tr style={{ background: '#4a7c2c', color: '#fffbf0' }}>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, borderBottom: '2px solid #90c695' }}>
                Path
              </th>
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600, borderBottom: '2px solid #90c695' }}>
                Revenue
              </th>
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600, borderBottom: '2px solid #90c695' }}>
                Hours
              </th>
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600, borderBottom: '2px solid #90c695' }}>
                Active
              </th>
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600, borderBottom: '2px solid #90c695' }}>
                Total Exp.
              </th>
            </tr>
          </thead>
          <tbody>
            {stats.map((stat, idx) => (
              <tr key={stat.path} style={{
                background: idx % 2 === 0 ? '#f9f9f7' : 'white',
                borderBottom: '1px solid #e8e8e5'
              }}>
                <td style={{ padding: '12px' }}>
                  <strong style={{ color: '#2d5016' }}>{pathLabels[stat.path]}</strong>
                </td>
                <td style={{ padding: '12px', textAlign: 'center', color: '#90c695', fontWeight: 600 }}>
                  ${stat.revenue.toFixed(0)}
                </td>
                <td style={{ padding: '12px', textAlign: 'center', color: '#2d5016', fontWeight: 600 }}>
                  {stat.hours.toFixed(1)}h
                </td>
                <td style={{ padding: '12px', textAlign: 'center', color: '#2d5016', fontWeight: 600 }}>
                  {stat.active}
                </td>
                <td style={{ padding: '12px', textAlign: 'center', color: '#2d5016', fontWeight: 600 }}>
                  {stat.total}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ExcelStyleChart;
