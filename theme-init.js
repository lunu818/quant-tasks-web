(() => {
  'use strict';

  const storageKey = 'quant-tasks:theme:v1';
  let storedTheme = null;

  try {
    const value = window.localStorage.getItem(storageKey);
    if (value === 'light' || value === 'dark') storedTheme = value;
  } catch {
    // System preference remains available when storage is blocked.
  }

  const theme = storedTheme
    ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const root = document.documentElement;

  root.dataset.theme = theme;
  root.dataset.themeSource = storedTheme ? 'user' : 'system';
  root.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute(
    'content',
    theme === 'dark' ? '#050506' : '#eef1f3',
  );
  window.quantDesktop?.setTheme?.(theme);
})();
