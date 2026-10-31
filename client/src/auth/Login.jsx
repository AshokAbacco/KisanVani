// src/auth/Login.jsx

import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Leaf } from 'lucide-react';
import Button from '../components/common/Button';
import Alert from '../components/feedback/Alert';
import { useAuth } from '../context/AuthContext';
import { roleBase } from '../constants/roles';
import { errorMessage } from '../utils/errors';
import { useI18n } from '../i18n';

const inputBase =
  'w-full rounded-xl border bg-white py-2.5 pl-11 pr-4 text-[15px] text-soil shadow-sm outline-none transition placeholder:text-soil-400 focus:border-green-600 focus:ring-4 focus:ring-green-600/15';

/**
 * One sign-in form for every role. There is no role picker: the server reads the role from the
 * account (e-mail and mobile are unique) and we send the user to that role's dashboard.
 *
 * Rendered inside PublicLayout: the site navbar (logo, links, language switcher) sits above
 * and the footer below. The section fills exactly the screen height left under the header.
 */
const Login = () => {
  const [show, setShow] = useState(false);
  const [error, setError] = useState(null);
  const { login, expired } = useAuth();
  const { t } = useI18n();
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
      const user = await login({ identifier: v.identifier, password: v.password });
      // Language is reconciled with the profile by <LanguageSync> (a choice made on the website wins).
      const from = location.state?.from;
      // The role comes from the server. Only return to a page inside this user's own dashboard.
      navigate(from && from.startsWith(roleBase(user.role)) ? from : roleBase(user.role), { replace: true });
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <section
      className="relative w-full bg-white bg-cover bg-no-repeat bg-left"
      style={{ backgroundImage: "url('/Home/login1.png')" }}
    >
      <div className="mx-auto grid min-h-[calc(100dvh-4rem)] w-full max-w-[1440px] lg:min-h-[calc(100dvh-72px)] lg:grid-cols-[1.05fr_1fr]">
        {/* ───────── Left: brand copy ───────── */}
        <aside className="relative hidden flex-col px-10 pt-16 lg:flex xl:px-14 xl:pt-20">
          {/* Soft white glow behind the copy so it reads on the bright sky */}
          <div className="relative isolate max-w-xl">
            <span
              className="pointer-events-none absolute -inset-x-10 -inset-y-8 -z-10 rounded-[48px] bg-[radial-gradient(ellipse_at_left,rgba(255,255,255,0.75)_0%,rgba(255,255,255,0.45)_45%,rgba(255,255,255,0)_75%)] blur-md"
              aria-hidden
            />
            <h2 className="font-display text-[44px] font-extrabold leading-[1.08] tracking-[-0.02em] text-[#0f3d1e] [text-shadow:0_1px_12px_rgba(255,255,255,0.8)] xl:text-[52px]">
              {t('login.heroBefore')}
              <span className="text-[#1f8a12]">{t('login.heroHighlight')}</span>
              {t('login.heroAfter')}
            </h2>
            <span className="mt-5 block h-1.5 w-20 rounded-full bg-yellow-400 shadow-sm" aria-hidden />
            <p className="mt-5 max-w-md text-lg font-medium leading-relaxed text-[#1e3a26] [text-shadow:0_1px_8px_rgba(255,255,255,0.9)]">
              {t('login.heroBody')}
            </p>
          </div>
        </aside>

        {/* ───────── Right: form ───────── */}
        <div className="flex items-center justify-center px-4 py-8 sm:px-8 lg:py-10">
          <div className="w-full max-w-[460px] rounded-3xl bg-white/95 p-6 shadow-xl ring-1 ring-green-100 backdrop-blur sm:p-7 lg:bg-transparent lg:p-0 lg:shadow-none lg:ring-0 lg:backdrop-blur-0">
            <span className="inline-flex rounded-full bg-green-100 px-3.5 py-1 text-sm font-semibold text-green-700">
              {t('auth.signIn')}
            </span>
            <h1 className="mt-2 flex items-center gap-2 font-display text-3xl font-bold tracking-[-0.02em] text-soil sm:text-[38px]">
              {t('auth.welcomeBack')}
              <Leaf className="h-7 w-7 shrink-0 -rotate-12 text-green-500" aria-hidden />
            </h1>
            <p className="mt-1 text-sm text-soil-500">{t('login.subtitle')}</p>

            {expired && (
              <Alert tone="warning" className="mt-4">
                {t('login.sessionEnded')}
              </Alert>
            )}

            <form onSubmit={handleSubmit(submit)} className="mt-5 space-y-4" noValidate>
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
                    placeholder={t('login.identifierPlaceholder')}
                    aria-invalid={!!errors.identifier}
                    className={`${inputBase} ${errors.identifier ? 'border-red-400' : 'border-soil-200'}`}
                    {...register('identifier', { required: t('validation.identifierRequired') })}
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
                    placeholder={t('login.passwordPlaceholder')}
                    aria-invalid={!!errors.password}
                    className={`${inputBase} pr-12 ${errors.password ? 'border-red-400' : 'border-soil-200'}`}
                    {...register('password', { required: t('validation.enterPassword') })}
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    aria-label={show ? t('login.hidePassword') : t('login.showPassword')}
                    className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-soil-400 transition hover:bg-green-50 hover:text-green-700"
                  >
                    {show ? <EyeOff className="h-5 w-5" aria-hidden /> : <Eye className="h-5 w-5" aria-hidden />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}

                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <label className="inline-flex cursor-pointer items-center gap-2 text-soil-500">
                    <input
                      type="checkbox"
                      checked={show}
                      onChange={(e) => setShow(e.target.checked)}
                      className="h-4 w-4 rounded border-soil-300 accent-green-600"
                    />
                    {t('login.showPassword')}
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
        </div>
      </div>
    </section>
  );
};

export default Login;