import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { pathInfo } from '../theme';
import './NextMove.css';

// ADHD-aware hero: ONE clear action, front and center. Removes decision paralysis.
function NextMove() {
  const [move, setMove] = useState(null);

  useEffect(() => {
    const fetch = () => axios.get('/api/next-move').then((r) => setMove(r.data)).catch(() => {});
    fetch();
    const t = setInterval(fetch, 30000);
    return () => clearInterval(t);
  }, []);

  const info = move?.path && pathInfo[move.path];

  return (
    <div className="nextmove">
      <div className="nextmove-label">
        <span className="nextmove-pulse" /> YOUR NEXT MOVE
      </div>
      <motion.div
        key={move?.text}
        className="nextmove-text"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {move?.text || 'Loading…'}
      </motion.div>
      <div className="nextmove-meta">
        {info && <span className="nextmove-chip">{info.emoji} {info.short}</span>}
        {move?.priority && <span className="nextmove-chip priority">{move.priority.replace('-', ' ')}</span>}
        {move?.source === 'task' && <span className="nextmove-chip soft">from today's tasks</span>}
        {move?.source === 'experiment' && <span className="nextmove-chip soft">next action</span>}
      </div>
    </div>
  );
}

export default NextMove;
