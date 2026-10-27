// src/auth/Login.jsx

import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Leaf, Sprout, Check } from 'lucide-react';
import Button from '../components/common/Button';
import Alert from '../components/feedback/Alert';
import { useAuth } from '../context/AuthContext';
import { LOGIN_ROLES, ROLES, roleBase } from '../constants/roles';
import { errorMessage } from '../utils/errors';
import { useI18n } from '../i18n';

/* Role thumbnails are cropped from the single /Home/loginUsers.png strip,
   so no extra image files are needed. Tweak a position if a face sits off-centre. */
const USERS_IMG = '/Home/loginUsers.png';
const ROLE_THUMB = {
  FARMER: '5% 18%',
  SHOPKEEPER: '30% 18%',
  MANDI_OWNER: '52% 32%',
  DRIVER: '75% 40%',
  ADMIN: '96% 18%',
};

const inputBase =
  'w-full rounded-xl border bg-white py-2.5 pl-11 pr-4 text-[15px] text-soil shadow-sm outline-none transition placeholder:text-soil-400 focus:border-green-600 focus:ring-4 focus:ring-green-600/15';

const Login = () => {
  const [params] = useSearchParams();
  const initialRole = LOGIN_ROLES.includes(params.get('role')) ? params.get('role') : 'FARMER';
  const [role, setRole] = useState(initialRole);
  const [show, setShow] = useState(false);
  const [error, setError] = useState(null);
  const { login, expired } = useAuth();
  const { t, setLang } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  const submit = async (v) => {
    setError(null);
    try {
      const user = await login({ identifier: v.identifier, password: v.password, role });
      if (user.preferredLanguage) setLang(user.preferredLanguage);
      const from = location.state?.from;
      // Only return to a page inside this user's own dashboard.
      navigate(from && from.startsWith(roleBase(user.role)) ? from : roleBase(user.role), { replace: true });
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    /* Fixed to the screen: exactly one viewport high, the page itself never scrolls */
    <div
      className="fixed inset-0 h-[100dvh] w-screen overflow-hidden bg-white bg-cover bg-no-repeat bg-left"
      style={{ backgroundImage: "url('/Home/login1.png')" }}
    >
      <div className="mx-auto grid h-full w-full max-w-[1440px] lg:grid-cols-[1.05fr_1fr]">
        {/* ───────── Left: brand panel ───────── */}
        <aside className="relative hidden h-full flex-col px-10 pt-10 lg:flex xl:px-14">
          <Link to="/" className="inline-flex w-fit items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-green-600 shadow-md">
              <Sprout className="h-6 w-6" aria-hidden />
            </span>
            <span className="font-display text-2xl font-bold text-[#0f3d1e] [text-shadow:0_1px_10px_rgba(255,255,255,0.9)]">
              KisanVani
            </span>
          </Link>

          {/* Soft white glow behind the copy so it reads on the bright sky */}
          <div className="relative isolate mt-12 max-w-xl">
            <span
              className="pointer-events-none absolute -inset-x-10 -inset-y-8 -z-10 rounded-[48px] bg-[radial-gradient(ellipse_at_left,rgba(255,255,255,0.75)_0%,rgba(255,255,255,0.45)_45%,rgba(255,255,255,0)_75%)] blur-md"
              aria-hidden
            />
            <h2 className="font-display text-[44px] font-extrabold leading-[1.08] tracking-[-0.02em] text-[#0f3d1e] [text-shadow:0_1px_12px_rgba(255,255,255,0.8)] xl:text-[52px]">
              Manage Your <span className="text-[#1f8a12]">Farm-to-Market</span> Operations
            </h2>
            <span className="mt-5 block h-1.5 w-20 rounded-full bg-yellow-400 shadow-sm" aria-hidden />
            <p className="mt-5 max-w-md text-lg font-medium leading-relaxed text-[#1e3a26] [text-shadow:0_1px_8px_rgba(255,255,255,0.9)]">
              A single platform for Farmers, Shop Owners, Market Mandis, Drivers and Admins.
            </p>
          </div>
        </aside>

        {/* ───────── Right: form ─────────
            Centred in the screen. Only on very short screens (small laptops,
            phones in landscape) does this column scroll, and its scrollbar is hidden. */}
        <main className="flex h-full items-center justify-center overflow-y-auto px-4 py-6 sm:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="m-auto w-full max-w-[460px] rounded-3xl bg-white/95 p-6 shadow-xl ring-1 ring-green-100 backdrop-blur sm:p-7 lg:bg-transparent lg:p-0 lg:shadow-none lg:ring-0 lg:backdrop-blur-0">
            {/* Mobile logo */}
            <Link to="/" className="mb-4 inline-flex items-center gap-2.5 lg:hidden">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-600 text-white">
                <Sprout className="h-5 w-5" aria-hidden />
              </span>
              <span className="font-display text-xl font-bold text-soil">KisanVani</span>
            </Link>

            <span className="inline-flex rounded-full bg-green-100 px-3.5 py-1 text-sm font-semibold text-green-700">
              {t('auth.signIn')}
            </span>
            <h1 className="mt-2 flex items-center gap-2 font-display text-3xl font-bold tracking-[-0.02em] text-soil sm:text-[38px]">
              {t('auth.welcomeBack')}
              <Leaf className="h-7 w-7 -rotate-12 text-green-500" aria-hidden />
            </h1>
            <p className="mt-1 text-sm text-soil-500">Sign in to your {ROLES[role].label} dashboard.</p>

            {expired && (
              <Alert tone="warning" className="mt-4">
                Your session ended. Please sign in again.
              </Alert>
            )}

            <form onSubmit={handleSubmit(submit)} className="mt-5 space-y-4" noValidate>
              {/* Role tiles */}
              <fieldset>
                <legend className="mb-2 text-sm font-medium text-soil">{t('auth.chooseRole')}</legend>
                <div role="radiogroup" className="grid grid-cols-1 gap-2.5 min-[380px]:grid-cols-2">
                  {LOGIN_ROLES.map((r) => {
                    const meta = ROLES[r];
                    const active = role === r;
                    const thumb = ROLE_THUMB[r];
                    return (
                      <button
                        key={r}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => setRole(r)}
                        className={`relative flex items-center gap-3 rounded-xl border bg-white p-1.5 pr-3 text-left text-sm font-semibold shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 ${
                          active
                            ? 'border-green-600 bg-green-50 text-green-800 ring-2 ring-green-600/20'
                            : 'border-soil-200 text-soil hover:-translate-y-0.5 hover:border-green-300 hover:shadow-md'
                        }`}
                      >
                        {thumb ? (
                          <span
                            className="h-9 w-9 shrink-0 rounded-lg bg-green-50 bg-no-repeat ring-1 ring-black/5"
                            style={{
                              backgroundImage: `url('${USERS_IMG}')`,
                              backgroundSize: '520% auto',
                              backgroundPosition: thumb,
                            }}
                            aria-hidden
                          />
                        ) : (
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-700">
                            {meta?.icon && <meta.icon className="h-5 w-5" aria-hidden />}
                          </span>
                        )}
                        <span className="truncate">{meta?.label ?? r}</span>
                        {active && (
                          <span className="ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-600 text-white">
                            <Check className="h-3.5 w-3.5" aria-hidden />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              {/* Identifier */}
              <div>
                <label htmlFor="login-identifier" className="mb-1 block text-sm font-medium text-soil">
                  {t('auth.identifier')}
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-soil-400" aria-hidden />
                  <input
                    id="login-identifier"
                    autoComplete="username"
                    inputMode="email"
                    placeholder="Enter e-mail or mobile number"
                    aria-invalid={!!errors.identifier}
                    className={`${inputBase} ${errors.identifier ? 'border-red-400' : 'border-soil-200'}`}
                    {...register('identifier', { required: 'Enter your e-mail or mobile number' })}
                  />
                </div>
                {errors.identifier && <p className="mt-1 text-sm text-red-600">{errors.identifier.message}</p>}
              </div>

              {/* Password */}
              <div>
                <label htmlFor="login-password" className="mb-1 block text-sm font-medium text-soil">
                  {t('auth.password')}
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-soil-400" aria-hidden />
                  <input
                    id="login-password"
                    type={show ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Enter password"
                    aria-invalid={!!errors.password}
                    className={`${inputBase} pr-12 ${errors.password ? 'border-red-400' : 'border-soil-200'}`}
                    {...register('password', { required: 'Enter your password' })}
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    aria-label={show ? 'Hide password' : 'Show password'}
                    className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-soil-400 transition hover:bg-green-50 hover:text-green-700"
                  >
                    {show ? <EyeOff className="h-5 w-5" aria-hidden /> : <Eye className="h-5 w-5" aria-hidden />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}

                <div className="mt-2 flex items-center justify-between text-sm">
                  <label className="inline-flex cursor-pointer items-center gap-2 text-soil-500">
                    <input
                      type="checkbox"
                      checked={show}
                      onChange={(e) => setShow(e.target.checked)}
                      className="h-4 w-4 rounded border-soil-300 accent-green-600"
                    />
                    Show password
                  </label>
                  <Link to="/forgot-password" className="font-semibold text-green-700 underline underline-offset-4 hover:text-green-800">
                    {t('auth.forgot')}
                  </Link>
                </div>
              </div>

              {error && <Alert tone="error">{error}</Alert>}

              <Button
                type="submit"
                size="lg"
                loading={isSubmitting}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-green-700 py-3 font-semibold text-white shadow-lg shadow-green-700/25 transition hover:bg-green-800"
              >
                {isSubmitting ? t('auth.signingIn') : t('auth.signIn')}
                {!isSubmitting && <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" aria-hidden />}
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-soil-500">
              {t('auth.noAccount')}{' '}
              <Link to="/register" className="font-semibold text-green-700 underline underline-offset-4 hover:text-green-800">
                {t('auth.createAccount')}
              </Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Login;