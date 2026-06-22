const STORAGE_KEY = 'skillswap-theme';

export function getPreferredTheme() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.style.colorScheme = theme;
}

export function setTheme(theme) {
  applyTheme(theme);
  localStorage.setItem(STORAGE_KEY, theme);
  syncThemeToggle(theme);
}

export function toggleTheme() {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}

function syncThemeToggle(theme) {
  document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
    const isDark = theme === 'dark';
    btn.setAttribute('aria-pressed', String(isDark));
    btn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to night mode');

    const sun = btn.querySelector('.theme-icon-sun');
    const moon = btn.querySelector('.theme-icon-moon');
    if (sun) sun.hidden = isDark;
    if (moon) moon.hidden = !isDark;
  });
}

export function initTheme() {
  const theme = getPreferredTheme();
  applyTheme(theme);
  syncThemeToggle(theme);

  document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => toggleTheme());
  });

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setTheme(e.matches ? 'dark' : 'light');
    }
  });
}
