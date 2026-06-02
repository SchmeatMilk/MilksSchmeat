import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import './LoadingScreen.css';

const bootLines = [
  'Initializing command center…',
  'Syncing income paths…',
  'Loading revenue telemetry…',
  'Calibrating timeline…',
  'Dashboard ready.',
];

function LoadingScreen({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [lineIndex, setLineIndex] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const duration = 2200;
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, (elapsed / duration) * 100);
      setProgress(pct);
      setLineIndex(Math.min(bootLines.length - 1, Math.floor((pct / 100) * bootLines.length)));
      if (pct >= 100) {
        clearInterval(interval);
        setTimeout(onComplete, 450);
      }
    }, 30);
    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <motion.div
      className="loading-screen"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="loading-grid" />

      <div className="loading-center">
        <motion.div
          className="loading-ring"
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        >
          <div className="loading-ring-inner" />
        </motion.div>

        <motion.h1
          className="loading-title"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          INCOME HUNT
        </motion.h1>
        <motion.p
          className="loading-subtitle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          Command Dashboard
        </motion.p>

        <div className="loading-bar-track">
          <motion.div
            className="loading-bar-fill"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="loading-status">
          <span className="loading-pct">{Math.round(progress)}%</span>
          <motion.span
            key={lineIndex}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            className="loading-line"
          >
            {bootLines[lineIndex]}
          </motion.span>
        </div>
      </div>
    </motion.div>
  );
}

export default LoadingScreen;
