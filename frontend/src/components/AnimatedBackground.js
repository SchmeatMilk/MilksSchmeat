import React from 'react';
import './AnimatedBackground.css';

// Ambient background: a real layered graphic (soft topographic contour lines
// + dot texture) under slowly drifting color blobs. Low-contrast, calm, alive.
function AnimatedBackground() {
  return (
    <div className="animated-bg" aria-hidden="true">
      {/* Topographic contour graphic */}
      <svg className="bg-topo" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        <defs>
          <pattern id="dots" width="26" height="26" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.1" fill="#8aa2bd" opacity="0.18" />
          </pattern>
        </defs>
        <rect width="1440" height="900" fill="url(#dots)" />
        <g fill="none" stroke="#7fa893" strokeWidth="1.2" opacity="0.16">
          <path d="M-50 250 C 250 180, 480 320, 760 240 S 1250 160, 1500 260" />
          <path d="M-50 330 C 260 270, 500 400, 780 320 S 1260 250, 1500 350" />
          <path d="M-50 410 C 270 350, 520 480, 800 400 S 1270 340, 1500 440" />
          <path d="M-50 560 C 240 500, 500 640, 800 560 S 1280 500, 1500 600" />
          <path d="M-50 650 C 260 600, 520 720, 820 650 S 1290 600, 1500 690" />
        </g>
        <g fill="none" stroke="#8aa2bd" strokeWidth="1.2" opacity="0.12">
          <path d="M-50 300 C 250 230, 480 370, 760 290 S 1250 210, 1500 310" />
          <path d="M-50 480 C 270 420, 520 550, 800 470 S 1270 410, 1500 510" />
        </g>
      </svg>

      <div className="bg-blob blob-1" />
      <div className="bg-blob blob-2" />
      <div className="bg-blob blob-3" />
    </div>
  );
}

export default AnimatedBackground;
