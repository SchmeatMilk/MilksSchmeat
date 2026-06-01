import React, { useState } from 'react';
import axios from 'axios';
import './ExperimentsTracker.css';

const pathInfo = {
  'ai-consulting': { name: 'Help Businesses Apply AI', emoji: '🤝' },
  'ai-tools': { name: 'Create AI Tools', emoji: '⚙️' },
  'online-work': { name: 'AI-Powered Online Work', emoji: '💻' },
  'apps': { name: 'Monetizable Apps', emoji: '📱' }
};

function ExperimentsTracker({ experiments, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    path: 'ai-consulting',
    name: '',
    nextAction: ''
  });
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(`/api/experiments/${editingId}`, editData);
        setEditingId(null);
      } else {
        await axios.post('/api/experiments', formData);
        setFormData({ path: 'ai-consulting', name: '', nextAction: '' });
      }
      setShowForm(false);
      onRefresh();
    } catch (error) {
      console.error('Error saving experiment:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this experiment?')) {
      try {
        await axios.delete(`/api/experiments/${id}`);
        onRefresh();
      } catch (error) {
        console.error('Error deleting experiment:', error);
      }
    }
  };

  const startEdit = (exp) => {
    setEditingId(exp.id);
    setEditData({ ...exp });
    setShowForm(true);
  };

  const handleEditChange = (field, value) => {
    setEditData({ ...editData, [field]: value });
  };

  const groupedByPath = {
    'ai-consulting': experiments.filter(e => e.path === 'ai-consulting'),
    'ai-tools': experiments.filter(e => e.path === 'ai-tools'),
    'online-work': experiments.filter(e => e.path === 'online-work'),
    'apps': experiments.filter(e => e.path === 'apps')
  };

  return (
    <div className="experiments-tracker">
      <div className="tracker-header">
        <h2>🔬 All Your Experiments</h2>
        <button onClick={() => { setShowForm(!showForm); setEditingId(null); }} className="add-btn">
          {showForm ? '✕ Cancel' : '➕ New Experiment'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="experiment-form">
          <h3>{editingId ? 'Update Experiment' : 'Create New Experiment'}</h3>

          <div className="form-group">
            <label>Which Path?</label>
            <select
              name="path"
              value={editingId ? editData.path : formData.path}
              onChange={(e) => editingId ? handleEditChange('path', e.target.value) : handleInputChange(e)}
            >
              {Object.entries(pathInfo).map(([key, { emoji, name }]) => (
                <option key={key} value={key}>{emoji} {name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Experiment Name</label>
            <input
              type="text"
              name="name"
              placeholder="e.g., Build ChatGPT plugin"
              value={editingId ? editData.name : formData.name}
              onChange={(e) => editingId ? handleEditChange('name', e.target.value) : handleInputChange(e)}
              required
            />
          </div>

          <div className="form-group">
            <label>Next Action</label>
            <textarea
              name="nextAction"
              placeholder="What's the next step? Make it specific and actionable."
              value={editingId ? editData.nextAction : formData.nextAction}
              onChange={(e) => editingId ? handleEditChange('nextAction', e.target.value) : handleInputChange(e)}
              rows="2"
            />
          </div>

          {editingId && (
            <>
              <div className="form-group">
                <label>Revenue This Month ($)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0"
                  value={editData.revenueThisMonth || 0}
                  onChange={(e) => handleEditChange('revenueThisMonth', parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="form-group">
                <label>Cumulative Revenue ($)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0"
                  value={editData.revenueCumulative || 0}
                  onChange={(e) => handleEditChange('revenueCumulative', parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="form-group">
                <label>Hours Invested</label>
                <input
                  type="number"
                  step="0.5"
                  placeholder="0"
                  value={editData.hoursInvested || 0}
                  onChange={(e) => handleEditChange('hoursInvested', parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="form-group">
                <label>Status</label>
                <select
                  value={editData.status}
                  onChange={(e) => handleEditChange('status', e.target.value)}
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </>
          )}

          <button type="submit" className="submit-btn">
            {editingId ? '💾 Update' : '➕ Create'}
          </button>
        </form>
      )}

      <div className="experiments-list">
        {Object.entries(groupedByPath).map(([path, exps]) => (
          <div key={path} className="path-section">
            <h3>{pathInfo[path].emoji} {pathInfo[path].name}</h3>

            {exps.length === 0 ? (
              <p className="empty-path">No experiments yet. Start one above!</p>
            ) : (
              <div className="experiments-cards">
                {exps.map(exp => (
                  <div key={exp.id} className={`exp-card status-${exp.status}`}>
                    <div className="exp-header">
                      <h4>{exp.name}</h4>
                      <span className={`status-badge status-${exp.status}`}>{exp.status}</span>
                    </div>

                    {exp.nextAction && <p className="next-action">→ {exp.nextAction}</p>}

                    <div className="exp-stats">
                      <div className="stat">
                        <span className="label">Revenue This Month</span>
                        <span className="value">${(exp.revenueThisMonth || 0).toFixed(0)}</span>
                      </div>
                      <div className="stat">
                        <span className="label">Cumulative</span>
                        <span className="value">${(exp.revenueCumulative || 0).toFixed(0)}</span>
                      </div>
                      <div className="stat">
                        <span className="label">Hours Invested</span>
                        <span className="value">{(exp.hoursInvested || 0).toFixed(1)}h</span>
                      </div>
                    </div>

                    {exp.learnings && exp.learnings.length > 0 && (
                      <div className="learnings">
                        <strong>Learnings:</strong>
                        <ul>
                          {exp.learnings.map((learning, idx) => (
                            <li key={idx}>{learning}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="exp-actions">
                      <button onClick={() => startEdit(exp)} className="edit-btn">✏️ Edit</button>
                      <button onClick={() => handleDelete(exp.id)} className="delete-btn">🗑️ Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ExperimentsTracker;
