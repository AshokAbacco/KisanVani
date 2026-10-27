import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import en from './locales/en';
import hi from './locales/hi';
import kn from './locales/kn';

/**
 * Lightweight i18n. To add a language: create locales/<code>.js mirroring en.js keys,
 * import it here and set `ready: true` in LANGUAGES. Missing keys fall back to English.
 */
export const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English', ready: true },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी', ready: true },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ', ready: true },
  { code: 'te', label: 'Telugu', native: 'తెలుగు', ready: false },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்', ready: false },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം', ready: false },
  { code: 'mr', label: 'Marathi', native: 'मराठी', ready: false },
];

const DICTS = { en, hi, kn };
const STORAGE_KEY = 'kv_lang';

const lookup = (dict, key) => key.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), dict);

const I18nContext = createContext(null);

export const I18nProvider = ({ children }) => {
  const [lang, setLangState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || 'en';
    } catch {
      return 'en';
    }
  });

  useEffect(() => {
    document.documentElement.lang = lang;
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

  /** t('auth.signIn') or t('nav.x', 'Fallback text', { name }) */
  const t = useCallback(
    (key, fallback, vars) => {
      let s = lookup(DICTS[lang], key) ?? lookup(en, key) ?? fallback ?? key;
      if (vars) Object.entries(vars).forEach(([k, v]) => (s = s.replace(`{${k}}`, v)));
      return s;
    },
    [lang]
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => useContext(I18nContext);
export const useT = () => useContext(I18nContext).t;
