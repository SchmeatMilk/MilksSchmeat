import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './DailyTasks.css';

function DailyTasks({ experiments, onRefresh }) {
  const [tasks, setTasks] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    taskName: '',
    priority: 'should-do',
    linkedPath: ''
  });

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await axios.get(`/api/tasks/${today}`);
      setTasks(response.data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/tasks', {
        date: today,
        ...formData
      });
      setFormData({ taskName: '', priority: 'should-do', linkedPath: '' });
      setShowForm(false);
      fetchTasks();
      onRefresh();
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const handleTaskStatusChange = async (taskId, newStatus) => {
    try {
      await axios.put(`/api/tasks/${taskId}`, { status: newStatus });
      fetchTasks();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleDelete = async (taskId) => {
    if (window.confirm('Delete this task?')) {
      try {
        await axios.delete(`/api/tasks/${taskId}`);
        fetchTasks();
      } catch (error) {
        console.error('Error deleting task:', error);
      }
    }
  };

  const mustDo = tasks.filter(t => t.priority === 'must-do');
  const shouldDo = tasks.filter(t => t.priority === 'should-do');
  const niceTohave = tasks.filter(t => t.priority === 'nice-to-have');
  const completed = tasks.filter(t => t.status === 'completed');

  const completionRate = tasks.length > 0 ? Math.round((completed.length / tasks.length) * 100) : 0;

  const getMoodEmoji = (rate) => {
    if (rate === 0) return '😴';
    if (rate < 50) return '😐';
    if (rate < 100) return '😊';
    return '🔥';
  };

  return (
    <div className="daily-tasks">
      <div className="tasks-header">
        <div>
          <h2>✅ Today's Tasks</h2>
          <p className="date">{new Date(today).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
        </div>
        <div className="completion-widget">
          <span className="mood">{getMoodEmoji(completionRate)}</span>
          <div className="completion-stats">
            <span className="completion-rate">{completionRate}%</span>
            <span className="completion-label">Complete</span>
          </div>
        </div>
      </div>

      {tasks.length === 0 && !showForm && (
        <div className="empty-state">
          <p>No tasks for today. Ready for an empty slate or want to plan today?</p>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="task-form">
          <h3>Add Task</h3>

          <div className="form-group">
            <label>What needs to get done today?</label>
            <input
              type="text"
              name="taskName"
              placeholder="e.g., Reach out to 3 potential clients"
              value={formData.taskName}
              onChange={handleInputChange}
              required
              autoFocus
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Priority</label>
              <select name="priority" value={formData.priority} onChange={handleInputChange}>
                <option value="must-do">🔴 Must Do</option>
                <option value="should-do">🟡 Should Do</option>
                <option value="nice-to-have">🟢 Nice to Have</option>
              </select>
            </div>

            <div className="form-group">
              <label>Related to (optional)</label>
              <select name="linkedPath" value={formData.linkedPath} onChange={handleInputChange}>
                <option value="">No path</option>
                <option value="ai-consulting">🤝 AI Consulting</option>
                <option value="ai-tools">⚙️ AI Tools</option>
                <option value="online-work">💻 Online Work</option>
                <option value="apps">📱 Apps</option>
              </select>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="submit-btn">Add Task</button>
            <button type="button" onClick={() => setShowForm(false)} className="cancel-btn">Cancel</button>
          </div>
        </form>
      )}

      {!showForm && tasks.length > 0 && (
        <button onClick={() => setShowForm(true)} className="add-task-btn">+ Add Task</button>
      )}

      {mustDo.length > 0 && (
        <div className="task-section">
          <h3 className="section-title">🔴 MUST DO TODAY ({mustDo.length})</h3>
          <div className="tasks-list">
            {mustDo.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                onStatusChange={handleTaskStatusChange}
                onDelete={handleDelete}
                experiments={experiments}
              />
            ))}
          </div>
        </div>
      )}

      {shouldDo.length > 0 && (
        <div className="task-section">
          <h3 className="section-title">🟡 SHOULD DO ({shouldDo.length})</h3>
          <div className="tasks-list">
            {shouldDo.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                onStatusChange={handleTaskStatusChange}
                onDelete={handleDelete}
                experiments={experiments}
              />
            ))}
          </div>
        </div>
      )}

      {niceTohave.length > 0 && (
        <div className="task-section">
          <h3 className="section-title">🟢 NICE TO HAVE ({niceTohave.length})</h3>
          <div className="tasks-list">
            {niceTohave.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                onStatusChange={handleTaskStatusChange}
                onDelete={handleDelete}
                experiments={experiments}
              />
            ))}
          </div>
        </div>
      )}

      {completed.length > 0 && (
        <div className="task-section completed-section">
          <h3 className="section-title">✅ COMPLETED ({completed.length})</h3>
          <div className="tasks-list">
            {completed.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                onStatusChange={handleTaskStatusChange}
                onDelete={handleDelete}
                experiments={experiments}
                isCompleted
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TaskItem({ task, onStatusChange, onDelete, experiments, isCompleted }) {
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'must-do': return '#f44336';
      case 'should-do': return '#ff9800';
      case 'nice-to-have': return '#4caf50';
      default: return '#999';
    }
  };

  const linkedExp = task.linkedPath ? experiments.find(e => e.path === task.linkedPath) : null;

  return (
    <div className={`task-item status-${task.status}`}>
      <div className="task-checkbox">
        <input
          type="checkbox"
          checked={task.status === 'completed'}
          onChange={(e) => onStatusChange(task.id, e.target.checked ? 'completed' : 'not-started')}
        />
      </div>

      <div className="task-content">
        <div className="task-name">{task.taskName}</div>
        {linkedExp && (
          <div className="linked-exp">
            Related to: <strong>{linkedExp.name}</strong>
          </div>
        )}
        {task.notes && <div className="task-notes">{task.notes}</div>}
      </div>

      <div className="task-priority" style={{ backgroundColor: getPriorityColor(task.priority) }}></div>

      <button onClick={() => onDelete(task.id)} className="delete-btn">🗑️</button>
    </div>
  );
}

export default DailyTasks;
