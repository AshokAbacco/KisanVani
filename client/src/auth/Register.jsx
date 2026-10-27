// src/auth/Register.jsx
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { CheckCircle2, Check, Sprout, ArrowRight, Info } from 'lucide-react';
import { Input } from '../components/forms/Field';
import Button from '../components/common/Button';
import Alert from '../components/feedback/Alert';
import { useAuth } from '../context/AuthContext';
import { REGISTER_ROLES, ROLES, roleBase } from '../constants/roles';
import { applyFieldErrors, errorMessage } from '../utils/errors';
import { rules } from '../validators';
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

/* Full-screen shell: background fixed, only the form column scrolls */
const Shell = ({ children }) => (
  <div
    className="fixed inset-0 h-[100dvh] w-screen overflow-hidden bg-white bg-cover bg-no-repeat bg-[position:right_center]"
    style={{ backgroundImage: "url('/Home/register.png')" }}
  >
    <div className="grid h-full w-full lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* ───────── Left: form (scrolls inside) ───────── */}
      <main className="h-full overflow-y-auto bg-white/90 px-4 py-8 sm:px-8 lg:bg-transparent lg:px-12 lg:py-10 xl:px-20 [scrollbar-color:#bbf7d0_transparent] [scrollbar-width:thin]">
        <div className="mx-auto w-full max-w-[560px]">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-600 text-white shadow-md shadow-green-600/30">
              <Sprout className="h-5 w-5" aria-hidden />
            </span>
            <span className="font-display text-xl font-bold text-[#0f3d1e]">KisanVani</span>
          </Link>
          <div className="mt-8">{children}</div>
        </div>
      </main>

      {/* ───────── Right: brand copy over the green picture ───────── */}
      <aside className="hidden h-full flex-col items-end px-12 pt-28 text-right lg:flex xl:px-16 xl:pt-32">
        <h2 className="max-w-md font-display text-[40px] font-extrabold leading-[1.08] tracking-[-0.02em] text-white [text-shadow:0_2px_14px_rgba(0,60,10,0.45)] xl:text-[46px]">
          Join the farm-to-market network
        </h2>
        <span className="mt-4 block h-1.5 w-20 rounded-full bg-yellow-400" aria-hidden />
        <p className="mt-4 max-w-sm text-lg font-medium leading-relaxed text-white/95 [text-shadow:0_1px_10px_rgba(0,60,10,0.5)]">
          Farmers, shops, mandis and drivers working from the same order.
        </p>
      </aside>
    </div>
  </div>
);

