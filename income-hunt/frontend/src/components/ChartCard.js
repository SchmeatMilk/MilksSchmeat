import React, { useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  RadialBarChart, RadialBar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { theme } from '../theme';

// Reusable chart widget: same data, switchable visualization.
// chartTypes: which views to offer for this data.
const CHART_LABELS = {
  bar: '▥ Bar',
  line: '◠ Line',
  area: '◢ Area',
  pie: '◔ Pie',
  radial: '◑ Radial',
};

function ChartCard({
  data,
  dataKey = 'value',
  nameKey = 'name',
  chartTypes = ['bar', 'line', 'area', 'pie'],
  defaultType = 'bar',
  colorByIndex = true,
  height = 220,
}) {
  const [type, setType] = useState(defaultType);
  const palette = theme.chartPalette;

  const tooltipStyle = {
    background: 'rgba(255,255,255,0.96)',
    border: `1px solid ${theme.colors.border}`,
    borderRadius: 10,
    boxShadow: theme.shadow.soft,
    fontSize: 12,
    color: theme.colors.textPrimary,
  };

  const renderChart = () => {
    switch (type) {
      case 'line':
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.grid} />
            <XAxis dataKey={nameKey} tick={{ fontSize: 11, fill: theme.colors.textSecondary }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: theme.colors.textSecondary }} axisLine={false} tickLine={false} width={36} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: theme.colors.sageLight }} />
            <Line type="monotone" dataKey={dataKey} stroke={palette[0]} strokeWidth={3} dot={{ r: 4, fill: palette[0] }} activeDot={{ r: 6 }} />
          </LineChart>
        );
      case 'area':
        return (
          <AreaChart data={data}>
            <defs>
              <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={palette[0]} stopOpacity={0.5} />
                <stop offset="95%" stopColor={palette[0]} stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.grid} />
            <XAxis dataKey={nameKey} tick={{ fontSize: 11, fill: theme.colors.textSecondary }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: theme.colors.textSecondary }} axisLine={false} tickLine={false} width={36} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: theme.colors.sageLight }} />
            <Area type="monotone" dataKey={dataKey} stroke={palette[0]} strokeWidth={2.5} fill="url(#areaFill)" />
          </AreaChart>
        );
      case 'pie':
        return (
          <PieChart>
            <Tooltip contentStyle={tooltipStyle} />
            <Pie data={data} dataKey={dataKey} nameKey={nameKey} cx="50%" cy="50%" outerRadius={height / 2.6} innerRadius={height / 5} paddingAngle={3}>
              {data.map((entry, i) => (
                <Cell key={i} fill={palette[i % palette.length]} stroke="#fff" strokeWidth={2} />
              ))}
            </Pie>
          </PieChart>
        );
      case 'radial':
        return (
          <RadialBarChart cx="50%" cy="50%" innerRadius="25%" outerRadius="95%" barSize={14} data={data}>
            <RadialBar minAngle={15} background={{ fill: theme.colors.grid }} clockWise dataKey={dataKey} cornerRadius={8}>
              {data.map((entry, i) => (
                <Cell key={i} fill={palette[i % palette.length]} />
              ))}
            </RadialBar>
            <Tooltip contentStyle={tooltipStyle} />
          </RadialBarChart>
        );
      case 'bar':
      default:
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.grid} vertical={false} />
            <XAxis dataKey={nameKey} tick={{ fontSize: 11, fill: theme.colors.textSecondary }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: theme.colors.textSecondary }} axisLine={false} tickLine={false} width={36} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(143,168,196,0.08)' }} />
            <Bar dataKey={dataKey} radius={[6, 6, 0, 0]}>
              {data.map((entry, i) => (
                <Cell key={i} fill={colorByIndex ? palette[i % palette.length] : palette[0]} />
              ))}
            </Bar>
          </BarChart>
        );
    }
  };

  return (
    <div className="chart-card">
      <div className="chart-type-switcher">
        {chartTypes.map((ct) => (
          <button
            key={ct}
            className={`chart-type-btn ${type === ct ? 'active' : ''}`}
            onClick={() => setType(ct)}
            title={`View as ${ct}`}
          >
            {CHART_LABELS[ct] || ct}
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={height}>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
}

export default ChartCard;
