import React, { useState, useRef, useEffect } from 'react';
import { pathInfo } from '../theme';
import './ProjectMenu.css';

// Topbar dropdown listing active projects (experiments). Selecting one
// navigates to its detail page via the hash router.
function ProjectMenu({ experiments }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const active = (experiments || []).filter((e) => e.status === 'active');

  const go = (id) => {
    window.location.hash = `#/project/${encodeURIComponent(id)}`;
    setOpen(false);
  };

  return (
    <div className="project-menu" ref={ref}>
      <button className="project-menu-btn" onClick={() => setOpen((o) => !o)} title="Open a project page">
        <span className="pm-icon">🗂️</span> Projects <span className="pm-caret">{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <div className="project-menu-dropdown">
          {active.length === 0 ? (
            <div className="pm-empty">No active projects yet</div>
          ) : (
            active.map((e) => {
              const info = pathInfo[e.path] || { emoji: '•', short: e.path };
              return (
                <button key={e.id} className="pm-item" onClick={() => go(e.id)}>
                  <span className="pm-item-emoji">{info.emoji}</span>
                  <span className="pm-item-text">
                    <span className="pm-item-name">{e.name}</span>
                    <span className="pm-item-path">{info.short}</span>
                  </span>
                  <span className="pm-item-rev">${Math.round(e.revenueThisMonth || 0)}</span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default ProjectMenu;
