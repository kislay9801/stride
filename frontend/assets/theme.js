/* Shared Tailwind (Play CDN) config + base styles for all Stride pages.
   Loaded right after the Tailwind CDN script in each page. */
tailwind.config = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'primary-container': '#b0e0e6',
        'on-tertiary-container': '#7a5634',
        'on-primary-container': '#36656a',
        'on-primary-fixed-variant': '#1d4d53',
        'inverse-on-surface': '#eff1f2',
        'tertiary-fixed-dim': '#edbd93',
        'secondary-container': '#baecba',
        'surface-tint': '#37656b',
        'on-tertiary-fixed-variant': '#60401f',
        'tertiary-container': '#ffcea3',
        'on-error': '#ffffff',
        'on-secondary-container': '#406d44',
        'on-background': '#191c1d',
        'surface-container-low': '#f2f4f5',
        'outline-variant': '#c0c8c9',
        'on-secondary-fixed': '#002108',
        'on-secondary-fixed-variant': '#24502a',
        'on-primary-fixed': '#001f23',
        background: '#f8fafb',
        'on-secondary': '#ffffff',
        'surface-container-high': '#e6e8e9',
        tertiary: '#7b5735',
        'primary-fixed': '#bbebf1',
        surface: '#f8fafb',
        'on-error-container': '#93000a',
        'inverse-surface': '#2e3132',
        'on-primary': '#ffffff',
        secondary: '#3c6840',
        'surface-container-lowest': '#ffffff',
        'secondary-fixed-dim': '#a1d3a2',
        error: '#ba1a1a',
        outline: '#707979',
        'inverse-primary': '#9fcfd5',
        'on-tertiary-fixed': '#2d1600',
        'primary-fixed-dim': '#9fcfd5',
        primary: '#37656b',
        'on-surface': '#191c1d',
        'on-surface-variant': '#404849',
        'surface-container': '#eceeef',
        'on-tertiary': '#ffffff',
        'surface-variant': '#e1e3e4',
        'surface-container-highest': '#e1e3e4',
        'secondary-fixed': '#bdefbc',
        'tertiary-fixed': '#ffdcbf',
        'error-container': '#ffdad6',
        'surface-dim': '#d8dadb',
        'surface-bright': '#f8fafb',
      },
      borderRadius: { DEFAULT: '0.25rem', lg: '0.5rem', xl: '0.75rem', full: '9999px' },
      spacing: {
        sm: '8px', xl: '40px', gutter: '24px', 'container-max': '1200px',
        lg: '24px', xs: '4px', md: '16px', unit: '4px', 'margin-mobile': '16px',
      },
      fontFamily: {
        'label-md': ['Geist'], 'headline-lg-mobile': ['Geist'], 'headline-md': ['Geist'],
        'label-sm': ['Geist'], 'body-lg': ['Geist'], 'headline-lg': ['Geist'],
        display: ['Geist'], 'body-md': ['Geist'],
      },
      fontSize: {
        'label-md': ['14px', { lineHeight: '1.4', letterSpacing: '0.01em', fontWeight: '500' }],
        'headline-lg-mobile': ['24px', { lineHeight: '1.3', fontWeight: '600' }],
        'headline-md': ['24px', { lineHeight: '1.4', fontWeight: '500' }],
        'label-sm': ['12px', { lineHeight: '1.4', letterSpacing: '0.02em', fontWeight: '500' }],
        'body-lg': ['18px', { lineHeight: '1.6', fontWeight: '400' }],
        'headline-lg': ['32px', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '600' }],
        display: ['48px', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '600' }],
        'body-md': ['16px', { lineHeight: '1.6', fontWeight: '400' }],
      },
    },
  },
};

const baseStyles = `
  body { font-family: 'Geist', sans-serif; -webkit-font-smoothing: antialiased; }
  .glass-effect, .glass-card { background: rgba(255,255,255,0.7); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }
  .glass-card { border: 1px solid rgba(55,101,107,0.05); }
  .glass-panel { background: rgba(176,224,230,0.15); backdrop-filter: blur(20px); border: 1px solid rgba(55,101,107,0.1); }
  .capacity-ring { transition: stroke-dashoffset 0.6s ease-in-out; }
  .custom-scrollbar::-webkit-scrollbar { width: 6px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #b0e0e6; border-radius: 10px; }
  .notebook-lines { background-image: linear-gradient(#b0e0e6 1px, transparent 1px); background-size: 100% 2rem; }
  .flashcard { perspective: 1000px; }
  .flashcard-inner { transition: transform 0.6s; transform-style: preserve-3d; position: relative; width: 100%; height: 100%; }
  .flashcard.flipped .flashcard-inner { transform: rotateY(180deg); }
  .flashcard-front, .flashcard-back { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
  .flashcard-back { transform: rotateY(180deg); }
  .fade-in { animation: fadeIn 0.4s ease-out forwards; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

  /* Dark mode — overrides the dominant light surfaces/text. Teal accents carry over. */
  html.dark body { background: #0f1414; color: #e0e3e3; }
  html.dark .bg-background { background-color: #0f1414 !important; }
  html.dark .bg-surface-container-lowest { background-color: #161c1d !important; }
  html.dark .bg-surface-container-low { background-color: #1b2122 !important; }
  html.dark .bg-surface-container { background-color: #1f2526 !important; }
  html.dark .bg-surface-container-high { background-color: #252b2c !important; }
  html.dark .bg-surface-container-highest { background-color: #2e3434 !important; }
  html.dark .bg-surface-container-highest\\/50 { background-color: rgba(46,52,52,0.5) !important; }
  html.dark .text-on-surface { color: #e0e3e3 !important; }
  html.dark .text-on-surface-variant { color: #bfc8c9 !important; }
  html.dark .glass-effect, html.dark .glass-card { background: rgba(22,28,29,0.72) !important; }
  html.dark .glass-panel { background: rgba(40,60,62,0.28) !important; }
  html.dark .border-outline-variant\\/10, html.dark .border-outline-variant\\/20, html.dark .border-outline-variant\\/30 { border-color: rgba(120,134,135,0.18) !important; }
  html.dark input, html.dark textarea, html.dark select { color: #e0e3e3; }
`;
const styleEl = document.createElement('style');
styleEl.textContent = baseStyles;
document.head.appendChild(styleEl);

// Apply saved theme as early as possible to avoid a flash.
try {
  if (localStorage.getItem('stride-theme') === 'dark') {
    document.documentElement.classList.remove('light');
    document.documentElement.classList.add('dark');
  }
} catch (_) {}
