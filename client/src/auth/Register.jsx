// src/auth/Register.jsx
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { CheckCircle2, Check, ArrowRight, Info } from 'lucide-react';
import { Input } from '../components/forms/Field';
import Button from '../components/common/Button';
import Alert from '../components/feedback/Alert';
import { useAuth } from '../context/AuthContext';
import { REGISTER_ROLES, ROLES, roleBase } from '../constants/roles';
import { applyFieldErrors, errorMessage } from '../utils/errors';
import { makeRules } from '../validators';
import { useI18n } from '../i18n';

/* Same role thumbnails as the Login page, cropped from one image strip */
const USERS_IMG = '/Home/loginUsers.png';
const ROLE_THUMB = {
  FARMER: '5% 18%',
  SHOPKEEPER: '30% 18%',
  MANDI_OWNER: '52% 32%',
  DRIVER: '75% 40%',
  ADMIN: '96% 18%',
};

/* Small section title used inside the form */
const SectionTitle = ({ children }) => (
  <p className="flex items-center gap-2 pt-1 text-xs font-semibold uppercase tracking-[0.14em] text-green-700">
    <span className="h-1.5 w-1.5 rounded-full bg-green-500" aria-hidden />
    {children}
  </p>
);

/**
 * Page frame. Rendered inside PublicLayout, so the site navbar (with the language switcher)
 * is above and the footer below. Form on the left, brand copy over the green picture on the right.
 */