const Register = () => {
  const [params] = useSearchParams();
  const [role, setRole] = useState(REGISTER_ROLES.includes(params.get('role')) ? params.get('role') : 'FARMER');
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(null);
  const { register: signUp } = useAuth();
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    setError: setFieldError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm();

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
      else setError('Please correct the highlighted fields.');
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
          <h1 className="mt-5 font-display text-3xl font-bold tracking-[-0.02em] text-soil">Registration received</h1>
          <p className="mt-3 leading-relaxed text-soil-600">
            Thanks, {pending.name}. {ROLES[pending.role].label} accounts are reviewed by an admin before first sign-in. You will be able to sign in as soon as it is approved — usually within one working day.
          </p>
          <Button to="/" variant="secondary" className="mt-6">
            Back to home
          </Button>
        </div>
      </Shell>
    );

  const needsApproval = role === 'MANDI_OWNER' || role === 'DRIVER';

  return (
    <Shell>
      <span className="inline-flex rounded-full bg-green-100 px-3.5 py-1 text-sm font-semibold text-green-700">
        {t('auth.register')}
      </span>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-[-0.02em] text-soil sm:text-[38px]">
        Create your account
      </h1>
      <p className="mt-1.5 text-soil-500">Choose the role you work in. You can’t change it later.</p>

      <form onSubmit={handleSubmit(submit)} className="mt-7 space-y-5" noValidate>
        {/* Role tiles */}
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-soil">I am a</legend>
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

        {needsApproval && (
          <div className="flex gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-800 ring-1 ring-amber-200">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {ROLES[role].label} accounts are activated after an admin checks your details.
          </div>
        )}

        {/* Personal details */}
        <SectionTitle>Your details</SectionTitle>
        <Input label="Full name" required autoComplete="name" error={errors.name?.message} {...register('name', rules.name)} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Mobile number" required inputMode="tel" autoComplete="tel" placeholder="98765 43210" error={errors.mobile?.message} {...register('mobile', rules.mobile)} />
          <Input label="E-mail" type="email" autoComplete="email" hint="Needed for password reset" error={errors.email?.message} {...register('email', rules.email)} />
        </div>

        {/* Role-specific details */}
        {role === 'SHOPKEEPER' && (
          <>
            <SectionTitle>Shop details</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Shop name" required error={errors.shopName?.message} {...register('shopName', rules.required('Shop name'))} />
              <Input label="GSTIN" hint="Optional" error={errors.gstin?.message} {...register('gstin')} />
            </div>
          </>
        )}
        {role === 'FARMER' && (
          <>
            <SectionTitle>Farm details</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Farm name" hint="Optional" {...register('farmName')} />
              <Input label="Main crops" hint="Comma separated, e.g. Tomato, Onion" {...register('primaryCrops')} />
            </div>
          </>
        )}
        {role === 'MANDI_OWNER' && (
          <>
            <SectionTitle>Mandi details</SectionTitle>
            <Input label="Mandi / firm name" required error={errors.mandiName?.message} {...register('mandiName', rules.required('Mandi name'))} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Market yard" placeholder="e.g. K.R. Market APMC Yard" {...register('marketYardName')} />
              <Input label="APMC licence number" error={errors.licenseNumber?.message} {...register('licenseNumber')} />
            </div>
          </>
        )}
        {role === 'DRIVER' && (
          <>
            <SectionTitle>Driving licence</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                label="Driving licence number"
                required
                className="sm:col-span-3"
                error={errors.licenseNumber?.message}
                {...register('licenseNumber', { required: 'Licence number is required', minLength: { value: 5, message: 'Check the licence number' } })}
              />
              <Input label="Licence valid until" type="date" className="sm:col-span-2" {...register('licenseExpiry')} />
              <Input label="Years driving" type="number" min="0" max="60" {...register('experienceYrs')} />
            </div>
          </>
        )}

        {/* Address */}
        <SectionTitle>Location</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label={role === 'FARMER' ? 'Village' : 'Area / town'} {...register(role === 'FARMER' ? 'village' : 'city')} />
          <Input label="District" {...register('district')} />
          <Input label="Pincode" inputMode="numeric" error={errors.pincode?.message} {...register('pincode', rules.pincode)} />
        </div>

        {/* Password */}
        <SectionTitle>Set a password</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Password" type="password" required autoComplete="new-password" hint="8+ characters with a letter and a number" error={errors.password?.message} {...register('password', rules.password)} />
          <Input
            label="Confirm password"
            type="password"
            required
            autoComplete="new-password"
            error={errors.confirm?.message}
            {...register('confirm', { required: 'Confirm your password', validate: (v) => v === watch('password') || 'Passwords do not match' })}
          />
        </div>

        <label className="flex items-start gap-2.5 rounded-xl bg-green-50/70 px-4 py-3 text-sm text-soil-600 ring-1 ring-green-100">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-green-600" {...register('terms', { required: 'Please accept the terms' })} />
          <span>
            I agree to the{' '}
            <Link to="/terms" className="font-semibold text-green-700 underline underline-offset-4 hover:text-green-800" target="_blank">
              terms
            </Link>{' '}
            and{' '}
            <Link to="/privacy-policy" className="font-semibold text-green-700 underline underline-offset-4 hover:text-green-800" target="_blank">
              privacy policy
            </Link>
            .
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

      <p className="mt-5 pb-4 text-center text-sm text-soil-500">
        {t('auth.haveAccount')}{' '}
        <Link to="/login" className="font-semibold text-green-700 underline underline-offset-4 hover:text-green-800">
          {t('auth.signIn')}
        </Link>
      </p>
    </Shell>
  );
};

export default Register;