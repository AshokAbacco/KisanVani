import { Link } from 'react-router-dom';

/** Summary figure. Keep the label short; `hint` adds one line of context. */
const StatCard = ({ label, value, hint, icon: Icon, to, tone = 'accent', loading }) => {
  const toneCls =
    {
      accent: 'accent-soft accent-text',
      amber: 'bg-turmeric-50 text-turmeric-700',
      blue: 'bg-river-50 text-river-700',
      red: 'bg-red-50 text-red-700',
      green: 'bg-field-50 text-field-700',
    }[tone] || 'accent-soft accent-text';
  const body = (
    <div className="panel flex h-full items-start gap-4 p-4 transition hover:border-soil-300">
      {Icon && (
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${toneCls}`}>
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      )}
      <div className="min-w-0">
        <p className="text-sm text-soil-500">{label}</p>
        {loading ? (
          <div className="mt-1.5 h-7 w-24 animate-pulse rounded bg-soil-100" />
        ) : (
          <p className="num mt-0.5 truncate font-display text-2xl font-semibold text-soil">{value}</p>
        )}
        {hint && <p className="mt-0.5 text-xs text-soil-500">{hint}</p>}
      </div>
    </div>
  );
  return to ? (
    <Link to={to} className="block rounded-xl">
      {body}
    </Link>
  ) : (
    body
  );
};

export default StatCard;
