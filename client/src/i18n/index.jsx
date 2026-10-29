import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import en from './locales/en';
import hi from './locales/hi';
import kn from './locales/kn';
import siteEn from './locales/site/en';
import siteHi from './locales/site/hi';
import siteKn from './locales/site/kn';
import siteTe from './locales/site/te';
import siteTa from './locales/site/ta';
import siteMl from './locales/site/ml';
import siteMr from './locales/site/mr';

/**
 * Lightweight i18n.
 *
 * Two kinds of locale files are merged per language:
 *  - locales/<code>.js       → dashboard / app strings (partial for most languages)
 *  - locales/site/<code>.js  → public website, navbar, footer and auth screens (complete)
 *
 * To add a language: create locales/site/<code>.js mirroring site/en.js, import it here,
 * add it to SOURCES and set `ready: true` in LANGUAGES. Missing keys fall back to English.
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
  en: [en, siteEn],
  hi: [hi, siteHi],
  kn: [kn, siteKn],
  te: [{}, siteTe],
  ta: [{}, siteTa],
  ml: [{}, siteMl],
  mr: [{}, siteMr],
};

const DICTS = Object.fromEntries(Object.entries(SOURCES).map(([code, parts]) => [code, parts.reduce(deepMerge, {})]));
const STORAGE_KEY = 'kv_lang';

const lookup = (dict, key) => key.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), dict);

/** First visit: use the browser language if we support it, otherwise English. */
const initialLang = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && DICTS[saved]) return saved;
  } catch {
    /* storage unavailable */
  }
  const browser = (typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en').slice(0, 2).toLowerCase();
  return DICTS[browser] ? browser : 'en';
};

const I18nContext = createContext(null);

export const I18nProvider = ({ children }) => {
  const [lang, setLangState] = useState(initialLang);

  useEffect(() => {
    document.documentElement.lang = lang;
    const title = lookup(DICTS[lang], 'meta.title') ?? lookup(DICTS.en, 'meta.title');
    if (title) document.title = title;
  }, [lang]);

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
  const t = useCallback(
    (key, fallback, vars) => {
      let s = lookup(DICTS[lang], key) ?? lookup(DICTS.en, key) ?? fallback ?? key;
      if (vars && typeof s === 'string') {
        Object.entries(vars).forEach(([k, v]) => {
          s = s.split(`{${k}}`).join(String(v));
        });
      }
      return s;
    },
    [lang]
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => useContext(I18nContext);
export const useT = () => useContext(I18nContext).t;