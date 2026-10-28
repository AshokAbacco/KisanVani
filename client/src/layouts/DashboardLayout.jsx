import { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, User, Settings, ChevronDown, Languages } from 'lucide-react';
import Logo from '../components/common/Logo';
import Avatar from '../components/common/Avatar';
import NotificationBell from '../components/common/NotificationBell';
import ErrorBoundary from '../components/feedback/ErrorBoundary';
import { useAuth } from '../context/AuthContext';
import { useI18n, LANGUAGES } from '../i18n';
import { NAV, QUICK_NAV, PROFILE_LINKS, findActive } from '../constants/nav';
import { ROLES } from '../constants/roles';
import { authApi } from '../services';

const SidebarNav = ({ role, active, onNavigate }) => (
  <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Main">
    <ul className="space-y-1">
      {NAV[role].map((it) => {
        const isActive = active?.item === it;
        return (
          <li key={it.label}>
            <Link
              to={it.tabs[0].to}
              onClick={onNavigate}
              aria-current={isActive ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] transition ${isActive ? 'accent-soft accent-text font-semibold' : 'text-soil-600 hover:bg-soil-100 hover:text-soil'}`}
            >
              <it.icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
              <span className="truncate">{it.label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  </nav>
);

/** Tab strip for the related screens of the current sidebar item (only on its list screens, not detail pages). */
const SectionTabs = ({ active, pathname }) => {
  if (!active || active.item.tabs.length < 2 || !active.item.tabs.some((t) => t.to === pathname)) return null;
  return (
    <div role="tablist" className="mb-5 flex max-w-full gap-1 overflow-x-auto overflow-y-hidden border-b border-soil-200 [scrollbar-width:none]">
      {active.item.tabs.map((t) => {
        const on = t === active.tab;
        return (
          <Link
            key={t.to}
            to={t.to}
            role="tab"
            aria-selected={on}
            className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition ${on ? 'border-current accent-text' : 'border-transparent text-soil-500 hover:text-soil'}`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
};

const ProfileMenu = ({ user, base, onLogout }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  const settingsPath = user.role === 'ADMIN' ? '/admin/account' : `${base}/settings`;
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 rounded-lg p-1 pr-2 hover:bg-soil-100" aria-expanded={open} aria-haspopup="menu">
        <Avatar name={user.name} src={user.avatarUrl} size="h-8 w-8" />
        <span className="hidden max-w-[140px] truncate text-sm font-medium md:block">{user.name}</span>
        <ChevronDown className="hidden h-4 w-4 text-soil-400 md:block" aria-hidden />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-soil-200 bg-white py-1 shadow-lift">
          <div className="border-b border-soil-100 px-4 py-2.5">
            <p className="truncate font-semibold">{user.name}</p>
            <p className="text-xs text-soil-500">{ROLES[user.role].label}</p>
          </div>
          <Link role="menuitem" to={`${base}/profile`} onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-leafwhite">
            <User className="h-4 w-4" aria-hidden /> Profile
          </Link>
          <Link role="menuitem" to={settingsPath} onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-leafwhite">
            <Settings className="h-4 w-4" aria-hidden /> Account settings
          </Link>
          {(PROFILE_LINKS[user.role] || []).map((l) => (
            <Link key={l.to} role="menuitem" to={l.to} onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-leafwhite">
              <l.icon className="h-4 w-4" aria-hidden /> {l.label}
            </Link>
          ))}
          <button role="menuitem" onClick={onLogout} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-700 hover:bg-red-50">
            <LogOut className="h-4 w-4" aria-hidden /> Sign out
          </button>
        </div>
      )}
    </div>
  );
};

const LanguageSelect = () => {
  const { lang, setLang } = useI18n();
  const { setUser } = useAuth();
  const change = async (code) => {
    setLang(code);
    try {
      setUser(await authApi.updateMe({ preferredLanguage: code }));
    } catch {
      /* the local choice still applies */
    }
  };
  return (
    <label className="hidden items-center gap-1.5 rounded-lg px-2 text-sm text-soil-600 hover:bg-soil-100 sm:flex">
      <Languages className="h-4 w-4" aria-hidden />
      <span className="sr-only">Language</span>
      <select value={lang} onChange={(e) => change(e.target.value)} className="cursor-pointer bg-transparent py-2 pr-1 focus:outline-none">
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code} disabled={!l.ready}>
            {l.native}
            {l.ready ? '' : ' (soon)'}
          </option>
        ))}
      </select>
    </label>
  );
};

/** Shell for all five dashboards. The role accent is applied through the data-role CSS variables. */
const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const [drawer, setDrawer] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const role = user.role;
  const meta = ROLES[role];

  useEffect(() => setDrawer(false), [location.pathname]);

  const signOut = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const active = findActive(role, location.pathname);
  const quick = QUICK_NAV[role].map((label) => NAV[role].find((it) => it.label === label)).filter(Boolean);
  const notificationsPath = role === 'ADMIN' ? '/admin/notifications' : `${meta.base}/notifications`;

  return (
    <div data-role={role} className="min-h-screen bg-leafwhite">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-soil-200 bg-white lg:flex">
        <div className="flex h-16 items-center border-b border-soil-200 px-5">
          <Logo to={meta.base} />
        </div>
        <div className="mx-3 mt-3 flex items-center gap-2 rounded-lg accent-soft px-3 py-2">
          <meta.icon className="h-4 w-4 accent-text" aria-hidden />
          <span className="text-sm font-semibold accent-text">{meta.label}</span>
        </div>
        <SidebarNav role={role} active={active} />
      </aside>

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-soil/40" onClick={() => setDrawer(false)} aria-hidden />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white shadow-lift">
            <div className="flex h-16 items-center justify-between border-b border-soil-200 px-4">
              <Logo to={meta.base} />
              <button onClick={() => setDrawer(false)} className="rounded-lg p-2 hover:bg-soil-100" aria-label="Close menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            <SidebarNav role={role} active={active} onNavigate={() => setDrawer(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-soil-200 bg-white/95 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-2">
            <button onClick={() => setDrawer(true)} className="rounded-lg p-2 hover:bg-soil-100 lg:hidden" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </button>
            <span className="hidden text-sm text-soil-500 sm:inline">
              {role === 'SHOPKEEPER' && user.shopProfile?.shopName}
              {role === 'FARMER' && (user.farmerProfile?.farmName || 'My farm')}
              {role === 'MANDI_OWNER' && user.mandiProfile?.mandiName}
              {role === 'DRIVER' && `Licence ${user.driverProfile?.licenseNumber || ''}`}
              {role === 'ADMIN' && 'Platform administration'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <LanguageSelect />
            <NotificationBell allLink={notificationsPath} />
            <ProfileMenu user={user} base={meta.base} onLogout={signOut} />
          </div>
        </header>

        <main className="mx-auto max-w-[1400px] px-4 pb-24 pt-6 sm:px-6 lg:pb-10">
          <SectionTabs active={active} pathname={location.pathname} />
          <ErrorBoundary resetKey={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      {/* Mobile quick navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-soil-200 bg-white lg:hidden" aria-label="Quick">
        {quick.map((it) => (
          <Link key={it.label} to={it.tabs[0].to} className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${active?.item === it ? 'accent-text font-semibold' : 'text-soil-500'}`}>
            <it.icon className="h-5 w-5" aria-hidden />
            <span className="max-w-full truncate px-1">{it.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
};

export default DashboardLayout;