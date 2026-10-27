import { useEffect, useState } from 'react';
import { Sprout, Warehouse, Store } from 'lucide-react';

/**
 * Hero illustration: the path produce takes on KisanVani. The route draws itself once on load and a
 * truck shuttles along it. Everything lives in one viewBox so it scales together; with
 * prefers-reduced-motion the truck simply waits at the mandi.
 */
const NODES = [
  { x: 70, y: 300, icon: Sprout, title: 'Farm, Kolar', line: 'Tomato, 1,200 kg listed', color: '#1F6F3D' },
  { x: 285, y: 120, icon: Warehouse, title: 'K.R. Market Mandi', line: 'Onion lot at ₹26/kg', color: '#C27F0E' },
  { x: 505, y: 270, icon: Store, title: 'Shop, Jayanagar', line: 'Received 98 kg', color: '#1F6F3D' },
];

const ROUTE = 'M70 300 C 150 300, 190 130, 285 120 S 430 250, 505 270';

const usePrefersReducedMotion = () => {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const on = (e) => setReduced(e.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return reduced;
};

const Truck = () => (
  <g>
    <circle r="20" fill="#1D5E9B" stroke="#fff" strokeWidth="4" />
    <g transform="translate(-10 -10) scale(0.84)" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
      <path d="M15 18H9" />
      <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
      <circle cx="17" cy="18" r="2" />
      <circle cx="7" cy="18" r="2" />
    </g>
  </g>
);

const SupplyRoute = () => {
  const reduced = usePrefersReducedMotion();
  return (
    <figure className="relative mx-auto w-full max-w-[600px]" aria-label="Produce moving from a farm through a Market Mandi to a shop, carried by a driver">
      <svg viewBox="0 0 580 380" className="h-auto w-full overflow-visible">
        <defs>
          <pattern id="rows" width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(-12)">
            <line x1="0" y1="0" x2="0" y2="22" stroke="#3FA34D" strokeOpacity=".12" strokeWidth="6" />
          </pattern>
          <path id="supply-route" d={ROUTE} />
        </defs>
        <rect x="0" y="0" width="580" height="380" rx="28" fill="url(#rows)" />
        <use href="#supply-route" fill="none" stroke="#DCE4DE" strokeWidth="14" strokeLinecap="round" />
        <path d={ROUTE} className="route-path" fill="none" stroke="#1F6F3D" strokeWidth="4" strokeLinecap="round" />
        <use href="#supply-route" fill="none" stroke="#fff" strokeWidth="1.5" strokeDasharray="6 10" strokeLinecap="round" opacity=".8" />
        {reduced ? (
          <g transform="translate(285 120)">
            <Truck />
          </g>
        ) : (
          <g>
            <Truck />
            <animateMotion dur="12s" begin="0s" repeatCount="indefinite" keyPoints="0;0;1;1;0;0" keyTimes="0;0.2;0.55;0.62;0.95;1" calcMode="linear">
              <mpath href="#supply-route" />
            </animateMotion>
          </g>
        )}
      </svg>

      {NODES.map((n) => (
        <div key={n.title} className="absolute" style={{ left: `${(n.x / 580) * 100}%`, top: `${(n.y / 380) * 100}%`, transform: 'translate(-50%, -50%)' }}>
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white shadow-lift ring-1 ring-soil-200 sm:h-14 sm:w-14" style={{ color: n.color }}>
            <n.icon className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden />
          </span>
          <div className="absolute left-1/2 top-14 hidden w-40 -translate-x-1/2 rounded-xl bg-white/95 px-3 py-2 text-center shadow-lift ring-1 ring-soil-200 sm:top-16 sm:block">
            <p className="text-sm font-semibold text-soil">{n.title}</p>
            <p className="num text-xs text-soil-500">{n.line}</p>
          </div>
        </div>
      ))}
    </figure>
  );
};

export default SupplyRoute;
