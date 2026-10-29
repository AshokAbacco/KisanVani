import { Outlet } from 'react-router-dom';
import { useI18n } from '../i18n';

/**
 * Password-reset screens. Rendered inside PublicLayout, so the site navbar (with the language
 * switcher) and footer are already around it. Split screen: form on the left, a quiet field
 * illustration on the right (hidden on mobile). Fills the viewport below the fixed header.
 */
const AuthLayout = () => {
  const { t } = useI18n();
  return (
    <div className="grid min-h-[calc(100dvh-4rem)] bg-white lg:min-h-[calc(100dvh-72px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
      <div className="flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </div>
      <div className="relative hidden overflow-hidden bg-field-800 lg:block">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 600 800" preserveAspectRatio="xMidYMid slice" aria-hidden>
          {Array.from({ length: 14 }).map((_, i) => (
            <path key={i} d={`M-50 ${820 - i * 52} Q300 ${640 - i * 58} 650 ${820 - i * 52}`} fill="none" stroke="#3FA34D" strokeOpacity={0.12 + (i % 3) * 0.05} strokeWidth="2" />
          ))}
          <circle cx="470" cy="150" r="56" fill="#E09A1B" fillOpacity=".9" />
        </svg>
        <div className="absolute inset-x-12 bottom-14 text-field-50">
          <p className="font-display text-4xl font-semibold leading-tight text-white">{t('authLayout.title')}</p>
          <p className="mt-4 max-w-md text-field-200">{t('authLayout.body')}</p>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;