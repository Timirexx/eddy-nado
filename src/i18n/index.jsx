import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_LOCALE, LOCALES, detectLocale, getLocale } from './locales.js';
import { STRINGS } from './strings.js';

const STORAGE_KEY = 'eddy.locale.v1';
const I18nContext = createContext(null);

function readStoredLocale() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && LOCALES.some((l) => l.code === stored)) return stored;
  } catch {
    /* fall through to detection */
  }
  // No stored choice: match the browser rather than forcing English on someone
  // whose device is already set to a supported language.
  return detectLocale();
}

export function I18nProvider({ children }) {
  const [code, setCode] = useState(readStoredLocale);
  const locale = getLocale(code);

  useEffect(() => {
    // `lang` matters for screen readers and hyphenation; `dir` is what actually
    // mirrors the layout for Arabic and Urdu — without it the interface stays
    // left-to-right while the text runs the other way.
    document.documentElement.lang = code;
    document.documentElement.dir = locale.dir;
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      /* preference still applies for this session */
    }
  }, [code, locale.dir]);

  const setLocale = useCallback((next) => {
    if (LOCALES.some((l) => l.code === next)) setCode(next);
  }, []);

  const t = useCallback(
    (key) => {
      const entry = STRINGS[key];
      if (!entry) return key; // Surfaces a typo'd key instead of rendering blank.
      return entry[code] ?? entry[DEFAULT_LOCALE] ?? key;
    },
    [code],
  );

  const value = useMemo(() => ({ locale, code, setLocale, t }), [locale, code, setLocale, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}

/** Applied before React mounts so RTL layouts don't flash left-to-right first. */
export function applyStoredLocaleEarly() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const locale = LOCALES.find((l) => l.code === stored);
    if (locale) {
      document.documentElement.lang = locale.code;
      document.documentElement.dir = locale.dir;
    }
  } catch {
    /* nothing to do */
  }
}

export { LOCALES, DEFAULT_LOCALE };
