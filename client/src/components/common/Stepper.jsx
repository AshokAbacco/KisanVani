import { Check } from 'lucide-react';
import { humanize } from '../../utils/format';
import { useI18n } from '../../i18n';

/** Horizontal progress through a fixed sequence of statuses. Off-path statuses (cancelled etc.) show as a note. */
const Stepper = ({ steps, current, offPath }) => {
  useI18n(); // humanize() labels follow the active language
  const idx = steps.indexOf(current);
  return (
    <div>
      <ol className="flex items-center overflow-x-auto pb-1">
        {steps.map((s, i) => {
          const done = idx >= 0 && i < idx;
          const active = i === idx;
          return (
            <li key={s} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-1.5 px-1">
                <span
                  className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${done ? 'accent-bg text-white' : active ? 'accent-soft accent-text ring-2 ring-current' : 'bg-soil-100 text-soil-400'}`}
                  aria-current={active ? 'step' : undefined}
                >
                  {done ? <Check className="h-4 w-4" aria-hidden /> : i + 1}
                </span>
                <span className={`whitespace-nowrap text-xs ${active ? 'font-semibold text-soil' : 'text-soil-500'}`}>{humanize(s)}</span>
              </div>
              {i < steps.length - 1 && <span className={`mb-5 h-0.5 min-w-4 flex-1 ${done ? 'accent-bg' : 'bg-soil-200'}`} aria-hidden />}
            </li>
          );
        })}
      </ol>
      {offPath && <p className="mt-2 text-sm font-medium text-red-700">{offPath}</p>}
    </div>
  );
};

/** Vertical history: [{ id, title, meta, note }] */
export const Timeline = ({ items }) => (
  <ol className="space-y-4">
    {items.map((it, i) => (
      <li key={it.id || i} className="grid grid-cols-[14px_1fr] gap-3">
        <span className="relative mt-1.5 flex justify-center">
          <span className="z-10 h-2.5 w-2.5 rounded-full accent-bg" aria-hidden />
          {i < items.length - 1 && <span className="absolute top-3 h-[calc(100%+12px)] w-px bg-soil-200" aria-hidden />}
        </span>
        <div>
          <p className="text-sm font-semibold">{it.title}</p>
          <p className="text-xs text-soil-500">{it.meta}</p>
          {it.note && <p className="mt-1 text-sm text-soil-600">“{it.note}”</p>}
        </div>
      </li>
    ))}
  </ol>
);

export default Stepper;
