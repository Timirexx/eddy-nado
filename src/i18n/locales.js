/**
 * Supported languages.
 *
 * `native` is what the selector shows — people scan for their language written
 * the way they write it, not the English exonym. `dir` drives the document's
 * text direction; Arabic and Urdu are right-to-left and the layout has to
 * follow, not just the text.
 *
 * `promptName` is the name handed to the model when asking it to reply in this
 * language. It is spelled out ("Mandarin Chinese", not "zh") because a written
 * name is unambiguous where a code can be read as literal text.
 */
export const LOCALES = [
  { code: 'en',  flag: '🇬🇧', name: 'English',          native: 'English',        dir: 'ltr', promptName: 'English' },
  { code: 'zh',  flag: '🇨🇳', name: 'Chinese',          native: '中文',            dir: 'ltr', promptName: 'Mandarin Chinese (Simplified)' },
  { code: 'hi',  flag: '🇮🇳', name: 'Hindi',            native: 'हिन्दी',           dir: 'ltr', promptName: 'Hindi' },
  { code: 'es',  flag: '🇪🇸', name: 'Spanish',          native: 'Español',        dir: 'ltr', promptName: 'Spanish' },
  { code: 'fr',  flag: '🇫🇷', name: 'French',           native: 'Français',       dir: 'ltr', promptName: 'French' },
  { code: 'ar',  flag: '🇸🇦', name: 'Arabic',           native: 'العربية',         dir: 'rtl', promptName: 'Modern Standard Arabic' },
  { code: 'bn',  flag: '🇧🇩', name: 'Bengali',          native: 'বাংলা',           dir: 'ltr', promptName: 'Bengali' },
  { code: 'pt',  flag: '🇵🇹', name: 'Portuguese',       native: 'Português',      dir: 'ltr', promptName: 'Portuguese' },
  { code: 'ru',  flag: '🇷🇺', name: 'Russian',          native: 'Русский',        dir: 'ltr', promptName: 'Russian' },
  { code: 'ur',  flag: '🇵🇰', name: 'Urdu',             native: 'اردو',            dir: 'rtl', promptName: 'Urdu' },
  { code: 'id',  flag: '🇮🇩', name: 'Indonesian',       native: 'Bahasa Indonesia', dir: 'ltr', promptName: 'Indonesian' },
  { code: 'de',  flag: '🇩🇪', name: 'German',           native: 'Deutsch',        dir: 'ltr', promptName: 'German' },
  { code: 'ja',  flag: '🇯🇵', name: 'Japanese',         native: '日本語',           dir: 'ltr', promptName: 'Japanese' },
  { code: 'pcm', flag: '🇳🇬', name: 'Nigerian Pidgin',  native: 'Naija Pidgin',   dir: 'ltr', promptName: 'Nigerian Pidgin English' },
  { code: 'tr',  flag: '🇹🇷', name: 'Turkish',          native: 'Türkçe',         dir: 'ltr', promptName: 'Turkish' },
  { code: 'it',  flag: '🇮🇹', name: 'Italian',          native: 'Italiano',       dir: 'ltr', promptName: 'Italian' },
  { code: 'ko',  flag: '🇰🇷', name: 'Korean',           native: '한국어',           dir: 'ltr', promptName: 'Korean' },
  { code: 'vi',  flag: '🇻🇳', name: 'Vietnamese',       native: 'Tiếng Việt',     dir: 'ltr', promptName: 'Vietnamese' },
  { code: 'sw',  flag: '🇹🇿', name: 'Swahili',          native: 'Kiswahili',      dir: 'ltr', promptName: 'Swahili' },
  { code: 'nl',  flag: '🇳🇱', name: 'Dutch',            native: 'Nederlands',     dir: 'ltr', promptName: 'Dutch' },
];

export const DEFAULT_LOCALE = 'en';

export const getLocale = (code) =>
  LOCALES.find((l) => l.code === code) ?? LOCALES[0];

/** Best match for the browser's languages, falling back to English. */
export function detectLocale() {
  if (typeof navigator === 'undefined') return DEFAULT_LOCALE;
  const preferred = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const tag of preferred) {
    if (!tag) continue;
    const base = tag.toLowerCase().split('-')[0];
    const hit = LOCALES.find((l) => l.code === base);
    if (hit) return hit.code;
  }
  return DEFAULT_LOCALE;
}
