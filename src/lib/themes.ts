export type Theme = {
  id: string;
  name: string;
  mode: 'dark' | 'light';
  swatch: [string, string];
  vars: Record<string, string>;
};

const dark = (
  id: string,
  name: string,
  swatch: [string, string],
  bg: string,
  panel: string,
  text: string,
  accent: string,
  accent2: string
): Theme => ({
  id,
  name,
  mode: 'dark',
  swatch,
  vars: {
    '--bg': bg,
    '--bg-elevated': shade(bg, 6),
    '--panel': panel,
    '--panel-solid': shade(bg, 10),
    '--text': text,
    '--muted': text === '#ffffff' ? 'rgba(255,255,255,.58)' : 'rgba(0,0,0,.56)',
    '--line': 'rgba(255,255,255,.09)',
    '--line-strong': 'rgba(255,255,255,.16)',
    '--accent': accent,
    '--accent-2': accent2,
    '--glow': hexToRgba(accent, 0.35),
    '--shadow': '0 30px 80px -30px rgba(0,0,0,.85)',
  },
});

const light = (
  id: string,
  name: string,
  swatch: [string, string],
  accent: string,
  accent2: string
): Theme => ({
  id,
  name,
  mode: 'light',
  swatch,
  vars: {
    '--bg': '#f6f6fa',
    '--bg-elevated': '#ffffff',
    '--panel': 'rgba(255,255,255,.72)',
    '--panel-solid': '#ffffff',
    '--text': '#0d0d16',
    '--muted': 'rgba(15,15,30,.58)',
    '--line': 'rgba(10,10,30,.10)',
    '--line-strong': 'rgba(10,10,30,.18)',
    '--accent': accent,
    '--accent-2': accent2,
    '--glow': hexToRgba(accent, 0.28),
    '--shadow': '0 30px 70px -35px rgba(20,20,50,.35)',
  },
});

function hexToRgba(hex: string, a: number) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

function shade(hex: string, amt: number) {
  const h = hex.replace('#', '');
  const n = parseInt(h, 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  return (
    '#' +
    [clamp(((n >> 16) & 255) + amt), clamp(((n >> 8) & 255) + amt), clamp((n & 255) + amt)]
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')
  );
}

export const THEMES: Theme[] = [
  dark('nebula', 'Nebula', ['#7c5cff', '#00e0ff'], '#07070d', 'rgba(255,255,255,.045)', '#f4f4fb', '#7c5cff', '#00e0ff'),
  dark('midnight', 'Midnight', ['#3b82f6', '#22d3ee'], '#04060f', 'rgba(255,255,255,.05)', '#eef4ff', '#4b8bff', '#22d3ee'),
  dark('ember', 'Ember', ['#ff6b35', '#ffd166'], '#0c0705', 'rgba(255,255,255,.05)', '#fff6ef', '#ff6b35', '#ffc93c'),
  dark('forest', 'Forest', ['#22c55e', '#a3e635'], '#050b08', 'rgba(255,255,255,.05)', '#effff5', '#22c55e', '#a3e635'),
  dark('sakura', 'Sakura', ['#ff5fa2', '#b983ff'], '#0b050b', 'rgba(255,255,255,.05)', '#fff0f7', '#ff5fa2', '#b983ff'),
  dark('mono', 'Monolith', ['#e5e7eb', '#9ca3af'], '#060607', 'rgba(255,255,255,.05)', '#f7f7f8', '#e5e7eb', '#8b8b98'),
  light('daylight', 'Daylight', ['#6d5cff', '#00b3ff'], '#6d5cff', '#00b3ff'),
  light('paper', 'Paper', ['#111827', '#f59e0b'], '#111827', '#f59e0b'),
];

export const ACCENTS = ['#7c5cff', '#00e0ff', '#ff5fa2', '#ff8a00', '#22c55e', '#4b8bff', '#f43f5e', '#eab308'];

export function applyTheme(themeId: string, accent?: string) {
  const theme = THEMES.find((t) => t.id === themeId) || THEMES[0];
  const root = document.documentElement;
  root.dataset.theme = theme.id;
  root.dataset.mode = theme.mode;
  for (const [k, v] of Object.entries(theme.vars)) root.style.setProperty(k, v);
  if (accent) {
    root.style.setProperty('--accent', accent);
    root.style.setProperty('--glow', hexToRgba(accent, 0.35));
  }
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme.vars['--bg'] || '#07070d');
  return theme;
}
