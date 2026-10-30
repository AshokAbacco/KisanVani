// src/components/common/LanguageSwitcher.jsx
import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown, Languages } from 'lucide-react';
import { LANGUAGES, useI18n } from '../../i18n';

/**
 * Language picker used in BOTH the website navbar and the dashboard header.
 * Changing the language re-renders every page that reads from t() and is remembered in this
 * browser; <LanguageSync> also saves it to the signed-in user's profile.
 *
 * `compact` shows only the icon + a short script label (used on narrow screens).
 * `variant="dashboard"` uses the plain white dashboard header styling.
 */
const LanguageSwitcher = ({ compact = false, align = 'right', className = '', variant = 'site' }) => {
  const { lang, setLang, t } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const itemRefs = useRef([]);
  const menuId = useId();

  const languages = LANGUAGES.filter((l) => l.ready);
  const current = languages.find((l) => l.code === lang) || languages[0];

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => rootRef.current && !rootRef.current.contains(e.target) && setOpen(false);
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        rootRef.current?.querySelector('button')?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Focus the active language when the menu opens
  useEffect(() => {
    if (!open) return;
    const i = Math.max(0, languages.findIndex((l) => l.code === lang));
    itemRefs.current[i]?.focus();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (code) => {
    setOpen(false);
    if (code !== lang) setLang(code);
  };

  const onItemKey = (e, i) => {
    const n = languages.length;
    const move = (to) => {
      e.preventDefault();
      itemRefs.current[(to + n) % n]?.focus();
    };
    if (e.key === 'ArrowDown') move(i + 1);
    else if (e.key === 'ArrowUp') move(i - 1);
    else if (e.key === 'Home') move(0);
    else if (e.key === 'End') move(n - 1);
    else if (e.key === 'Tab') setOpen(false);
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`${t('nav.language')}: ${current.native}`}
        title={t('nav.chooseLanguage')}
        className={`inline-flex h-10 items-center gap-1.5 rounded-lg text-sm font-semibold text-soil-700 transition hover:text-soil focus-visible:outline focus-visible:outline-2 focus-visible:outline-field-700 ${
          variant === 'dashboard' ? 'border border-soil-200 bg-white hover:bg-soil-100' : 'border border-white/70 bg-white/60 shadow-sm hover:bg-white'
        } ${compact ? 'px-2.5' : 'px-3'} ${open ? 'bg-white ring-2 ring-[#34bb0c]/25' : ''}`}
      >
        <Languages className="h-[18px] w-[18px] shrink-0 text-field-700" aria-hidden />
        <span className="whitespace-nowrap">{compact ? current.short : current.native}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-soil-500 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={t('nav.chooseLanguage')}
          className={`absolute top-full z-[60] mt-2 w-60 overflow-hidden rounded-2xl bg-white p-1.5 shadow-xl shadow-green-900/10 ring-1 ring-soil-200 ${
            align === 'left' ? 'left-0' : 'right-0'
          }`}
        >
          <p className="px-3 pb-1.5 pt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-soil-500">{t('nav.chooseLanguage')}</p>
          {languages.map((l, i) => {
            const active = l.code === lang;
            return (
              <button
                key={l.code}
                ref={(el) => (itemRefs.current[i] = el)}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                lang={l.code}
                onClick={() => choose(l.code)}
                onKeyDown={(e) => onItemKey(e, i)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left outline-none transition focus-visible:bg-green-50 ${
                  active ? 'bg-green-50 text-green-800' : 'text-soil hover:bg-soil-100'
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold leading-tight">{l.native}</span>
                  {l.native !== l.label && <span className="block text-xs text-soil-500">{l.label}</span>}
                </span>
                {active && (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-600 text-white">
                    <Check className="h-3.5 w-3.5" aria-hidden />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
