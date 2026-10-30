import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import siteEn from './locales/site/en';
import siteHi from './locales/site/hi';
import siteKn from './locales/site/kn';
import siteTe from './locales/site/te';
import siteTa from './locales/site/ta';
import siteMl from './locales/site/ml';
import siteMr from './locales/site/mr';
import dashEn from './dashboard/en';
import dashHi from './dashboard/hi';
import dashKn from './dashboard/kn';
import dashTe from './dashboard/te';
import dashTa from './dashboard/ta';
import dashMl from './dashboard/ml';
import dashMr from './dashboard/mr';

/**
 * Lightweight i18n with ONE language for the whole app: the public website, the auth screens
 * and all five dashboards read the same `lang`, so a choice made in the website navbar or in
 * the dashboard header applies everywhere at once.
 *
 * Two locale files are merged per language:
 *  - locales/site/<code>.js  → public website, navbar, footer and auth screens
 *  - dashboard/<code>.js     → dashboards, shared app components, statuses and helpers
 *
 * To add a language: create both files mirroring the English ones, import them here, add them to
 * SOURCES and LANGUAGES. Any key missing in a locale falls back to English.
 */
export const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English', short: 'EN', ready: true },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी', short: 'हि', ready: true },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ', short: 'ಕ', ready: true },
  { code: 'te', label: 'Telugu', native: 'తెలుగు', short: 'తె', ready: true },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்', short: 'த', ready: true },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം', short: 'മ', ready: true },
  { code: 'mr', label: 'Marathi', native: 'मराठी', short: 'म', ready: true },
];

const isObject = (v) => v && typeof v === 'object' && !Array.isArray(v);

/** Recursively merges b into a (b wins). Arrays are replaced, not merged. */
const deepMerge = (a = {}, b = {}) => {
  const out = { ...a };
  Object.entries(b).forEach(([k, v]) => {
    out[k] = isObject(v) && isObject(out[k]) ? deepMerge(out[k], v) : v;
  });
  return out;
};

const SOURCES = {
  en: [siteEn, dashEn],
  hi: [siteHi, dashHi],
  kn: [siteKn, dashKn],
  te: [siteTe, dashTe],
  ta: [siteTa, dashTa],
  ml: [siteMl, dashMl],
  mr: [siteMr, dashMr],
};

const DICTS = Object.fromEntries(Object.entries(SOURCES).map(([code, parts]) => [code, parts.reduce(deepMerge, {})]));
const STORAGE_KEY = 'kv_lang';

const lookup = (dict, key) => key.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), dict);

const fill = (s, vars) => {
  if (!vars || typeof s !== 'string') return s;
  let out = s;
  Object.entries(vars).forEach(([k, v]) => {
    out = out.split(`{${k}}`).join(String(v ?? ''));
  });
  return out;
};

const translateIn = (lang, key, fallback, vars) => fill(lookup(DICTS[lang], key) ?? lookup(DICTS.en, key) ?? fallback ?? key, vars);

/* ── Module-level access for code outside React (formatters, validation rules, status labels) ── */
let currentLang = 'en';

/** Active language code, usable anywhere (e.g. in utils/format.js). */
export const getLang = () => currentLang;

/** Same as t() from useI18n, for non-component code. Always reads the active language. */
export const translate = (key, fallback, vars) => translateIn(currentLang, key, fallback, vars);

/**
 * Locale for Intl date/relative-time formatting: Indian region, local-language month names,
 * but always Latin digits so weights, prices and dates stay easy to compare across languages.
 */
export const intlLocale = (lang = currentLang) => (lang === 'en' ? 'en-IN' : `${lang}-IN-u-nu-latn`);

const readStored = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved && DICTS[saved] ? saved : null;
  } catch {
    return null;
  }
};

/**
 * True when someone picked a language in this browser (website navbar, dashboard header or
 * account settings). Used on sign-in: a choice made here wins over the one saved on the profile.
 */
export const hasStoredLang = () => readStored() !== null;

/** First visit: the stored choice, else the browser language if we support it, else English. */
const initialLang = () => {
  const saved = readStored();
  if (saved) return saved;
  const browser = (typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en').slice(0, 2).toLowerCase();
  return DICTS[browser] ? browser : 'en';
};

const I18nContext = createContext(null);

export const I18nProvider = ({ children }) => {
  const [lang, setLangState] = useState(initialLang);

  // Set before children render, so helpers called during this render already use the new language.
  currentLang = lang;

  useEffect(() => {
    document.documentElement.lang = lang;
    const title = lookup(DICTS[lang], 'meta.title') ?? lookup(DICTS.en, 'meta.title');
    if (title) document.title = title;
  }, [lang]);

  // Another tab changed the language → follow it here too.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY && e.newValue && DICTS[e.newValue]) setLangState(e.newValue);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setLang = useCallback((code) => {
    const next = DICTS[code] ? code : 'en';
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage unavailable */
    }
  }, []);

  /**
   * t('auth.signIn')
   * t('nav.x', 'Fallback text', { name })   → replaces every {name}
   * t('home.features')                       → arrays / objects are returned as-is
   */
  const t = useCallback((key, fallback, vars) => translateIn(lang, key, fallback, vars), [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => useContext(I18nContext);
export const useT = () => useContext(I18nContext).t;
