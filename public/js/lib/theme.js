const KEY = 'misa-pulse-theme-v5';

export const THEMES = [
  { id: 'night', label: 'Dark', desc: 'Dark mode' },
  { id: 'aurora', label: 'Light', desc: 'Light mode' }
];

export function getTheme() {
  const stored = localStorage.getItem(KEY);
  if (stored === 'aurora') return 'aurora';
  return 'night';
}

export function applyTheme(id) {
  const theme = id === 'aurora' ? 'aurora' : 'night';
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(KEY, theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'night' ? '#111114' : '#eef3f0');
  return theme;
}

export function initTheme() {
  return applyTheme(getTheme());
}
