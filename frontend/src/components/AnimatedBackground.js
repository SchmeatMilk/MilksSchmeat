import React from 'react';
import './AnimatedBackground.css';

// Soft, slow-moving ambient background — makes the app feel "alive"
// without being distracting. Low-contrast blobs + faint grid.
function AnimatedBackground() {
  return (
    <div className="animated-bg" aria-hidden="true">
      <div className="bg-grid" />
      <div className="bg-blob blob-1" />
      <div className="bg-blob blob-2" />
      <div className="bg-blob blob-3" />
    </div>
  );
}

export default AnimatedBackground;
