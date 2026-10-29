import { Link } from 'react-router-dom';
import {
  Scale,
  Sprout,
  Warehouse,
  Navigation,
  Boxes,
  Languages,
  Smartphone,
  ShieldCheck,
  ArrowRight,
  BadgeIndianRupee,
} from 'lucide-react';
import Button from '../../components/common/Button';

import { ROLES } from '../../constants/roles';
import { useSettings } from '../../context/SettingsContext';
import { useI18n } from '../../i18n';

/* Icons stay here; the words come from the active language (home.features / home.trust). */
const FEATURE_ICONS = [Scale, Sprout, Warehouse, Navigation, Boxes, Languages];
const TRUST_ICONS = [Sprout, BadgeIndianRupee, Smartphone, ShieldCheck];

const PORTALS = ['FARMER', 'SHOPKEEPER', 'MANDI_OWNER', 'DRIVER', 'ADMIN'];

const PORTAL_ACCENT = {
  MANDI_OWNER: 'text-turmeric-400',
  DRIVER: 'text-river-100',
};

/* One container width used by every section, so edges line up on all screens.
   Grows a little on very large monitors instead of leaving huge empty margins. */
const CONTAINER =
  'mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 2xl:max-w-[1440px] 2xl:px-10';

const HomePage = () => {
  useSettings();
  const { t } = useI18n();
  const features = t('home.features');
  const steps = t('home.steps');
  const trust = t('home.trust');

  return (
    /* overflow-x-clip keeps the sticky heading in the features section working */
    <div className="w-full overflow-x-clip">
      {/* ───────── Hero ───────── */}
      <section
        className="relative isolate w-full overflow-hidden bg-cover bg-no-repeat bg-[position:70%_center] lg:bg-center"
        style={{ backgroundImage: "url('/images/hero1.png')" }}
      >
        {/* Phones / tablets: top-to-bottom veil, text sits over the picture */}
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-white/95 via-white/80 to-white/50 sm:from-white/90 sm:via-white/70 sm:to-white/20 lg:hidden"
          aria-hidden
        />
        {/* Desktop: soft left-side veil so the copy never fights the photo */}
        <div
          className="pointer-events-none absolute inset-0 -z-10 hidden lg:block bg-[linear-gradient(90deg,rgba(255,255,255,0.94)_0%,rgba(255,255,255,0.82)_30%,rgba(255,255,255,0.35)_48%,rgba(255,255,255,0)_60%)]"
          aria-hidden
        />

        <div
          className={`${CONTAINER} grid min-h-[580px] items-center py-14 sm:min-h-[660px] sm:py-20 lg:min-h-[720px] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] 2xl:min-h-[820px]`}
        >
          <div className="max-w-[36rem] 2xl:max-w-[40rem]">
            {/* Eyebrow */}
            <p className="inline-flex items-center gap-2 rounded-full bg-[#34bb0c]/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-field-700 ring-1 ring-[#34bb0c]/25 sm:text-[13px]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#34bb0c]" aria-hidden />
              {t('home.eyebrow')}
            </p>

            {/* Headline */}
            <h1 className="mt-6 font-display text-[40px] font-bold leading-[1.04] tracking-[-0.025em] text-soil min-[400px]:text-5xl sm:text-6xl lg:text-[62px] xl:text-[68px] 2xl:text-[78px]">
              {t('home.heroLine1')}
              <br />
              {t('home.heroLine2Before')}
              <span className="text-[#2a9a0a]">{t('home.heroHighlight')}</span>
              {t('home.heroLine2After')}
            </h1>

            {/* Sub-copy: short measure, calm colour, comfortable line height */}
            <p className="mt-6 max-w-[32rem] text-base leading-[1.7] text-soil-700 sm:text-lg lg:text-[19px] 2xl:text-xl">
              {t('home.heroBody')}
            </p>

            {/* Actions */}
            <div className="mt-9 flex flex-col gap-3 min-[420px]:flex-row">
              <Button
                to="/register"
                size="lg"
                className="group inline-flex w-full items-center justify-center gap-2 bg-[#34bb0c] px-7 font-semibold text-white shadow-lg shadow-[#34bb0c]/25 transition hover:bg-[#2ea60b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#34bb0c] min-[420px]:w-auto"
              >
                {t('nav.getStarted')}
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Button>
              <Button
                to="/features"
                size="lg"
                variant="secondary"
                className="inline-flex w-full items-center justify-center bg-white px-7 font-semibold text-soil shadow-sm ring-1 ring-soil-200 transition hover:bg-soil-50 min-[420px]:w-auto"
              >
                {t('home.exploreFeatures')}
              </Button>
            </div>

            {/* Trust points — quiet grid instead of loud pills */}
            <ul className="mt-10 grid max-w-[32rem] grid-cols-1 gap-x-8 gap-y-3 border-t border-soil-900/10 pt-6 text-sm font-medium text-soil-700 min-[480px]:grid-cols-2 sm:text-[15px]">
              {trust.map((label, i) => {
                const Icon = TRUST_ICONS[i] || Sprout;
                return (
                  <li key={i} className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#34bb0c]/12 text-field-700 ring-1 ring-[#34bb0c]/20">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    {label}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </section>

      {/* ───────── Features ───────── */}
      <section
        className="relative -mt-[5px] w-full border-t border-soil-200 bg-leafwhite bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/Home/future.png')" }}
      >
        <div className={`${CONTAINER} relative z-10 py-14 sm:py-20 md:py-24 2xl:py-28`}>
          <div className="grid items-start gap-10 lg:grid-cols-[0.8fr_1.3fr] lg:gap-12 2xl:gap-16">
            <div className="lg:sticky lg:top-24 lg:self-start lg:pt-4">
              <h2 className="font-display text-3xl font-semibold leading-tight text-soil sm:text-4xl lg:text-[40px] xl:text-[44px] 2xl:text-5xl">
                {t('home.featuresTitle')}
              </h2>
              <span className="mt-5 block h-1 w-16 rounded-full bg-[#34bb0c]" aria-hidden />
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-soil-600 sm:text-lg">
                {t('home.featuresBody')}
              </p>
              <Link
                to="/features"
                className="mt-7 inline-flex items-center rounded-full bg-field-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-field-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-field-700"
              >
                {t('home.seeEveryFeature')}
              </Link>
            </div>

            <ul className="grid gap-4 sm:grid-cols-2 sm:gap-5 2xl:gap-6">
              {features.map((f, i) => {
                const Icon = FEATURE_ICONS[i] || Sprout;
                return (
                  <li
                    key={i}
                    className="rounded-2xl bg-white/85 p-5 shadow-sm ring-1 ring-soil-200/70 backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-6"
                  >
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#34bb0c]/10 text-field-700 sm:h-12 sm:w-12">
                      <Icon className="h-6 w-6" aria-hidden />
                    </span>
                    <h3 className="mt-4 text-base font-semibold leading-snug text-soil sm:text-lg">{f.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-soil-600 sm:text-[15px]">{f.body}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </section>

      {/* ───────── How it works — a real sequence, so it is numbered ───────── */}
      <section
        id="how-it-works"
        className="relative w-full scroll-mt-16 bg-cover bg-center bg-no-repeat lg:scroll-mt-[72px]"
        style={{ backgroundImage: "url('/Home/works.png')" }}
      >
        <div className={`${CONTAINER} py-14 sm:py-20 md:py-24`}>
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-semibold leading-tight text-soil sm:text-4xl lg:text-[40px] xl:text-[44px] 2xl:text-5xl">
              {t('home.stepsTitle')}
            </h2>
            <span className="mt-5 block h-1 w-16 rounded-full bg-[#34bb0c]" aria-hidden />
          </div>

          <ol className="relative mt-10 grid gap-4 sm:mt-12 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4 lg:gap-6">
            {/* Connecting line — only when all four steps sit in one row */}
            <span
              className="absolute left-8 right-8 top-8 hidden h-0.5 bg-field-700/30 lg:block"
              aria-hidden
            />
            {steps.map(({ title, body }, i) => (
              <li
                key={i}
                className="relative rounded-2xl bg-white/85 p-5 shadow-sm ring-1 ring-soil-200/70 backdrop-blur-sm sm:p-6"
              >
                <span className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-field-700 font-display text-lg font-bold text-white">
                  {i + 1}
                </span>
                <h3 className="mt-4 text-base font-semibold text-soil sm:text-lg">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-soil-600 sm:text-[15px]">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ───────── Portals ───────── */}
      <section className="w-full bg-green-50">
        <div className={`${CONTAINER} py-14 sm:py-20 md:py-24`}>
          <div className="rounded-2xl bg-green-700/90 p-5 shadow-xl backdrop-blur-sm sm:rounded-3xl sm:p-8 lg:p-10">
            <h2 className="font-display text-2xl font-semibold text-white sm:text-3xl lg:text-4xl">
              {t('home.portalsTitle')}
            </h2>
            <p className="mt-3 max-w-xl text-sm text-field-200 sm:text-base">
              {t('home.portalsBody')}
            </p>

            <div className="mt-6 grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 sm:mt-8 sm:gap-4 md:grid-cols-3 xl:grid-cols-5">
              {PORTALS.map((r) => {
                const meta = ROLES[r];
                if (!meta) return null;
                return (
                  <Link
                    key={r}
                    to={`/login?role=${r}`}
                    className="group flex flex-col rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10 transition hover:bg-white/[0.12] hover:ring-field-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-field-300 sm:p-5"
                  >
                    <meta.icon className={`h-7 w-7 sm:h-8 sm:w-8 ${PORTAL_ACCENT[r] || 'text-field-300'}`} aria-hidden />
                    <p className="mt-3 font-display text-lg font-semibold text-white sm:mt-4">{t(`roleNames.${r}`, meta.label)}</p>
                    <p className="mt-1 flex-1 text-sm leading-relaxed text-field-200">{t(`roleTaglines.${r}`, meta.tagline)}</p>
                    <p className="mt-4 text-sm font-semibold text-field-100 underline decoration-field-500 underline-offset-4 group-hover:decoration-white sm:mt-5">
                      {t('nav.signIn')}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;