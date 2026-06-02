import React from 'react';
import { motion } from 'framer-motion';
import './Widget.css';

// Glass-style card container. The ".widget-drag-handle" lets react-grid-layout
// drag from the header only (so buttons/charts inside stay clickable).
function Widget({ title, icon, accent, children, headerRight, flush }) {
  return (
    <motion.div
      className="widget-card"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      style={accent ? { '--accent': accent } : undefined}
    >
      <div className="widget-head widget-drag-handle">
        <div className="widget-head-left">
          {icon && <span className="widget-icon">{icon}</span>}
          <span className="widget-title">{title}</span>
        </div>
        {headerRight && <div className="widget-head-right">{headerRight}</div>}
      </div>
      <div className={`widget-body ${flush ? 'flush' : ''}`}>
        {children}
      </div>
    </motion.div>
  );
}

export default Widget;
