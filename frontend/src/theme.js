// Soft, light, low-contrast design system
// Calm sage / slate / cream — easy on the eyes, no neon

export const theme = {
  colors: {
    // Backgrounds
    bgDeep: '#eef2f6',
    bgSoft: '#e7edf3',
    widget: '#ffffff',
    widgetGlass: 'rgba(255, 255, 255, 0.72)',

    // Text
    textPrimary: '#3a4452',
    textSecondary: '#7c8a9a',
    textMuted: '#aab4c0',

    // Accents (soft, muted)
    sage: '#88b09e',
    sageLight: '#b4cfc2',
    slate: '#8fa8c4',
    slateLight: '#bcd0e3',
    sand: '#d8c9a8',
    blush: '#d9a8a8',

    // Lines / borders
    border: '#e3e9f0',
    grid: '#eef2f6',
  },

  // Soft palette for charts — pastel, harmonious
  chartPalette: ['#88b09e', '#8fa8c4', '#d8b48a', '#c79bb8', '#9ec3a8', '#a8b8d9'],

  // Per-path identity colors (muted)
  pathColors: {
    'ai-consulting': '#88b09e',
    'ai-tools': '#8fa8c4',
    'online-work': '#d8b48a',
    'apps': '#c79bb8',
  },

  shadow: {
    soft: '0 4px 20px rgba(80, 100, 120, 0.08)',
    lift: '0 10px 30px rgba(80, 100, 120, 0.15)',
  },
};

export const pathInfo = {
  'ai-consulting': { name: 'AI Consulting', emoji: '🤝', short: 'Consulting' },
  'ai-tools': { name: 'AI Tools', emoji: '⚙️', short: 'Tools' },
  'online-work': { name: 'Online Work', emoji: '💻', short: 'Online' },
  'apps': { name: 'Monetizable Apps', emoji: '📱', short: 'Apps' },
};
