// src/layouts/PublicLayout.jsx

import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Menu, X, Phone, Mail } from 'lucide-react';
import Logo from '../components/common/Logo';
import Button from '../components/common/Button';
import LanguageSwitcher from '../components/common/LanguageSwitcher';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { roleBase } from '../constants/roles';
import { useI18n } from '../i18n';

const LINKS = [
  { to: '/features', key: 'nav.features' },
  // { to: '/how-it-works', key: 'nav.howItWorks' },
  { to: '/about', key: 'nav.about' },
  // { to: '/faq', key: 'nav.faq' },
  { to: '/contact', key: 'nav.contact' },
];

/* Same container as HomePage, so header, page content and footer line up. */
const CONTAINER =
  'mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 2xl:max-w-[1440px] 2xl:px-10';

/**
 * Shell for the public website AND the auth screens (login, register, password reset):
 * fixed navbar with the language switcher on top, footer at the bottom.
 */
const PublicLayout = () => {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const settings = useSettings();
  const { pathname, hash } = useLocation();
  const { t } = useI18n();

  const supportPhone = settings['platform.supportPhone'];
  const supportEmail = settings['platform.supportEmail'];

  // Close the menu on every page change; go to the top, or to #section when the link has one
  useEffect(() => {
    setOpen(false);
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) {
        requestAnimationFrame(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }));
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  // While the mobile menu is open: close on Escape, and close if the
  // screen is widened past the menu breakpoint (e.g. tablet rotated)
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    const mq = window.matchMedia('(min-width: 1024px)');
    const onResize = (e) => e.matches && setOpen(false);
    window.addEventListener('keydown', onKey);
    mq.addEventListener('change', onResize);
    return () => {
      window.removeEventListener('keydown', onKey);
      mq.removeEventListener('change', onResize);
    };
  }, [open]);

  return (
    /* overflow-x-clip (not -hidden): hides sideways overflow without turning this div into a
       scroll container, so position: sticky keeps working on the pages inside it. */
    <div className="flex min-h-screen w-full flex-col overflow-x-clip bg-white">
      {/* Sky-blue → leaf-green, taken from the hero image so the header blends into it */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-[#cfe6c2] bg-gradient-to-r from-[#e4f2fc]/95 via-[#eef8f1]/95 to-[#e2f4d6]/95 shadow-[0_1px_12px_rgba(52,187,12,0.08)] backdrop-blur-md">
        <div className={`${CONTAINER} flex h-16 items-center justify-between gap-3 lg:h-[72px]`}>
          <div className="shrink-0">
            <Logo />
          </div>

          {/* Desktop nav — from 1024px; tablets use the menu so nothing gets squeezed */}
          <nav className="hidden min-w-0 items-center gap-0.5 lg:flex xl:gap-1" aria-label={t('nav.main')}>
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-lg px-2.5 py-2 text-[15px] transition xl:px-3 2xl:text-base ${
                    isActive
                      ? 'bg-white/70 font-semibold text-field-800 shadow-sm'
                      : 'text-soil-600 hover:bg-white/50 hover:text-soil'
                  }`
                }
              >
                {t(l.key)}
              </NavLink>
            ))}
          </nav>

          <div className="hidden shrink-0 items-center gap-2 lg:flex">
            <LanguageSwitcher />
            {user ? (
              <Button to={roleBase(user.role)} className="whitespace-nowrap">
                {t('nav.openDashboard')}
              </Button>
            ) : (
              <>
                <Button to="/login" variant="ghost" className="whitespace-nowrap">
                  {t('nav.signIn')}
                </Button>
                <Button to="/register" className="whitespace-nowrap">
                  {t('nav.getStarted')}
                </Button>
              </>
            )}
          </div>

          {/* Phones / tablets: language stays one tap away, next to the menu button */}
          <div className="flex items-center gap-1.5 lg:hidden">
            <LanguageSwitcher compact />
            <button
              type="button"
              className="-mr-2 rounded-lg p-2 text-soil transition hover:bg-white/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-field-700"
              onClick={() => setOpen((o) => !o)}
              aria-label={open ? t('nav.closeMenu') : t('nav.openMenu')}
              aria-expanded={open}
              aria-controls="mobile-menu"
            >
              {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile / tablet menu — scrolls on its own if the screen is short (landscape phones) */}
        {open && (
          <div
            id="mobile-menu"
            className="max-h-[calc(100vh-4rem)] overflow-y-auto border-t border-[#cfe6c2] bg-gradient-to-b from-[#eef8f1] to-[#e2f4d6] lg:hidden"
          >
            <nav className={`${CONTAINER} pb-5`} aria-label={t('nav.mobile')}>
              {LINKS.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  className={({ isActive }) =>
                    `block border-b border-[#d6ebcb] py-3.5 text-base ${
                      isActive ? 'font-semibold text-field-800' : 'text-soil-700'
                    }`
                  }
                >
                  {t(l.key)}
                </NavLink>
              ))}
              <div className="mt-5 flex flex-col gap-2 min-[360px]:flex-row">
                {user ? (
                  <Button to={roleBase(user.role)} className="w-full justify-center min-[360px]:flex-1">
                    {t('nav.openDashboard')}
                  </Button>
                ) : (
                  <>
                    <Button to="/login" variant="secondary" className="w-full justify-center min-[360px]:flex-1">
                      {t('nav.signIn')}
                    </Button>
                    <Button to="/register" className="w-full justify-center min-[360px]:flex-1">
                      {t('nav.getStarted')}
                    </Button>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Header is fixed, so push the page down by exactly its height */}
      <main className="flex-1 pt-16 lg:pt-[72px]">
        <Outlet />
      </main>

      <footer
        className="bg-field-900 bg-cover bg-center bg-no-repeat text-field-100"
        style={{ backgroundImage: "url('/Home/footer.png')" }}
      >
        <div
          className={`${CONTAINER} grid gap-10 py-12 sm:grid-cols-2 sm:gap-x-8 sm:py-14 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr] lg:gap-10 2xl:py-16`}
        >
          <div className="sm:col-span-2 lg:col-span-1">
            <Logo light />
            <p className="mt-4 max-w-sm text-sm leading-relaxed">{t('footer.tagline')}</p>
          </div>

          <div>
            <p className="font-semibold text-white">{t('footer.platform')}</p>
            <ul className="mt-3 space-y-2.5 text-sm">
              <li><Link to="/features" className="hover:text-white">{t('nav.features')}</Link></li>
              <li><Link to="/#how-it-works" className="hover:text-white">{t('nav.howItWorks')}</Link></li>
              <li><Link to="/register" className="hover:text-white">{t('footer.createAccount')}</Link></li>
              <li><Link to="/login" className="hover:text-white">{t('nav.signIn')}</Link></li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-white">{t('footer.company')}</p>
            <ul className="mt-3 space-y-2.5 text-sm">
              <li><Link to="/about" className="hover:text-white">{t('footer.aboutUs')}</Link></li>
              <li><Link to="/faq" className="hover:text-white">{t('nav.faq')}</Link></li>
              <li><Link to="/privacy-policy" className="hover:text-white">{t('footer.privacy')}</Link></li>
              <li><Link to="/terms" className="hover:text-white">{t('footer.terms')}</Link></li>
            </ul>
          </div>

          <div className="min-w-0 sm:col-span-2 lg:col-span-1">
            <p className="font-semibold text-white">{t('footer.talkToUs')}</p>
            <ul className="mt-3 space-y-2.5 text-sm">
              {supportPhone && (
                <li>
                  <a href={`tel:${supportPhone}`} className="flex items-center gap-2 hover:text-white">
                    <Phone className="h-4 w-4 shrink-0" aria-hidden />
                    <span>{supportPhone}</span>
                  </a>
                </li>
              )}
              {supportEmail && (
                <li>
                  <a href={`mailto:${supportEmail}`} className="flex items-start gap-2 hover:text-white">
                    <Mail className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    <span className="min-w-0 break-all">{supportEmail}</span>
                  </a>
                </li>
              )}
              <li><Link to="/contact" className="hover:text-white">{t('footer.contactForm')}</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-field-800">
          <p className={`${CONTAINER} py-5 text-center text-xs text-gray-100 shadow-sm sm:text-left`}>
            {t('footer.copyright', '', { year: new Date().getFullYear() })}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;