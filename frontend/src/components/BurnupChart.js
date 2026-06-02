import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import AnimatedNumber from './AnimatedNumber';
import { theme } from '../theme';
import './BurnupChart.css';

// Burn-up: cumulative revenue climbing toward the target line, plus the pace
// you'd need and a projected finish. Behind-pace is framed amber, not red.
function BurnupChart() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetch = () => axios.get('/api/burnup').then((r) => setData(r.data)).catch(() => {});
    fetch();
    const t = setInterval(fetch, 30000);
    return () => clearInterval(t);
  }, []);

  if (!data) return <div className="burnup-empty">Loading pace…</div>;

  const { points, target, projected, current, daysLeft, catchUpPace, onPace } = data;
  const accent = onPace ? theme.colors.sage : theme.colors.amber;

  // Need at least 2 points for a readable line; pad with an origin if sparse.
  const chartData = points.length >= 1 ? points : [{ date: 'start', actual: 0, ideal: 0 }];

  const tip = {
    background: 'rgba(255,255,255,0.97)',
    border: `1px solid ${theme.colors.border}`,
    borderRadius: 10, fontSize: 12, color: theme.colors.textPrimary,
  };

  return (
    <div className="burnup">
      <div className="burnup-stats">
        <div className="burnup-stat">
          <div className="burnup-stat-val"><AnimatedNumber value={current} prefix="$" /></div>
          <div className="burnup-stat-lbl">earned so far</div>
        </div>
        <div className="burnup-stat">
          <div className="burnup-stat-val" style={{ color: accent }}>
            <AnimatedNumber value={projected} prefix="$" />
          </div>
          <div className="burnup-stat-lbl">projected by Dec 1</div>
        </div>
        <div className="burnup-stat">
          <div className="burnup-stat-val"><AnimatedNumber value={catchUpPace} prefix="$" />/day</div>
          <div className="burnup-stat-lbl">pace to hit ${target.toLocaleString()}</div>
        </div>
      </div>

      {!onPace && (
        <div className="burnup-nudge">
          {daysLeft} days left — ${catchUpPace}/day gets you there. Keep stacking wins. 💪
        </div>
      )}

      <ResponsiveContainer width="100%" height="100%" minHeight={150}>
        <ComposedChart data={chartData} margin={{ top: 8, right: 10, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id="burnFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accent} stopOpacity={0.45} />
              <stop offset="100%" stopColor={accent} stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.grid} vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: theme.colors.textSecondary }} axisLine={false} tickLine={false} minTickGap={24} />
          <YAxis tick={{ fontSize: 11, fill: theme.colors.textSecondary }} axisLine={false} tickLine={false} width={44} />
          <Tooltip contentStyle={tip} />
          <ReferenceLine y={target} stroke={theme.colors.clay} strokeDasharray="5 4"
            label={{ value: `Target $${target}`, fontSize: 10, fill: theme.colors.clay, position: 'insideTopRight' }} />
          <Line type="monotone" dataKey="ideal" name="Ideal pace" stroke={theme.colors.slate}
            strokeWidth={2} strokeDasharray="4 4" dot={false} />
          <Area type="monotone" dataKey="actual" name="Actual" stroke={accent}
            strokeWidth={2.6} fill="url(#burnFill)" dot={{ r: 3 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export default BurnupChart;
