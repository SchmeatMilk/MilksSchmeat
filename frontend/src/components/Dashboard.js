import React, { useMemo } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import Widget from './Widget';
import ChartCard from './ChartCard';
import AnimatedNumber from './AnimatedNumber';
import TaskList from './TaskList';
import NextMove from './NextMove';
import BurnupChart from './BurnupChart';
import Consistency from './Consistency';
import UberTracker from './UberTracker';
import { theme, pathInfo } from '../theme';
import './Dashboard.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

const PATHS = ['ai-consulting', 'ai-tools', 'online-work', 'apps', 'uber-delivery'];

const layouts = {
  lg: [
    { i: 'nextmove', x: 0, y: 0, w: 12, h: 4, minW: 6, minH: 4 },
    { i: 'revenue', x: 0, y: 4, w: 5, h: 11, minW: 3, minH: 8 },
    { i: 'countdown', x: 5, y: 4, w: 3, h: 11, minW: 2, minH: 8 },
    { i: 'tasks', x: 8, y: 4, w: 4, h: 22, minW: 3, minH: 9 },
    { i: 'burnup', x: 0, y: 15, w: 8, h: 12, minW: 4, minH: 9 },
    { i: 'hours', x: 0, y: 27, w: 4, h: 11, minW: 3, minH: 8 },
    { i: 'uber', x: 4, y: 27, w: 4, h: 13, minW: 3, minH: 10 },
    { i: 'experiments', x: 8, y: 27, w: 4, h: 11, minW: 3, minH: 8 },
    { i: 'comparison', x: 0, y: 40, w: 7, h: 11, minW: 4, minH: 8 },
    { i: 'consistency', x: 7, y: 40, w: 5, h: 11, minW: 3, minH: 8 },
  ],
  md: [
    { i: 'nextmove', x: 0, y: 0, w: 10, h: 4 },
    { i: 'revenue', x: 0, y: 4, w: 5, h: 11 },
    { i: 'countdown', x: 5, y: 4, w: 5, h: 11 },
    { i: 'burnup', x: 0, y: 15, w: 10, h: 11 },
    { i: 'tasks', x: 0, y: 26, w: 5, h: 12 },
    { i: 'uber', x: 5, y: 26, w: 5, h: 12 },
    { i: 'hours', x: 0, y: 38, w: 5, h: 11 },
    { i: 'experiments', x: 5, y: 38, w: 5, h: 11 },
    { i: 'comparison', x: 0, y: 49, w: 5, h: 11 },
    { i: 'consistency', x: 5, y: 49, w: 5, h: 11 },
  ],
  sm: [
    { i: 'nextmove', x: 0, y: 0, w: 6, h: 5 },
    { i: 'revenue', x: 0, y: 5, w: 6, h: 11 },
    { i: 'countdown', x: 0, y: 16, w: 6, h: 9 },
    { i: 'burnup', x: 0, y: 25, w: 6, h: 12 },
    { i: 'uber', x: 0, y: 37, w: 6, h: 13 },
    { i: 'hours', x: 0, y: 50, w: 6, h: 10 },
    { i: 'experiments', x: 0, y: 60, w: 6, h: 10 },
    { i: 'comparison', x: 0, y: 70, w: 6, h: 11 },
    { i: 'consistency', x: 0, y: 81, w: 6, h: 10 },
    { i: 'tasks', x: 0, y: 91, w: 6, h: 12 },
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
  // Behind ideal pace → encourage with amber framing, never alarm red.
  const behindPace = pct < timelinePct;

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
      {/* NEXT MOVE (ADHD hero — one clear action) */}
      <div key="nextmove">
        <Widget title="Focus" icon="🎯" accent={theme.colors.sage}>
          <NextMove />
        </Widget>
      </div>

      {/* REVENUE */}
      <div key="revenue">
        <Widget title="Monthly Revenue" icon="💰" accent={behindPace ? theme.colors.amber : theme.colors.sage}
          headerRight={<span className="widget-pill">{Math.round(pct)}% of ${target}</span>}>
          <div className="stat-figure"><AnimatedNumber value={totalRevenue} prefix="$" /></div>
          <div className="stat-caption">of ${target.toLocaleString()} CAD target this month</div>
          <div className="mini-progress">
            <div className="mini-progress-fill" style={{ width: `${pct}%`, background: behindPace ? theme.colors.amber : theme.colors.sage }} />
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

      {/* BURN-UP — cumulative revenue vs ideal pace + projected finish */}
      <div key="burnup">
        <Widget title="Revenue Burn-Up → Dec 1" icon="📈" accent={behindPace ? theme.colors.amber : theme.colors.sage}>
          <BurnupChart />
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

      {/* UBER DELIVERY */}
      <div key="uber">
        <Widget title="Uber Delivery" icon="🚗" accent={theme.colors.clay}>
          <UberTracker />
        </Widget>
      </div>

      {/* CONSISTENCY */}
      <div key="consistency">
        <Widget title="Consistency" icon="🔥" accent={theme.colors.sage}>
          <Consistency />
        </Widget>
      </div>
    </ResponsiveGridLayout>
  );
}

export default Dashboard;
