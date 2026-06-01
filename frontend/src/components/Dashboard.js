import React, { useState } from 'react';
import './Dashboard.css';
import ExcelStyleChart from './ExcelStyleChart';
import PathCard from './PathCard';
import RevenueTracker from './RevenueTracker';
import TaskList from './TaskList';
import CountdownWidget from './CountdownWidget';

function Dashboard({ experiments, revenue, countdown, onRefresh }) {
  const [editMode, setEditMode] = useState(false);
  const [widgetVisibility, setWidgetVisibility] = useState({
    countdown: true,
    revenue: true,
    paths: true,
    chart: true,
    tasks: true
  });

  const toggleWidget = (widget) => {
    setWidgetVisibility({
      ...widgetVisibility,
      [widget]: !widgetVisibility[widget]
    });
  };

  const paths = ['ai-consulting', 'ai-tools', 'online-work', 'apps'];

  return (
    <div className="dashboard-container">
      <div className="dashboard-controls">
        <button
          onClick={() => setEditMode(!editMode)}
          className={`edit-mode-btn ${editMode ? 'active' : ''}`}
          title="Toggle customization mode"
        >
          {editMode ? '✓ Done Customizing' : '⚙️ Customize Layout'}
        </button>

        {editMode && (
          <div className="widget-toggle-panel">
            <label>
              <input
                type="checkbox"
                checked={widgetVisibility.countdown}
                onChange={() => toggleWidget('countdown')}
              />
              <span>Countdown</span>
            </label>
            <label>
              <input
                type="checkbox"
                checked={widgetVisibility.revenue}
                onChange={() => toggleWidget('revenue')}
              />
              <span>Revenue Tracker</span>
            </label>
            <label>
              <input
                type="checkbox"
                checked={widgetVisibility.paths}
                onChange={() => toggleWidget('paths')}
              />
              <span>Income Paths</span>
            </label>
            <label>
              <input
                type="checkbox"
                checked={widgetVisibility.chart}
                onChange={() => toggleWidget('chart')}
              />
              <span>Progress Chart</span>
            </label>
            <label>
              <input
                type="checkbox"
                checked={widgetVisibility.tasks}
                onChange={() => toggleWidget('tasks')}
              />
              <span>Daily Tasks</span>
            </label>
          </div>
        )}
      </div>

      <div className={`dashboard-grid ${editMode ? 'edit-mode' : ''}`}>
        {/* Top Row: Key Metrics */}
        <div className="grid-section">
          {widgetVisibility.countdown && (
            <div className={`widget countdown-widget ${editMode ? 'draggable' : ''}`}>
              <CountdownWidget countdown={countdown} />
            </div>
          )}

          {widgetVisibility.revenue && (
            <div className={`widget revenue-widget ${editMode ? 'draggable' : ''}`}>
              <RevenueTracker revenue={revenue} />
            </div>
          )}
        </div>

        {/* Income Paths Row */}
        {widgetVisibility.paths && (
          <div className="grid-section paths-section">
            <h2 className="section-title">📊 Your 4 Income Paths</h2>
            <div className="paths-grid">
              {paths.map(path => (
                <div key={path} className={`widget path-widget ${editMode ? 'draggable' : ''}`}>
                  <PathCard path={path} experiments={experiments} editMode={editMode} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Charts & Analytics Row */}
        {widgetVisibility.chart && (
          <div className="grid-section chart-section">
            <h2 className="section-title">📈 Progress Analytics</h2>
            <div className={`widget large-widget ${editMode ? 'draggable' : ''}`}>
              <ExcelStyleChart experiments={experiments} revenue={revenue} />
            </div>
          </div>
        )}

        {/* Quick Actions & Tasks */}
        {widgetVisibility.tasks && (
          <div className="grid-section tasks-section">
            <div className={`widget tasks-widget ${editMode ? 'draggable' : ''}`}>
              <TaskList experiments={experiments} />
            </div>
          </div>
        )}
      </div>

      {editMode && (
        <div className="edit-mode-hint">
          💡 Click & drag widgets to reorder them. Use checkboxes above to show/hide widgets.
        </div>
      )}
    </div>
  );
}

export default Dashboard;
