import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AnimatedNumber from './AnimatedNumber';
import './ExpenseTracker.css';

const CATEGORIES = [
  { id: 'mileage', label: 'Mileage', emoji: '🛣️' },
  { id: 'fuel', label: 'Fuel', emoji: '⛽' },
  { id: 'meals', label: 'Meals', emoji: '🍽️' },
  { id: 'software', label: 'Software', emoji: '💻' },
  { id: 'subscriptions', label: 'Subscriptions', emoji: '🔄' },
  { id: 'phone', label: 'Phone/Data', emoji: '📱' },
  { id: 'vehicle', label: 'Vehicle', emoji: '🚗' },
  { id: 'supplies', label: 'Supplies', emoji: '📦' },
  { id: 'other', label: 'Other', emoji: '📝' },
];

function ExpenseTracker() {
  const [expenses, setExpenses] = useState([]);
  const [totals, setTotals] = useState({ totalDeductions: 0, netIncomeThisMonth: 0 });
  const [adding, setAdding] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('mileage');
  const [draft, setDraft] = useState({ date: new Date().toISOString().slice(0, 10), amount: '', category: 'mileage', note: '' });

  const fetchExpenses = () => {
    axios.get('/api/expenses').then((r) => {
      setExpenses(r.data.items || []);
      setTotals(r.data);
    }).catch(() => {});
  };

  useEffect(() => {
    fetchExpenses();
    const t = setInterval(fetchExpenses, 30000);
    return () => clearInterval(t);
  }, []);

  const add = async (e) => {
    e.preventDefault();
    if (!draft.amount) return;
    try {
      await axios.post('/api/expenses', draft);
      setDraft({ date: new Date().toISOString().slice(0, 10), amount: '', category: 'mileage', note: '' });
      setAdding(false);
      fetchExpenses();
    } catch (err) {
      // Silent fail
    }
  };

  const remove = async (id) => {
    try {
      await axios.delete(`/api/expenses/${id}`);
      fetchExpenses();
    } catch (err) {
      // Silent fail
    }
  };

  return (
    <div className="expense-tracker">
      <div className="expense-summary">
        <div className="expense-stat">
          <div className="expense-val"><AnimatedNumber value={totals.totalDeductions} prefix="$" /></div>
          <div className="expense-lbl">deductions</div>
        </div>
        <div className="expense-stat">
          <div className="expense-val"><AnimatedNumber value={totals.netIncomeThisMonth} prefix="$" /></div>
          <div className="expense-lbl">net income</div>
        </div>
      </div>

      <button className="expense-add" onClick={() => setAdding(!adding)}>
        {adding ? '✕ Cancel' : '+ Add'}
      </button>

      {adding && (
        <form className="expense-form" onSubmit={add}>
          <input
            type="date"
            value={draft.date}
            onChange={(e) => setDraft({ ...draft, date: e.target.value })}
          />
          <input
            type="number"
            step="0.01"
            placeholder="$ amount"
            value={draft.amount}
            onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
            autoFocus
          />
          <div className="category-chips">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`category-chip ${selectedCategory === cat.id ? 'active' : ''}`}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setDraft({ ...draft, category: cat.id });
                }}
              >
                <span className="category-emoji">{cat.emoji}</span>
                <span className="category-label">{cat.label}</span>
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="optional note"
            value={draft.note}
            onChange={(e) => setDraft({ ...draft, note: e.target.value })}
          />
          <button type="submit" className="expense-save">Save</button>
        </form>
      )}

      {expenses.length > 0 && (
        <div className="expense-list">
          {expenses.slice(0, 8).map((exp) => {
            const catInfo = CATEGORIES.find((c) => c.id === exp.category);
            return (
              <div key={exp.id} className="expense-row">
                <span className="expense-emoji">{catInfo?.emoji}</span>
                <span className="expense-date">{exp.date}</span>
                <span className="expense-amt">${exp.amount}</span>
                <span className="expense-cat">{catInfo?.label}</span>
                <button className="expense-del" onClick={() => remove(exp.id)}>✕</button>
              </div>
            );
          })}
        </div>
      )}

      {expenses.length === 0 && !adding && (
        <div className="expense-empty">No expenses logged yet</div>
      )}
    </div>
  );
}

export default ExpenseTracker;
