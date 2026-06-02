import React, { useMemo } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import Widget from './Widget';
import ChartCard from './ChartCard';
import AnimatedNumber from './AnimatedNumber';
import TaskList from './TaskList';
import { theme, pathInfo } from '../theme';
import './Dashboard.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

const PATHS = ['ai-consulting', 'ai-tools', 'online-work', 'apps'];

// Default widget positions (12-col grid). Users drag/resize freely.
const layouts = {
  lg: [
    { i: 'revenue', x: 0, y: 0, w: 5, h: 9, minW: 3, minH: 7 },
    { i: 'countdown', x: 5, y: 0, w: 3, h: 9, minW: 2, minH: 7 },
    { i: 'tasks', x: 8, y: 0, w: 4, h: 13, minW: 3, minH: 8 },
    { i: 'hours', x: 0, y: 9, w: 4, h: 10, minW: 3, minH: 7 },
    { i: 'experiments', x: 4, y: 9, w: 4, h: 10, minW: 3, minH: 7 },
  ],
  md: [
    { i: 'revenue', x: 0, y: 0, w: 6, h: 9 },
    { i: 'countdown', x: 6, y: 0, w: 4, h: 9 },
    { i: 'tasks', x: 0, y: 9, w: 5, h: 11 },
    { i: 'hours', x: 5, y: 9, w: 5, h: 11 },
    { i: 'experiments', x: 0, y: 20, w: 10, h: 9 },
  ],
  sm: [
    { i: 'revenue', x: 0, y: 0, w: 6, h: 9 },
    { i: 'countdown', x: 0, y: 9, w: 6, h: 8 },
    { i: 'hours', x: 0, y: 17, w: 6, h: 9 },
    { i: 'experiments', x: 0, y: 26, w: 6, h: 9 },
    { i: 'tasks', x: 0, y: 35, w: 6, h: 11 },
  ],
};

function Dashboard({ experiments, revenue, countdown }) {
  const pathData = useMemo(() => PATHS.map((p) => {
    const exps = experiments.filter((e) => e.path === p);
    return {
      key: p,
      name: pathInfo[p].short,
      revenue: exps.reduce((s, e) => s + (e.revenueThisMonth || 0), 0),
      hours: exps.reduce((s, e) => s + (e.hoursInvested || 0), 0),
      count: exps.filter((e) => e.status !== 'completed').length,
    };
  }), [experiments]);

  const revenueChart = pathData.map((d) => ({ name: d.name, value: d.revenue }));
  const hoursChart = pathData.map((d) => ({ name: d.name, value: d.hours }));
  const countChart = pathData.map((d) => ({ name: d.name, value: d.count }));

  const totalRevenue = revenue.thisMonth || 0;
  const pct = Math.min(100, (totalRevenue / (revenue.target || 5000)) * 100);
  const timelinePct = Math.min(100, ((184 - countdown.daysLeft) / 184) * 100);

  return (
    <ResponsiveGridLayout
      className="dashboard-rgl"
      layouts={layouts}
      breakpoints={{ lg: 1100, md: 760, sm: 0 }}
      cols={{ lg: 12, md: 10, sm: 6 }}
      rowHeight={30}
      margin={[18, 18]}
      draggableHandle=".widget-drag-handle"
      useCSSTransforms
    >
      {/* REVENUE */}
      <div key="revenue">
        <Widget
          title="Monthly Revenue"
          icon="💰"
          accent={theme.colors.sage}
          headerRight={<span className="widget-pill">{Math.round(pct)}% of ${revenue.target}</span>}
        >
          <div className="stat-figure">
            <AnimatedNumber value={totalRevenue} prefix="$" />
          </div>
          <div className="stat-caption">of ${(revenue.target || 5000).toLocaleString()} CAD target this month</div>
          <div className="mini-progress">
            <div className="mini-progress-fill" style={{ width: `${pct}%`, background: theme.colors.sage }} />
          </div>
          <div style={{ marginTop: 14 }}>
            <ChartCard data={revenueChart} chartTypes={['bar', 'line', 'area', 'pie']} defaultType="bar" height={170} />
          </div>
        </Widget>
      </div>

      {/* COUNTDOWN */}
      <div key="countdown">
        <Widget title="Timeline" icon="⏳" accent={theme.colors.slate}>
          <div className="countdown-wrap">
            <div className="radial-gauge" style={{ '--p': `${timelinePct}%` }}>
              <div className="radial-inner">
                <div className="stat-figure" style={{ fontSize: 34 }}>
                  <AnimatedNumber value={countdown.daysLeft} />
                </div>
                <div className="stat-caption">days left</div>
              </div>
            </div>
            <div className="countdown-meta">
              <div className="countdown-target">🎯 December 1, 2026</div>
              <div className="stat-caption">{Math.round(timelinePct)}% of journey elapsed</div>
            </div>
          </div>
        </Widget>
      </div>

      {/* TASKS */}
      <div key="tasks">
        <Widget title="Today's Tasks" icon="✅" accent={theme.colors.sand}>
          <TaskList experiments={experiments} />
        </Widget>
      </div>

      {/* HOURS */}
      <div key="hours">
        <Widget title="Hours Invested" icon="⏱️" accent={theme.colors.slate}>
          <div className="stat-figure" style={{ fontSize: 30 }}>
            <AnimatedNumber value={pathData.reduce((s, d) => s + d.hours, 0)} decimals={1} suffix="h" />
          </div>
          <div className="stat-caption">total across all paths</div>
          <div style={{ marginTop: 12 }}>
            <ChartCard data={hoursChart} chartTypes={['bar', 'area', 'radial', 'pie']} defaultType="area" height={150} />
          </div>
        </Widget>
      </div>

      {/* EXPERIMENTS */}
      <div key="experiments">
        <Widget title="Active Experiments" icon="🔬" accent={theme.colors.blush}>
          <div className="stat-figure" style={{ fontSize: 30 }}>
            <AnimatedNumber value={pathData.reduce((s, d) => s + d.count, 0)} />
          </div>
          <div className="stat-caption">experiments in flight</div>
          <div style={{ marginTop: 12 }}>
            <ChartCard data={countChart} chartTypes={['bar', 'pie', 'radial']} defaultType="pie" height={150} />
          </div>
        </Widget>
      </div>
    </ResponsiveGridLayout>
  );
}

export default Dashboard;