const Shell = ({ children }) => {
  const { t } = useI18n();
  return (
    <section className="relative w-full bg-white">
      {/* The picture — and the brand copy on it — stay pinned to the screen (exactly one viewport
          under the header) while the longer form scrolls over the light left side. Same look as
          the old full-screen page, but the page now flows on into the site footer. */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="sticky top-16 h-[calc(100dvh-4rem)] w-full bg-cover bg-no-repeat bg-[position:right_center] lg:top-[72px] lg:h-[calc(100dvh-72px)]"
          style={{ backgroundImage: "url('/Home/register.png')" }}
        >
          <aside className="absolute right-0 top-0 hidden w-1/2 flex-col items-end px-12 pt-14 text-right lg:flex xl:px-16 xl:pt-16">
            <h2 className="max-w-md font-display text-[40px] font-extrabold leading-[1.08] tracking-[-0.02em] text-white [text-shadow:0_2px_14px_rgba(0,60,10,0.45)] xl:text-[46px]">
              {t('register.heroTitle')}
            </h2>
            <span className="mt-4 block h-1.5 w-20 rounded-full bg-yellow-400" aria-hidden />
            <p className="mt-4 max-w-sm text-lg font-medium leading-relaxed text-white/95 [text-shadow:0_1px_10px_rgba(0,60,10,0.5)]">
              {t('register.heroBody')}
            </p>
          </aside>
        </div>
      </div>

      <div className="relative grid min-h-[calc(100dvh-4rem)] w-full lg:min-h-[calc(100dvh-72px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* ───────── Left: form (right column is the picture above) ───────── */}
        <div className="bg-white/90 px-4 py-10 sm:px-8 lg:bg-transparent lg:px-12 lg:py-14 xl:px-20">
          <div className="mx-auto w-full max-w-[560px]">{children}</div>
        </div>
      </div>
    </section>
  );
};

const Register = () => {
  const [params] = useSearchParams();
  const [role, setRole] = useState(REGISTER_ROLES.includes(params.get('role')) ? params.get('role') : 'FARMER');
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(null);
  const { register: signUp } = useAuth();
  const { t, lang } = useI18n();
  const rules = makeRules(t);
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    setError: setFieldError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm();

  const roleName = (r) => t(`roleNames.${r}`, ROLES[r]?.label ?? r);

  const submit = async (v) => {
    setError(null);
    const body = {
      role,
      name: v.name,
      mobile: v.mobile,
      email: v.email || null,
      password: v.password,
      preferredLanguage: lang,
      address: { village: v.village || null, city: v.city || null, district: v.district || null, state: v.state || null, pincode: v.pincode || null },
    };
    if (role === 'SHOPKEEPER') Object.assign(body, { shopName: v.shopName, gstin: v.gstin || null });
    if (role === 'FARMER') Object.assign(body, { farmName: v.farmName || null, primaryCrops: (v.primaryCrops || '').split(',').map((s) => s.trim()).filter(Boolean) });
    if (role === 'MANDI_OWNER') Object.assign(body, { mandiName: v.mandiName, marketYardName: v.marketYardName || null, licenseNumber: v.licenseNumber || null });
    if (role === 'DRIVER') Object.assign(body, { licenseNumber: v.licenseNumber, licenseExpiry: v.licenseExpiry || null, experienceYrs: v.experienceYrs ? Number(v.experienceYrs) : undefined });
    try {
      const res = await signUp(body);
      if (res.pendingApproval) setPending(res.user);
      else navigate(roleBase(role), { replace: true });
    } catch (e) {
      if (!applyFieldErrors(e, setFieldError)) setError(errorMessage(e));
      else setError(t('register.fixFields'));
    }
  };

  /* ───────── Waiting for admin approval ───────── */
  if (pending)
    return (
      <Shell>
        <div className="rounded-3xl bg-white p-8 shadow-xl shadow-green-900/5 ring-1 ring-green-100">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50 text-green-600 ring-1 ring-green-200">
            <CheckCircle2 className="h-8 w-8" aria-hidden />
          </span>
          <h1 className="mt-5 font-display text-3xl font-bold tracking-[-0.02em] text-soil">{t('register.pendingTitle')}</h1>
          <p className="mt-3 leading-relaxed text-soil-600">
            {t('register.pendingBody', '', { name: pending.name, role: roleName(pending.role) })}
          </p>
          <Button to="/" variant="secondary" className="mt-6">
            {t('notFound.backHome')}
          </Button>
        </div>
      </Shell>
    );

  const needsApproval = role === 'MANDI_OWNER' || role === 'DRIVER';
  const optional = t('register.optional');

  return (
    <Shell>
      <span className="inline-flex rounded-full bg-green-100 px-3.5 py-1 text-sm font-semibold text-green-700">
        {t('auth.register')}
      </span>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-[-0.02em] text-soil sm:text-[38px]">{t('register.title')}</h1>
      <p className="mt-1.5 text-soil-500">{t('register.subtitle')}</p>

      <form onSubmit={handleSubmit(submit)} className="mt-7 space-y-5" noValidate>
        {/* Role tiles */}
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-soil">{t('register.iAmA')}</legend>
          <div role="radiogroup" className="grid grid-cols-1 gap-2.5 min-[380px]:grid-cols-2">
            {REGISTER_ROLES.map((r) => {
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
                      className="h-10 w-10 shrink-0 rounded-lg bg-green-50 bg-no-repeat ring-1 ring-black/5"
                      style={{ backgroundImage: `url('${USERS_IMG}')`, backgroundSize: '520% auto', backgroundPosition: thumb }}
                      aria-hidden
                    />
                  ) : (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-700">
                      {meta?.icon && <meta.icon className="h-5 w-5" aria-hidden />}
                    </span>
                  )}
                  <span className="truncate">{roleName(r)}</span>
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

        {needsApproval && (
          <div className="flex gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-800 ring-1 ring-amber-200">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {t('register.approvalNote', '', { role: roleName(role) })}
          </div>
        )}

        {/* Personal details */}
        <SectionTitle>{t('register.sections.details')}</SectionTitle>
        <Input label={t('register.fields.fullName')} required autoComplete="name" error={errors.name?.message} {...register('name', rules.name)} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label={t('register.fields.mobile')} required inputMode="tel" autoComplete="tel" placeholder="98765 43210" error={errors.mobile?.message} {...register('mobile', rules.mobile)} />
          <Input label={t('register.fields.email')} type="email" autoComplete="email" hint={t('register.fields.emailHint')} error={errors.email?.message} {...register('email', rules.email)} />
        </div>

        {/* Role-specific details */}
        {role === 'SHOPKEEPER' && (
          <>
            <SectionTitle>{t('register.sections.shop')}</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label={t('register.fields.shopName')} required error={errors.shopName?.message} {...register('shopName', rules.required(t('register.fields.shopName')))} />
              <Input label={t('register.fields.gstin')} hint={optional} error={errors.gstin?.message} {...register('gstin')} />
            </div>
          </>
        )}
        {role === 'FARMER' && (
          <>
            <SectionTitle>{t('register.sections.farm')}</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label={t('register.fields.farmName')} hint={optional} {...register('farmName')} />
              <Input label={t('register.fields.mainCrops')} hint={t('register.fields.mainCropsHint')} {...register('primaryCrops')} />
            </div>
          </>
        )}
        {role === 'MANDI_OWNER' && (
          <>
            <SectionTitle>{t('register.sections.mandi')}</SectionTitle>
            <Input label={t('register.fields.mandiName')} required error={errors.mandiName?.message} {...register('mandiName', rules.required(t('register.fields.mandiName')))} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label={t('register.fields.marketYard')} placeholder={t('register.fields.marketYardPlaceholder')} {...register('marketYardName')} />
              <Input label={t('register.fields.apmcLicence')} error={errors.licenseNumber?.message} {...register('licenseNumber')} />
            </div>
          </>
        )}
        {role === 'DRIVER' && (
          <>
            <SectionTitle>{t('register.sections.licence')}</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                label={t('register.fields.licenceNumber')}
                required
                className="sm:col-span-3"
                error={errors.licenseNumber?.message}
                {...register('licenseNumber', {
                  required: t('validation.licenceRequired'),
                  minLength: { value: 5, message: t('validation.licenceCheck') },
                })}
              />
              <Input label={t('register.fields.licenceValid')} type="date" className="sm:col-span-2" {...register('licenseExpiry')} />
              <Input label={t('register.fields.yearsDriving')} type="number" min="0" max="60" {...register('experienceYrs')} />
            </div>
          </>
        )}

        {/* Address */}
        <SectionTitle>{t('register.sections.location')}</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label={role === 'FARMER' ? t('register.fields.village') : t('register.fields.areaTown')}
            {...register(role === 'FARMER' ? 'village' : 'city')}
          />
          <Input label={t('register.fields.district')} {...register('district')} />
          <Input label={t('register.fields.pincode')} inputMode="numeric" error={errors.pincode?.message} {...register('pincode', rules.pincode)} />
        </div>

        {/* Password */}
        <SectionTitle>{t('register.sections.password')}</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label={t('register.fields.password')}
            type="password"
            required
            autoComplete="new-password"
            hint={t('register.fields.passwordHint')}
            error={errors.password?.message}
            {...register('password', rules.password)}
          />
          <Input
            label={t('register.fields.confirmPassword')}
            type="password"
            required
            autoComplete="new-password"
            error={errors.confirm?.message}
            {...register('confirm', {
              required: t('validation.confirmRequired'),
              validate: (v) => v === watch('password') || t('validation.mismatch'),
            })}
          />
        </div>

        <label className="flex items-start gap-2.5 rounded-xl bg-green-50/70 px-4 py-3 text-sm text-soil-600 ring-1 ring-green-100">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-green-600" {...register('terms', { required: t('validation.acceptTerms') })} />
          <span>
            {t('register.agreeBefore')}
            <Link to="/terms" className="font-semibold text-green-700 underline underline-offset-4 hover:text-green-800" target="_blank">
              {t('register.agreeTerms')}
            </Link>
            {t('register.agreeAnd')}
            <Link to="/privacy-policy" className="font-semibold text-green-700 underline underline-offset-4 hover:text-green-800" target="_blank">
              {t('register.agreePrivacy')}
            </Link>
            {t('register.agreeAfter')}
          </span>
        </label>
        {errors.terms && <p className="-mt-2 text-sm text-red-600">{errors.terms.message}</p>}
        {error && <Alert tone="error">{error}</Alert>}

        <Button
          type="submit"
          size="lg"
          loading={isSubmitting}
          className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-green-700 py-3 font-semibold text-white shadow-lg shadow-green-700/25 transition hover:bg-green-800"
        >
          {isSubmitting ? t('auth.registering') : t('auth.register')}
          {!isSubmitting && <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" aria-hidden />}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-soil-500">
        {t('auth.haveAccount')}{' '}
        <Link to="/login" className="font-semibold text-green-700 underline underline-offset-4 hover:text-green-800">
          {t('auth.signIn')}
        </Link>
      </p>
    </Shell>
  );
};

export default Register;