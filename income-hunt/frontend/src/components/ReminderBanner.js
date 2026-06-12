import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ReminderBanner.css';
import { theme } from '../theme';

function ReminderBanner() {
  const [reminders, setReminders] = useState([]);
  const [dismissed, setDismissed] = useState(() => {
    const stored = localStorage.getItem('dismissed-reminders');
    return stored ? JSON.parse(stored) : {};
  });

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axios.get('/api/reminders');
        setReminders(res.data.items || []);
      } catch (e) {
        // Silent fail
      }
    };

    fetch();
    const interval = setInterval(fetch, 60000);
    return () => clearInterval(interval);
  }, []);

  const visibleReminders = reminders.filter((r) => {
    const dismissedTime = dismissed[r.id];
    if (!dismissedTime) return true;
    // Show again after 6 hours
    return Date.now() - dismissedTime > 6 * 60 * 60 * 1000;
  });

  const priorityReminder = visibleReminders.length > 0 ? visibleReminders[0] : null;

  const handleDismiss = () => {
    if (priorityReminder) {
      const newDismissed = { ...dismissed, [priorityReminder.id]: Date.now() };
      setDismissed(newDismissed);
      localStorage.setItem('dismissed-reminders', JSON.stringify(newDismissed));
    }
  };

  if (!priorityReminder) return null;

  const severityColor = {
    sage: theme.colors.sage,
    amber: theme.colors.amber,
    slate: theme.colors.slate,
  }[priorityReminder.severity] || theme.colors.textMuted;

  return (
    <div className="reminder-banner" style={{ borderLeftColor: severityColor }}>
      <div className="reminder-content">
        <span className="reminder-message">{priorityReminder.message}</span>
      </div>
      <button className="reminder-close" onClick={handleDismiss} aria-label="Dismiss">✕</button>
    </div>
  );
}

export default ReminderBanner;
