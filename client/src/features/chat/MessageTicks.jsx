import { Check, CheckCheck } from 'lucide-react';
import { useI18n } from '../../i18n';

/** WhatsApp-style ticks: one grey (sent), two grey (delivered), two blue (read). */
const MessageTicks = ({ status, className = '' }) => {
  const { t } = useI18n();
  const label = t(`chat.status.${status}`, status);
  if (status === 'READ') return <CheckCheck className={`h-4 w-4 shrink-0 text-[#53bdeb] ${className}`} aria-label={label} role="img" />;
  if (status === 'DELIVERED') return <CheckCheck className={`h-4 w-4 shrink-0 text-soil-400 ${className}`} aria-label={label} role="img" />;
  return <Check className={`h-4 w-4 shrink-0 text-soil-400 ${className}`} aria-label={label} role="img" />;
};

export default MessageTicks;
