import { Loader2 } from 'lucide-react';
import { translate } from '../../i18n';

export const Spinner = ({ className = 'h-5 w-5' }) => <Loader2 className={`animate-spin accent-text ${className}`} aria-label={translate('common.loadingShort', 'Loading')} />;

export const PageLoader = ({ label }) => (
  <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-soil-500" role="status">
    <Spinner className="h-7 w-7" />
    <span className="text-sm">{label ?? translate('common.loading', 'Loading…')}</span>
  </div>
);

export default Spinner;
