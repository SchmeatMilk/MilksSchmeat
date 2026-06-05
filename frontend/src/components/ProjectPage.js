import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
  RadialBarChart, RadialBar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import AnimatedNumber from './AnimatedNumber';
import { theme, pathInfo } from '../theme';
import './ProjectPage.css';

const TEAM_TARGET = 5000; // shared monthly $ target the project contributes toward

function ProjectPage({ projectId, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ideas, setIdeas] = useState([]);
  const [ideaSource, setIdeaSource] = useState(null);
  const [ideasDone, setIdeasDone] = useState({});
  const [genLoading, setGenLoading] = useState(false);

  const fetchDetail = useCallback(() => {
    setLoading(true);
    axios.get(`/api/projects/${encodeURIComponent(projectId)}`)
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  const generateIdeas = async () => {
    setGenLoading(true);
    try {
      const r = await axios.post(`/api/projects/${encodeURIComponent(projectId)}/ideas`);
      setIdeas(r.data.ideas || []);
      setIdeaSource(r.data.source);
      setIdeasDone({});
    } catch {
      setIdeas([]);
    } finally {
      setGenLoading(false);
    }
  };

  if (loading) return <div className="project-page"><div className="pp-loading">Loading project…</div></div>;
  if (!data) {
    return (
      <div className="project-page">
        <button className="pp-back" onClick={onBack}>← Back to dashboard</button>
        <div className="pp-loading">Project not found.</div>
      </div>
    );
  }

  const { project, siblings, expensesByCategory, milestones, recentFacts } = data;
  const info = pathInfo[project.path] || { name: project.path, emoji: '•', short: project.path };
  const accent = theme.pathColors[project.path] || theme.colors.sage;

  const revenue = project.revenueThisMonth || 0;
  const cumulative = project.revenueCumulative || 0;
  const hours = project.hoursInvested || 0;
  const expenses = project.totalExpenses || 0;
  const net = revenue - expenses;
  const perHour = hours ? revenue / hours : 0;
  const contribPct = Math.min(100, (revenue / TEAM_TARGET) * 100);

  const coreChart = [
    { name: 'Revenue', value: Math.round(revenue) },
    { name: 'Expenses', value: Math.round(expenses) },
    { name: 'Net', value: Math.round(net) },
  ];

  const gaugeData = [{ name: 'progress', value: contribPct, fill: accent }];

  const expenseChart = (expensesByCategory || [])
    .filter((e) => e.total > 0)
    .map((e) => ({ name: e.category, value: Math.round(e.total) }));

  const siblingChart = (siblings || [])
    .filter((s) => s.id !== project.id)
    .map((s) => ({ name: s.name.length > 14 ? s.name.slice(0, 13) + '…' : s.name, revenue: Math.round(s.revenueThisMonth || 0) }));

  const tip = {
    background: 'rgba(255,255,255,0.97)', border: `1px solid ${theme.colors.border}`,
    borderRadius: 10, fontSize: 12, color: theme.colors.textPrimary,
  };

  const toggleIdea = (i) => setIdeasDone((prev) => ({ ...prev, [i]: !prev[i] }));

  return (
    <div className="project-page" style={{ '--accent': accent }}>
      <button className="pp-back" onClick={onBack}>← Back to dashboard</button>

      {/* Header */}
      <header className="pp-header">
        <div className="pp-title-row">
          <span className="pp-emoji">{info.emoji}</span>
          <div>
            <h1 className="pp-title">{project.name}</h1>
            <div className="pp-sub">
              <span className="pp-badge" style={{ background: accent }}>{info.name}</span>
              <span className={`pp-status pp-status-${project.status}`}>{project.status}</span>
              {project.nextAction && <span className="pp-next">🎯 {project.nextAction}</span>}
            </div>
          </div>
        </div>
      </header>

      {/* Progression trackers */}
      <section className="pp-stats">
        <div className="pp-stat">
          <div className="pp-stat-val"><AnimatedNumber value={revenue} prefix="$" /></div>
          <div className="pp-stat-lbl">revenue this month</div>
        </div>
        <div className="pp-stat">
          <div className="pp-stat-val"><AnimatedNumber value={cumulative} prefix="$" /></div>
          <div className="pp-stat-lbl">cumulative</div>
        </div>
        <div className="pp-stat">
          <div className="pp-stat-val"><AnimatedNumber value={hours} decimals={1} suffix="h" /></div>
          <div className="pp-stat-lbl">hours invested</div>
        </div>
        <div className="pp-stat">
          <div className="pp-stat-val"><AnimatedNumber value={perHour} prefix="$" decimals={1} suffix="/hr" /></div>
          <div className="pp-stat-lbl">real rate</div>
        </div>
        <div className="pp-stat">
          <div className="pp-stat-val" style={{ color: net >= 0 ? theme.colors.sage : theme.colors.amber }}>
            <AnimatedNumber value={net} prefix="$" />
          </div>
          <div className="pp-stat-lbl">net (rev − exp)</div>
        </div>
      </section>

      <div className="pp-grid">
        {/* Contribution gauge */}
        <div className="pp-card">
          <h3 className="pp-card-title">📊 Contribution to ${TEAM_TARGET.toLocaleString()} target</h3>
          <ResponsiveContainer width="100%" height={200}>
            <RadialBarChart innerRadius="68%" outerRadius="100%" data={gaugeData} startAngle={90} endAngle={-270}>
              <RadialBar background dataKey="value" cornerRadius={12} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="pp-gauge-label">{Math.round(contribPct)}%<span>of monthly target</span></div>
        </div>

        {/* Revenue / Expenses / Net */}
        <div className="pp-card">
          <h3 className="pp-card-title">💵 Revenue · Expenses · Net</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={coreChart} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.grid} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: theme.colors.textSecondary }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: theme.colors.textSecondary }} axisLine={false} tickLine={false} width={42} />
              <Tooltip contentStyle={tip} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={46}>
                {coreChart.map((d, i) => (
                  <Cell key={i} fill={d.name === 'Expenses' ? theme.colors.clay : d.name === 'Net' ? theme.colors.slate : accent} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Expenses by category */}
        <div className="pp-card">
          <h3 className="pp-card-title">🧾 Expenses by category</h3>
          {expenseChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={expenseChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={{ fontSize: 11 }}>
                  {expenseChart.map((d, i) => (
                    <Cell key={i} fill={theme.chartPalette[i % theme.chartPalette.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tip} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="pp-empty">No expenses logged for this path yet 🌱</div>
          )}
        </div>

        {/* Sibling comparison */}
        {siblingChart.length > 0 && (
          <div className="pp-card">
            <h3 className="pp-card-title">🔬 Other projects in {info.short}</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={siblingChart} layout="vertical" margin={{ top: 6, right: 12, left: 6, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.grid} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: theme.colors.textSecondary }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: theme.colors.textSecondary }} axisLine={false} tickLine={false} width={90} />
                <Tooltip contentStyle={tip} />
                <Bar dataKey="revenue" radius={[0, 6, 6, 0]} barSize={18} fill={theme.colors.sageLight} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* AI ideas — checklist */}
        <div className="pp-card pp-ideas">
          <div className="pp-ideas-head">
            <h3 className="pp-card-title">💡 Ideas & suggestions</h3>
            <button className="pp-gen-btn" onClick={generateIdeas} disabled={genLoading}>
              {genLoading ? 'Thinking…' : ideas.length ? 'Regenerate' : 'Generate ideas'}
            </button>
          </div>
          {ideas.length === 0 ? (
            <div className="pp-empty">Tap “Generate ideas” for concrete next moves on this project.</div>
          ) : (
            <>
              {ideaSource === 'starter' && (
                <div className="pp-idea-note">Starter ideas (set ANTHROPIC_API_KEY for AI-tailored suggestions)</div>
              )}
              {ideaSource === 'claude' && <div className="pp-idea-note">✨ AI-tailored for this project</div>}
              <ul className="pp-idea-list">
                {ideas.map((idea, i) => (
                  <li key={i} className={`pp-idea ${ideasDone[i] ? 'done' : ''}`} onClick={() => toggleIdea(i)}>
                    <span className="pp-idea-check">{ideasDone[i] ? '✅' : '☐'}</span>
                    <span className="pp-idea-text">{idea}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* Milestones — checklist */}
        {milestones && milestones.length > 0 && (
          <div className="pp-card">
            <h3 className="pp-card-title">🏆 Milestones</h3>
            <ul className="pp-milestone-list">
              {milestones.map((m) => (
                <li key={m.id} className="pp-milestone">
                  <span className="pp-milestone-emoji">{m.emoji || '✅'}</span>
                  <span className="pp-milestone-msg">{m.message}</span>
                  <span className="pp-milestone-date">{new Date(m.earnedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recent activity feed */}
        {recentFacts && recentFacts.length > 0 && (
          <div className="pp-card">
            <h3 className="pp-card-title">📝 Recently logged</h3>
            <ul className="pp-fact-list">
              {recentFacts.map((f, i) => (
                <li key={i} className="pp-fact">
                  <span className="pp-fact-quote">{f.sourceQuote || f.textValue || `${f.factType}: ${f.value}`}</span>
                  <span className="pp-fact-date">{f.createdAt ? f.createdAt.slice(0, 10) : ''}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProjectPage;
