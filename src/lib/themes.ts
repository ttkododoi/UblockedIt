export type Theme = {
  id: string;
  name: string;
  mode: 'light' | 'dark';
  swatch: [string, string];
};

/** Every theme is defined in CSS (`:root[data-theme=…]`); JS only switches it. */
export const THEMES: Theme[] = [
  { id: 'white', name: 'White', mode: 'light', swatch: ['#ffffff', '#d2d2d7'] },
  { id: 'fog', name: 'Fog', mode: 'light', swatch: ['#f5f5f7', '#c7c7cc'] },
  { id: 'sand', name: 'Sand', mode: 'light', swatch: ['#faf7f2', '#e4d9c7'] },
  { id: 'mint', name: 'Mint', mode: 'light', swatch: ['#f4faf6', '#0f9d58'] },
  { id: 'sky', name: 'Sky', mode: 'light', swatch: ['#f4f8fd', '#0066cc'] },
  { id: 'lilac', name: 'Lilac', mode: 'light', swatch: ['#f8f5fd', '#6d3bd4'] },
  { id: 'graphite', name: 'Graphite', mode: 'dark', swatch: ['#101012', '#2997ff'] },
  { id: 'midnight', name: 'Midnight', mode: 'dark', swatch: ['#0b1020', '#5b8cff'] },
];

export const ACCENTS = ['#0071e3', '#0f9d58', '#6d3bd4', '#e0245e', '#b25000', '#00828f', '#1d1d1f'];

export function applyTheme(themeId: string, accent?: string) {
  const theme = THEMES.find((t) => t.id === themeId) || THEMES[0];
  const root = document.documentElement;
  root.dataset.theme = theme.id;
  if (accent) root.style.setProperty('--accent', accent);
  else root.style.removeProperty('--accent');
  const isDark = theme.mode === 'dark';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', isDark ? '#000000' : '#ffffff');
  return theme;
}
