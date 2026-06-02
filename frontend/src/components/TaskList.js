import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './TaskList.css';

const PRIORITY = {
  'must-do': { label: 'Must', color: '#d9a8a8' },
  'should-do': { label: 'Should', color: '#d8b48a' },
  'nice-to-have': { label: 'Nice', color: '#88b09e' },
};

function TaskList() {
  const [tasks, setTasks] = useState([]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ taskName: '', priority: 'must-do' });
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => { fetchTasks(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchTasks = async () => {
    try {
      const res = await axios.get(`/api/tasks/${today}`);
      setTasks(res.data);
    } catch (e) { console.error(e); }
  };

  const toggle = async (task) => {
    const status = task.status === 'completed' ? 'not-started' : 'completed';
    await axios.put(`/api/tasks/${task.id}`, { status });
    fetchTasks();
  };

  const remove = async (id) => {
    await axios.delete(`/api/tasks/${id}`);
    fetchTasks();
  };

  const add = async (e) => {
    e.preventDefault();
    if (!draft.taskName.trim()) return;
    await axios.post('/api/tasks', { date: today, ...draft });
    setDraft({ taskName: '', priority: 'must-do' });
    setAdding(false);
    fetchTasks();
  };

  const done = tasks.filter((t) => t.status === 'completed').length;
  const rate = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  const order = { 'must-do': 0, 'should-do': 1, 'nice-to-have': 2 };
  const sorted = [...tasks].sort((a, b) => {
    if ((a.status === 'completed') !== (b.status === 'completed')) {
      return a.status === 'completed' ? 1 : -1;
    }
    return (order[a.priority] ?? 3) - (order[b.priority] ?? 3);
  });

  return (
    <div className="tasklist">
      <div className="tasklist-top">
        <div className="tasklist-progress">
          <div className="tasklist-progress-bar">
            <div className="tasklist-progress-fill" style={{ width: `${rate}%` }} />
          </div>
          <span className="tasklist-rate">{rate}%</span>
        </div>
        <button className="task-add-btn" onClick={() => setAdding(!adding)}>
          {adding ? '✕' : '+ Add'}
        </button>
      </div>

      {adding && (
        <form className="task-form" onSubmit={add}>
          <input
            autoFocus
            placeholder="What needs doing today?"
            value={draft.taskName}
            onChange={(e) => setDraft({ ...draft, taskName: e.target.value })}
          />
          <div className="task-form-row">
            <select
              value={draft.priority}
              onChange={(e) => setDraft({ ...draft, priority: e.target.value })}
            >
              <option value="must-do">🔴 Must do</option>
              <option value="should-do">🟡 Should do</option>
              <option value="nice-to-have">🟢 Nice to have</option>
            </select>
            <button type="submit">Add</button>
          </div>
        </form>
      )}

      {sorted.length === 0 && !adding && (
        <div className="task-empty">No tasks yet — plan your day 🌱</div>
      )}

      <div className="task-items">
        {sorted.map((task) => {
          const p = PRIORITY[task.priority] || PRIORITY['should-do'];
          const completed = task.status === 'completed';
          return (
            <div key={task.id} className={`task-row ${completed ? 'completed' : ''}`}>
              <button
                className={`task-check ${completed ? 'on' : ''}`}
                style={{ borderColor: p.color, background: completed ? p.color : 'transparent' }}
                onClick={() => toggle(task)}
              >
                {completed ? '✓' : ''}
              </button>
              <span className="task-name">{task.taskName}</span>
              <span className="task-tag" style={{ color: p.color }}>{p.label}</span>
              <button className="task-del" onClick={() => remove(task.id)}>×</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default TaskList;
