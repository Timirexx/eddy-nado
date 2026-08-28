import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'eddy.theme.v1';
export const THEMES = ['system', 'light', 'dark'];

/**
 * Theme preference, applied as a `data-theme` attribute on <html>.
 *
 * The stylesheet already resolves three states: the bare :root block holds the
 * light palette, a prefers-color-scheme block guarded with
 * :root:not([data-theme="light"]) handles a dark OS, and :root[data-theme="dark"]
 * lets an explicit choice win either way. So "system" is expressed by removing
 * the attribute entirely and letting the media query decide — not by resolving
 * the OS preference ourselves and writing a fixed value, which would freeze the
 * theme if the OS switched while the app was open.
 */
export function useTheme() {
  const [theme, setThemeState] = useState(readStoredTheme);

  useEffect(() => {
    applyTheme(theme);
    try {
      if (theme === 'system') localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Private mode: the theme still applies for this session.
    }
  }, [theme]);

  // Keep the meta theme-color (browser UI tint on mobile) in step with whatever
  // is actually rendering, including OS changes while "system" is selected.
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const sync = () => syncBrowserChrome(theme, media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, [theme]);

  const setTheme = useCallback((next) => {
    if (THEMES.includes(next)) setThemeState(next);
  }, []);

  const resolved =
    theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : theme;

  return { theme, resolved, setTheme };
}

function readStoredTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return THEMES.includes(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
}

function syncBrowserChrome(theme, systemPrefersDark) {
  const dark = theme === 'dark' || (theme === 'system' && systemPrefersDark);
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  meta.content = dark ? '#060911' : '#EEF1F5';
}

/**
 * Applied before React mounts so a stored light preference does not flash the
 * dark palette on first paint.
 */
export function applyStoredThemeEarly() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      document.documentElement.setAttribute('data-theme', stored);
    }
  } catch {
    /* nothing to do */
  }
}
