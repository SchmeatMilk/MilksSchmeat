import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import AnimatedNumber from './AnimatedNumber';
import UberPatterns from './UberPatterns';
import { theme } from '../theme';
import './UberTracker.css';

const today = () => new Date().toISOString().slice(0, 10);

// Quick-entry tracker for Uber delivery earnings. Rolls into total revenue.
function UberTracker() {
  const [shifts, setShifts] = useState([]);
  const [totals, setTotals] = useState({ earnings: 0, hours: 0, trips: 0 });
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ date: today(), earnings: '', hours: '', trips: '', startHour: '' });

  const fetchShifts = () => axios.get('/api/uber-shifts').then((r) => {
    setShifts(r.data.shifts || []);
    setTotals(r.data.totals || { earnings: 0, hours: 0, trips: 0 });
  }).catch(() => {});

  useEffect(() => { fetchShifts(); }, []);

  const add = async (e) => {
    e.preventDefault();
    if (!draft.earnings) return;
    await axios.post('/api/uber-shifts', draft);
    setDraft({ date: today(), earnings: '', hours: '', trips: '', startHour: '' });
    setAdding(false);
    fetchShifts();
  };

  const remove = async (id) => { await axios.delete(`/api/uber-shifts/${id}`); fetchShifts(); };

  // Last ~10 shifts oldest→newest for the chart; $/hr where hours present.
  const chart = [...shifts].reverse().slice(-10).map((s) => ({
    date: s.date?.slice(5) || '',
    earnings: s.earnings,
    perHour: s.hours ? Math.round((s.earnings / s.hours) * 10) / 10 : null,
  }));

  // Real hourly rate — gross earnings per logged hour (Improvement 3).
  const perHour = totals.hours ? totals.earnings / totals.hours : 0;

  const tip = {
    background: 'rgba(255,255,255,0.97)', border: `1px solid ${theme.colors.border}`,
    borderRadius: 10, fontSize: 12, color: theme.colors.textPrimary,
  };

  return (
    <div className="uber">
      <div className="uber-totals">
        <div className="uber-total">
          <div className="uber-total-val"><AnimatedNumber value={totals.earnings} prefix="$" /></div>
          <div className="uber-total-lbl">earned</div>
        </div>
        <div className="uber-total">
          <div className="uber-total-val"><AnimatedNumber value={totals.hours} decimals={1} suffix="h" /></div>
          <div className="uber-total-lbl">driven</div>
        </div>
        <div className="uber-total">
          <div className="uber-total-val"><AnimatedNumber value={perHour} prefix="$" decimals={1} suffix="/hr" /></div>
          <div className="uber-total-lbl">real rate</div>
        </div>
        <div className="uber-total">
          <div className="uber-total-val"><AnimatedNumber value={totals.trips} /></div>
          <div className="uber-total-lbl">trips</div>
        </div>
        <button className="uber-add" onClick={() => setAdding(!adding)}>{adding ? '✕' : '+ Log'}</button>
      </div>

      {adding && (
        <form className="uber-form" onSubmit={add}>
          <input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
          <input type="number" step="0.01" placeholder="$ earned" value={draft.earnings}
            onChange={(e) => setDraft({ ...draft, earnings: e.target.value })} autoFocus />
          <input type="number" step="0.1" placeholder="hours" value={draft.hours}
            onChange={(e) => setDraft({ ...draft, hours: e.target.value })} />
          <input type="number" placeholder="trips" value={draft.trips}
            onChange={(e) => setDraft({ ...draft, trips: e.target.value })} />
          <input type="number" min="0" max="23" placeholder="start hr (0-23)" value={draft.startHour}
            onChange={(e) => setDraft({ ...draft, startHour: e.target.value })} />
          <button type="submit">Save</button>
        </form>
      )}

      {chart.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%" minHeight={120}>
          <ComposedChart data={chart} margin={{ top: 8, right: 6, left: -14, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.grid} vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: theme.colors.textSecondary }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: theme.colors.textSecondary }} axisLine={false} tickLine={false} width={40} />
            <Tooltip contentStyle={tip} />
            <Bar dataKey="earnings" name="$ earned" barSize={16} radius={[5, 5, 0, 0]} fill={theme.colors.clay} />
            <Line type="monotone" dataKey="perHour" name="$/hr" stroke={theme.colors.sage} strokeWidth={2.4} dot={{ r: 3 }} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      ) : (
        <div className="uber-empty">No shifts yet — log your first one 🚗</div>
      )}

      {shifts.length > 0 && (
        <div className="uber-list">
          {shifts.slice(0, 4).map((s) => (
            <div key={s.id} className="uber-row">
              <span className="uber-row-date">{s.date}</span>
              <span className="uber-row-amt">${s.earnings}</span>
              <span className="uber-row-meta">{s.hours ? `${s.hours}h` : ''} {s.trips ? `· ${s.trips} trips` : ''}</span>
              {s.source === 'manual' && <button className="uber-del" onClick={() => remove(s.id)}>×</button>}
              {s.source === 'ingest' && <span className="uber-auto" title="Auto-detected from notes">auto</span>}
            </div>
          ))}
        </div>
      )}

      <UberPatterns />
    </div>
  );
}

export default UberTracker;
