// Soft, warm, low-contrast design system — calm and easy on the eyes.
// Muted teal/sage + slate on a warm paper background. No neon.

export const theme = {
  colors: {
    // Backgrounds (warm paper)
    bgDeep: '#f3f1ec',
    bgSoft: '#efece6',
    widget: '#ffffff',
    widgetGlass: 'rgba(255, 255, 255, 0.74)',

    // Text (soft, never harsh black)
    textPrimary: '#42505f',
    textSecondary: '#7a8794',
    textMuted: '#a7b0bb',

    // Accents (muted, harmonious)
    sage: '#7fa893',
    sageLight: '#aecabb',
    slate: '#8aa2bd',
    slateLight: '#b9cadd',
    sand: '#d6bd92',
    blush: '#cfa3a3',
    clay: '#c79a8f',
    plum: '#b095bf',

    // Lines / borders
    border: '#e6e1d8',
    grid: '#ece8e0',
  },

  // Harmonious 6-tone pastel palette for charts.
  chartPalette: ['#7fa893', '#8aa2bd', '#d6bd92', '#c79a8f', '#9bbfa6', '#b095bf'],

  // Per-path identity colors (muted).
  pathColors: {
    'ai-consulting': '#7fa893',
    'ai-tools': '#8aa2bd',
    'online-work': '#d6bd92',
    'apps': '#b095bf',
  },

  shadow: {
    soft: '0 4px 18px rgba(90, 100, 110, 0.07)',
    lift: '0 12px 32px rgba(90, 100, 110, 0.14)',
  },
};

export const pathInfo = {
  'ai-consulting': { name: 'AI Consulting', emoji: '🤝', short: 'Consulting' },
  'ai-tools': { name: 'AI Tools', emoji: '⚙️', short: 'Tools' },
  'online-work': { name: 'Online Work', emoji: '💻', short: 'Online' },
  'apps': { name: 'Monetizable Apps', emoji: '📱', short: 'Apps' },
};
