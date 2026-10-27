import { Link } from 'react-router-dom';

export const LogoMark = ({ className = 'h-9 w-9' }) => (
  <svg viewBox="0 0 64 64" className={className} aria-hidden>
    <rect width="64" height="64" rx="16" fill="#31b865" />
    <path d="M32 50c0-14 4-24 14-30-12 1-18 8-19 17-1-6-5-10-11-11 5 4 7 11 7 24z" fill="#F4F8F2" />
    <circle cx="46" cy="18" r="4" fill="#E09A1B" />
  </svg>
);

const Logo = ({ to = '/', light = false, className = '' }) => (
  <Link to={to} className={`inline-flex items-center gap-2.5 ${className}`} aria-label="KisanVani home">
    <LogoMark />
    <span className={`font-display text-xl font-bold tracking-tight ${light ? 'text-white' : 'text-soil'}`}>KisanVani</span>
  </Link>
);

export default Logo;
