import React, { useMemo } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts';
import Widget from './Widget';
import ChartCard from './ChartCard';
import AnimatedNumber from './AnimatedNumber';
import TaskList from './TaskList';
import { theme, pathInfo } from '../theme';
import './Dashboard.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

const PATHS = ['ai-consulting', 'ai-tools', 'online-work', 'apps'];
const MONTHS = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const layouts = {
  lg: [
    { i: 'revenue', x: 0, y: 0, w: 5, h: 10, minW: 3, minH: 8 },
    { i: 'countdown', x: 5, y: 0, w: 3, h: 10, minW: 2, minH: 8 },
    { i: 'tasks', x: 8, y: 0, w: 4, h: 21, minW: 3, minH: 9 },
    { i: 'pace', x: 0, y: 10, w: 8, h: 11, minW: 4, minH: 8 },
    { i: 'hours', x: 0, y: 21, w: 4, h: 11, minW: 3, minH: 8 },
    { i: 'experiments', x: 4, y: 21, w: 4, h: 11, minW: 3, minH: 8 },
    { i: 'comparison', x: 8, y: 21, w: 4, h: 11, minW: 3, minH: 8 },
  ],
  md: [
    { i: 'revenue', x: 0, y: 0, w: 5, h: 10 },
    { i: 'countdown', x: 5, y: 0, w: 5, h: 10 },
    { i: 'pace', x: 0, y: 10, w: 10, h: 10 },
    { i: 'tasks', x: 0, y: 20, w: 5, h: 11 },
    { i: 'hours', x: 5, y: 20, w: 5, h: 11 },
    { i: 'experiments', x: 0, y: 31, w: 5, h: 10 },
    { i: 'comparison', x: 5, y: 31, w: 5, h: 10 },
  ],
  sm: [
    { i: 'revenue', x: 0, y: 0, w: 6, h: 10 },
    { i: 'countdown', x: 0, y: 10, w: 6, h: 9 },
    { i: 'pace', x: 0, y: 19, w: 6, h: 10 },
    { i: 'hours', x: 0, y: 29, w: 6, h: 10 },
    { i: 'experiments', x: 0, y: 39, w: 6, h: 10 },
    { i: 'comparison', x: 0, y: 49, w: 6, h: 10 },
    { i: 'tasks', x: 0, y: 59, w: 6, h: 11 },
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
  const totalHours = pathData.reduce((s, d) => s + d.hours, 0);
  const totalExp = pathData.reduce((s, d) => s + d.count, 0);
  const target = revenue.target || 5000;
  const pct = Math.min(100, (totalRevenue / target) * 100);
  const timelinePct = Math.min(100, ((184 - countdown.daysLeft) / 184) * 100);

  // Monthly pace series — actual revenue lands on the current month; target line flat at monthly goal.
  const currentMonthIdx = Math.max(0, new Date().getMonth() - 5); // Jun = index 0
  const paceData = MONTHS.map((m, i) => ({
    name: m,
    actual: i === currentMonthIdx ? totalRevenue : (i < currentMonthIdx ? 0 : null),
    target,
  }));

  const comparisonData = pathData.map((d) => ({ name: d.name, revenue: d.revenue, hours: d.hours }));

  const tip = {
    background: 'rgba(255,255,255,0.97)',
    border: `1px solid ${theme.colors.border}`,
    borderRadius: 10,
    fontSize: 12,
    color: theme.colors.textPrimary,
  };

  return (
    <ResponsiveGridLayout
      className="dashboard-rgl"
      layouts={layouts}
      breakpoints={{ lg: 1100, md: 760, sm: 0 }}
      cols={{ lg: 12, md: 10, sm: 6 }}
      rowHeight={26}
      margin={[12, 12]}
      draggableHandle=".widget-drag-handle"
      useCSSTransforms
    >
      {/* REVENUE */}
      <div key="revenue">
        <Widget title="Monthly Revenue" icon="💰" accent={theme.colors.sage}
          headerRight={<span className="widget-pill">{Math.round(pct)}% of ${target}</span>}>
          <div className="stat-figure"><AnimatedNumber value={totalRevenue} prefix="$" /></div>
          <div className="stat-caption">of ${target.toLocaleString()} CAD target this month</div>
          <div className="mini-progress">
            <div className="mini-progress-fill" style={{ width: `${pct}%`, background: theme.colors.sage }} />
          </div>
          <div style={{ marginTop: 12 }}>
            <ChartCard data={revenueChart} chartTypes={['bar', 'line', 'area', 'pie']} defaultType="bar" height={180} />
          </div>
        </Widget>
      </div>

      {/* COUNTDOWN */}
      <div key="countdown">
        <Widget title="Timeline" icon="⏳" accent={theme.colors.slate}>
          <div className="countdown-wrap">
            <div className="radial-gauge" style={{ '--p': `${timelinePct}%` }}>
              <div className="radial-inner">
                <div className="stat-figure" style={{ fontSize: 34 }}><AnimatedNumber value={countdown.daysLeft} /></div>
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
          <TaskList />
        </Widget>
      </div>

      {/* REVENUE PACE (big trend) */}
      <div key="pace">
        <Widget title="Revenue Pace vs Target" icon="📈" accent={theme.colors.sage}>
          <ResponsiveContainer width="100%" height="100%" minHeight={150}>
            <ComposedChart data={paceData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="paceFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={theme.colors.sage} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={theme.colors.sage} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.grid} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: theme.colors.textSecondary }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: theme.colors.textSecondary }} axisLine={false} tickLine={false} width={44} />
              <Tooltip contentStyle={tip} />
              <ReferenceLine y={target} stroke={theme.colors.clay} strokeDasharray="5 4" label={{ value: 'Target', fontSize: 10, fill: theme.colors.clay, position: 'insideTopRight' }} />
              <Bar dataKey="actual" name="Actual" barSize={26} radius={[6, 6, 0, 0]} fill={theme.colors.sage} fillOpacity={0.9} />
              <Line type="monotone" dataKey="actual" name="Trend" stroke={theme.colors.slate} strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </Widget>
      </div>

      {/* HOURS */}
      <div key="hours">
        <Widget title="Hours Invested" icon="⏱️" accent={theme.colors.slate}>
          <div className="stat-figure" style={{ fontSize: 28 }}><AnimatedNumber value={totalHours} decimals={1} suffix="h" /></div>
          <div className="stat-caption">total across all paths</div>
          <div style={{ marginTop: 10 }}>
            <ChartCard data={hoursChart} chartTypes={['bar', 'area', 'radial', 'pie']} defaultType="area" height={150} />
          </div>
        </Widget>
      </div>

      {/* EXPERIMENTS */}
      <div key="experiments">
        <Widget title="Active Experiments" icon="🔬" accent={theme.colors.blush}>
          <div className="stat-figure" style={{ fontSize: 28 }}><AnimatedNumber value={totalExp} /></div>
          <div className="stat-caption">experiments in flight</div>
          <div style={{ marginTop: 10 }}>
            <ChartCard data={countChart} chartTypes={['pie', 'bar', 'radial']} defaultType="pie" height={150} />
          </div>
        </Widget>
      </div>

      {/* PATHS COMPARISON (revenue vs hours) */}
      <div key="comparison">
        <Widget title="Paths: Revenue × Hours" icon="📊" accent={theme.colors.plum}>
          <ResponsiveContainer width="100%" height="100%" minHeight={150}>
            <ComposedChart data={comparisonData} margin={{ top: 8, right: 6, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.grid} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: theme.colors.textSecondary }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="l" tick={{ fontSize: 10, fill: theme.colors.textSecondary }} axisLine={false} tickLine={false} width={40} />
              <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 10, fill: theme.colors.textSecondary }} axisLine={false} tickLine={false} width={30} />
              <Tooltip contentStyle={tip} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="l" dataKey="revenue" name="Revenue $" barSize={20} radius={[6, 6, 0, 0]} fill={theme.colors.sage} />
              <Line yAxisId="r" type="monotone" dataKey="hours" name="Hours" stroke={theme.colors.clay} strokeWidth={2.5} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </Widget>
      </div>
    </ResponsiveGridLayout>
  );
}

export default Dashboard;
