import { Outlet } from 'react-router-dom';
import Logo from '../components/common/Logo';

/** Split screen: form on the left, a quiet field illustration on the right (hidden on mobile). */
const AuthLayout = () => (
  <div className="grid min-h-screen bg-white lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
    <div className="flex flex-col px-5 py-6 sm:px-10">
      <Logo />
      <div className="flex flex-1 items-center justify-center py-10">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
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
        <p className="font-display text-4xl font-semibold leading-tight text-white">Every kilo, accounted for — from the field to the shop counter.</p>
        <p className="mt-4 max-w-md text-field-200">One login for your role. Orders, weights, trips and payments stay in step for farmers, Market Mandis, shops and drivers.</p>
      </div>
    </div>
  </div>
);

export default AuthLayout;
