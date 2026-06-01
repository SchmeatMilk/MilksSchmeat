import React, { useState, useEffect } from 'react';
import axios from 'axios';

function TaskList({ experiments }) {
  const [tasks, setTasks] = useState([]);
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

  const mustDo = tasks.filter(t => t.priority === 'must-do');
  const shouldDo = tasks.filter(t => t.priority === 'should-do');
  const niceTohave = tasks.filter(t => t.priority === 'nice-to-have');
  const completed = tasks.filter(t => t.status === 'completed');

  const completionRate = tasks.length > 0 ? Math.round((completed.length / tasks.length) * 100) : 0;

  const handleTaskToggle = async (taskId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'completed' ? 'not-started' : 'completed';
      await axios.put(`/api/tasks/${taskId}`, { status: newStatus });
      fetchTasks();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const priorityColors = {
    'must-do': '#f44336',
    'should-do': '#ff9800',
    'nice-to-have': '#4caf50'
  };

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h2 style={{ margin: 0, color: '#2d5016', fontSize: '18px', fontWeight: 700 }}>
          ✅ Today's Tasks
        </h2>
        <div style={{
          background: '#4a7c2c',
          color: '#fffbf0',
          padding: '10px 15px',
          borderRadius: '6px',
          fontSize: '13px',
          fontWeight: 600
        }}>
          {completionRate}% Complete
        </div>
      </div>

      {tasks.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '30px',
          color: '#999',
          fontSize: '13px',
          background: '#f9f9f7',
          borderRadius: '6px'
        }}>
          No tasks yet. Plan your day! 🚀
        </div>
      ) : (
        <div>
          {mustDo.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{
                color: '#f44336',
                fontSize: '12px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '10px',
                paddingBottom: '8px',
                borderBottom: '2px solid #f44336'
              }}>
                🔴 MUST DO ({mustDo.length})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {mustDo.map(task => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onToggle={handleTaskToggle}
                    color={priorityColors[task.priority]}
                  />
                ))}
              </div>
            </div>
          )}

          {shouldDo.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{
                color: '#ff9800',
                fontSize: '12px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '10px',
                paddingBottom: '8px',
                borderBottom: '2px solid #ff9800'
              }}>
                🟡 SHOULD DO ({shouldDo.length})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {shouldDo.map(task => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onToggle={handleTaskToggle}
                    color={priorityColors[task.priority]}
                  />
                ))}
              </div>
            </div>
          )}

          {niceTohave.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{
                color: '#4caf50',
                fontSize: '12px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '10px',
                paddingBottom: '8px',
                borderBottom: '2px solid #4caf50'
              }}>
                🟢 NICE TO HAVE ({niceTohave.length})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {niceTohave.map(task => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onToggle={handleTaskToggle}
                    color={priorityColors[task.priority]}
                  />
                ))}
              </div>
            </div>
          )}

          {completed.length > 0 && (
            <div style={{ marginBottom: '20px', opacity: 0.7 }}>
              <h4 style={{
                color: '#4a7c2c',
                fontSize: '12px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '10px',
                paddingBottom: '8px',
                borderBottom: '2px solid #90c695'
              }}>
                ✅ COMPLETED ({completed.length})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {completed.map(task => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onToggle={handleTaskToggle}
                    color={priorityColors[task.priority]}
                    isCompleted
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TaskItem({ task, onToggle, color, isCompleted }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '10px 12px',
      background: isCompleted ? '#f0f0ed' : 'white',
      border: '1px solid #e8e8e5',
      borderRadius: '4px',
      cursor: 'pointer',
      transition: 'all 0.3s ease'
    }}>
      <input
        type="checkbox"
        checked={isCompleted}
        onChange={() => onToggle(task.id, task.status)}
        style={{
          width: '18px',
          height: '18px',
          cursor: 'pointer',
          accentColor: '#90c695'
        }}
      />
      <div style={{
        flex: 1,
        color: isCompleted ? '#999' : '#2d5016',
        textDecoration: isCompleted ? 'line-through' : 'none',
        fontSize: '13px'
      }}>
        <div style={{ fontWeight: 500 }}>{task.taskName}</div>
      </div>
      <div style={{
        width: '4px',
        height: '24px',
        background: color,
        borderRadius: '2px'
      }}></div>
    </div>
  );
}

export default TaskList;
