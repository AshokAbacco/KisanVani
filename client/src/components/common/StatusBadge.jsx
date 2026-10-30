import { STATUS_TONES } from '../../constants/status';
import { humanize } from '../../utils/format';
import { useI18n } from '../../i18n';

const TONES = {
  green: 'bg-field-50 text-field-800 ring-field-200',
  amber: 'bg-turmeric-50 text-turmeric-700 ring-turmeric-100',
  red: 'bg-red-50 text-red-700 ring-red-200',
  blue: 'bg-river-50 text-river-700 ring-river-100',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200',
  grey: 'bg-soil-100 text-soil-600 ring-soil-200',
};

const StatusBadge = ({ status, tone, children, className = '' }) => {
  useI18n(); // re-render on language change; humanize() reads the active language
  const t = tone || STATUS_TONES[status] || 'grey';
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${TONES[t]} ${className}`}>
      {children || humanize(status)}
    </span>
  );
};

export default StatusBadge;
