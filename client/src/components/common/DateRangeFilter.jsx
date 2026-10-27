import { toDateInput } from '../../utils/format';

const PRESETS = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
];

/** Controlled { from, to } (yyyy-mm-dd) date range with quick presets. */
const DateRangeFilter = ({ value, onChange }) => {
  const setPreset = (days) => onChange({ from: toDateInput(new Date(Date.now() - (days - 1) * 86400000)), to: toDateInput(new Date()) });
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex gap-1">
        {PRESETS.map((p) => (
          <button key={p.days} type="button" onClick={() => setPreset(p.days)} className="rounded-md border border-soil-200 bg-white px-2.5 py-1.5 text-xs font-medium text-soil-600 hover:bg-soil-100">
            {p.label}
          </button>
        ))}
      </div>
      <label className="flex items-center gap-1 text-sm text-soil-500">
        <span className="sr-only">From</span>
        <input type="date" className="input h-9 w-auto py-1" value={value.from || ''} max={value.to || undefined} onChange={(e) => onChange({ ...value, from: e.target.value })} />
      </label>
      <span className="text-soil-400">to</span>
      <label className="flex items-center gap-1 text-sm text-soil-500">
        <span className="sr-only">To</span>
        <input type="date" className="input h-9 w-auto py-1" value={value.to || ''} min={value.from || undefined} onChange={(e) => onChange({ ...value, to: e.target.value })} />
      </label>
      {(value.from || value.to) && (
        <button type="button" className="text-sm text-soil-500 underline" onClick={() => onChange({ from: '', to: '' })}>
          Clear
        </button>
      )}
    </div>
  );
};

export default DateRangeFilter;
