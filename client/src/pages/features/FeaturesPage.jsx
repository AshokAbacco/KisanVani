// src/pages/features/FeaturesPage.jsx
import { CheckCircle2, ArrowRight } from 'lucide-react';
import ContentPage from '../ContentPage';
import Button from '../../components/common/Button';
import { ROLES } from '../../constants/roles';

const BY_ROLE = [
  {
    role: 'SHOPKEEPER',
    tag: 'Retail counter',
    points: [
      'Point-of-sale with produce search, category filters and weight entry in kg or grams',
      'Quick weights (250 g, 500 g, 1 kg, 2 kg, 5 kg) and optional USB/serial weighing scale',
      'Cash, UPI and credit (udhar) bills with customer khata and collections',
      '80 mm thermal cash memo, reprints counted and logged',
      'Stock & rates master, wastage and corrections with a full stock ledger',
      'Buy from farmers and Market Mandis, confirm received kilos into stock',
      'Supplier purchases, payments and sales reports with CSV export',
    ],
  },
  {
    role: 'FARMER',
    tag: 'Sell the harvest',
    points: [
      'Post harvests with grade, variety, photos, harvest date and farm location',
      'Publish, pause or complete listings; remaining quantity updates as orders arrive',
      'Accept or reject orders, mark preparing and ready for pickup',
      'Request a vehicle from the farm to the buyer or mandi',
      'Settlements and payments received, month by month',
    ],
  },
  {
    role: 'MANDI_OWNER',
    tag: 'Wholesale trading',
    points: [
      'Create loose, bagged, crated or boxed lots with yard, gate and quality notes',
      'Weight is reserved per order so lots are never oversold',
      'Incoming shop orders, delivered quantities and settlement history',
      'Buy from farmers with your commission calculated on each settlement',
      'Assign verified drivers and vehicles to your loads',
    ],
  },
  {
    role: 'DRIVER',
    tag: 'Move the load',
    points: [
      'Register vehicles and upload RC, insurance, fitness and permit documents',
      'Accept assigned trips or take open loads near you',
      'Confirm loaded and delivered weights, upload proof of delivery',
      'Share GPS only during active trips, with directions in your map app',
      'Earnings per trip and payments received',
    ],
  },
  {
    role: 'ADMIN',
    tag: 'Run the platform',
    wide: true,
    points: [
      'Approve new Market Mandi Owners and Drivers, verify vehicles',
      'Search, filter and manage every user, order, trip and payment',
      'Charts for registrations, order volume, trade value and completed trips',
      'Platform settings, broadcast notifications and a complete audit log',
    ],
  },
];

const FeaturesPage = () => (
  <ContentPage
    title="Features"
    intro="Every role works from the same orders, weights and payments. Here is what each dashboard does."
    wide
  >
    {/* Role cards */}
    <div className="grid gap-6 md:grid-cols-2 lg:gap-8">
      {BY_ROLE.map(({ role, tag, points, wide }) => {
        const m = ROLES[role];
        if (!m) return null;
        return (
          <section
            key={role}
            className={`group relative overflow-hidden rounded-3xl bg-white p-6 shadow-sm ring-1 ring-green-100 transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-green-900/10 hover:ring-green-300 sm:p-8 ${
              wide ? 'md:col-span-2' : ''
            }`}
          >
            {/* Top accent bar grows on hover */}
            <span
              className="absolute inset-x-0 top-0 h-1 origin-left scale-x-[0.18] bg-gradient-to-r from-green-500 to-emerald-400 transition-transform duration-500 group-hover:scale-x-100"
              aria-hidden
            />
            {/* Soft glow in the corner */}
            <span
              className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-green-100/70 blur-3xl transition-opacity duration-300 opacity-0 group-hover:opacity-100"
              aria-hidden
            />

            <header className="relative flex items-center gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-green-50 text-green-700 ring-1 ring-green-200 transition duration-300 group-hover:bg-green-600 group-hover:text-white group-hover:ring-green-600">
                <m.icon className="h-7 w-7" aria-hidden />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-green-600">
                  {tag}
                </p>
                <h2 className="mt-0.5 font-display text-2xl font-semibold text-soil">
                  {m.label}
                </h2>
              </div>
              <span className="ml-auto rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 ring-1 ring-green-100">
                {points.length} features
              </span>
            </header>

            <ul
              className={`relative mt-6 grid gap-3 border-t border-green-100 pt-6 ${
                wide ? 'md:grid-cols-2 md:gap-x-10' : ''
              }`}
            >
              {points.map((p) => (
                <li
                  key={p}
                  className="flex gap-3 rounded-xl p-2 -mx-2 text-[15px] leading-relaxed text-soil-600 transition-colors hover:bg-green-50/80 hover:text-soil"
                >
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" aria-hidden />
                  {p}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>

    {/* CTA band */}
    <div className="relative mt-16 overflow-hidden rounded-3xl bg-gradient-to-br from-green-700 via-green-600 to-emerald-600 px-6 py-10 shadow-xl shadow-green-900/20 sm:px-10 sm:py-12">
      <span className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" aria-hidden />
      <span className="pointer-events-none absolute -bottom-24 left-10 h-56 w-56 rounded-full bg-emerald-300/20 blur-3xl" aria-hidden />

      <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="max-w-xl">
          <h2 className="font-display text-2xl font-semibold text-white sm:text-3xl">
            Ready to bring your harvest, shop or mandi online?
          </h2>
          <p className="mt-2 text-green-100">
            Free for farmers. Set up your account in a few minutes.
          </p>
        </div>
        <div className="flex flex-col gap-3 min-[420px]:flex-row">
          <Button
            to="/register"
            size="lg"
            className="group inline-flex items-center justify-center gap-2 bg-white font-semibold text-green-700 shadow-md transition hover:bg-green-50"
          >
            Get started
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" aria-hidden />
          </Button>
          <Button
            to="/how-it-works"
            size="lg"
            variant="secondary"
            className="inline-flex items-center justify-center bg-transparent font-semibold hover:text-white ring-1 ring-white/50 transition hover:bg-white/10 hover:ring-white"
          >
            How it works
          </Button>
        </div>
      </div>
    </div>
  </ContentPage>
);

export default FeaturesPage;