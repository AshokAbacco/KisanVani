import { toDateInput } from '../../utils/format';
import { useI18n } from '../../i18n';

const PRESETS = [7, 30, 90];

/** Controlled { from, to } (yyyy-mm-dd) date range with quick presets. */
const DateRangeFilter = ({ value, onChange }) => {
  const { t } = useI18n();
  const setPreset = (days) => onChange({ from: toDateInput(new Date(Date.now() - (days - 1) * 86400000)), to: toDateInput(new Date()) });
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex gap-1">
        {PRESETS.map((days) => (
          <button key={days} type="button" onClick={() => setPreset(days)} className="rounded-md border border-soil-200 bg-white px-2.5 py-1.5 text-xs font-medium text-soil-600 hover:bg-soil-100">
            {t('components.dateRange.days', '', { n: days })}
          </button>
        ))}
      </div>
      <label className="flex items-center gap-1 text-sm text-soil-500">
        <span className="sr-only">{t('components.dateRange.from')}</span>
        <input type="date" className="input h-9 w-auto py-1" value={value.from || ''} max={value.to || undefined} onChange={(e) => onChange({ ...value, from: e.target.value })} />
      </label>
      <span className="text-soil-400">{t('components.dateRange.to')}</span>
      <label className="flex items-center gap-1 text-sm text-soil-500">
        <span className="sr-only">{t('components.dateRange.toLabel')}</span>
        <input type="date" className="input h-9 w-auto py-1" value={value.to || ''} min={value.from || undefined} onChange={(e) => onChange({ ...value, to: e.target.value })} />
      </label>
      {(value.from || value.to) && (
        <button type="button" className="text-sm text-soil-500 underline" onClick={() => onChange({ from: '', to: '' })}>
          {t('common.clear')}
        </button>
      )}
    </div>
  );
};

export default DateRangeFilter;
