import { ROLES } from '../constants/roles';
import { useT } from '../i18n';

/** Radio group of role tiles. Uses "Market Mandi" on the tile as required for the login screen. */
const RolePicker = ({ roles, value, onChange, name = 'role' }) => {
  const t = useT();
  return (
    <div role="radiogroup" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {roles.map((r) => {
        const m = ROLES[r];
        const active = value === r;
        return (
          <label
            key={r}
            className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${active ? 'border-field-600 bg-field-50 text-field-800 ring-1 ring-field-600' : 'border-soil-200 text-soil-600 hover:border-soil-300'}`}
          >
            <input type="radio" name={name} value={r} checked={active} onChange={() => onChange(r)} className="sr-only" />
            <m.icon className="h-4 w-4 shrink-0" aria-hidden />
            {t(`roles.${r}`, m.shortLabel || m.label)}
          </label>
        );
      })}
    </div>
  );
};

export default RolePicker;
