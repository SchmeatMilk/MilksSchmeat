import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './MilestoneToast.css';

function MilestoneToast() {
  const [queue, setQueue] = useState([]);
  const [showing, setShowing] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axios.get('/api/milestones');
        const unseenMilestones = (res.data.earned || []).filter((m) => !m.seenAt);

        if (unseenMilestones.length > 0) {
          setQueue(unseenMilestones);
        }
      } catch (e) {
        // Silent fail
      }
    };

    fetch();
  }, []);

  useEffect(() => {
    if (queue.length > 0 && !showing) {
      const nextMilestone = queue[0];
      setShowing(nextMilestone);

      const timer = setTimeout(async () => {
        // Mark as seen
        try {
          await axios.post(`/api/milestones/${nextMilestone.id}/seen`);
        } catch (e) {
          // Silent fail
        }

        // Remove from queue and show next
        setQueue((prev) => prev.slice(1));
        setShowing(null);
      }, 3500);

      return () => clearTimeout(timer);
    }
  }, [queue, showing]);

  if (!showing) return null;

  return (
    <div className="milestone-toast">
      <div className="milestone-toast-inner">
        <div className="milestone-emoji">{showing.emoji}</div>
        <div className="milestone-text">{showing.message}</div>
      </div>
    </div>
  );
}

export default MilestoneToast;
