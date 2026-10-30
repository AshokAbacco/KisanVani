import { AlertTriangle } from 'lucide-react';
import Button from '../common/Button';
import { errorMessage } from '../../utils/errors';
import { useI18n } from '../../i18n';

const ErrorState = ({ error, onRetry, title }) => {
  const { t } = useI18n();
  return (
  <div className="flex flex-col items-center justify-center px-4 py-12 text-center" role="alert">
    <AlertTriangle className="mb-2 h-7 w-7 text-chilli-500" aria-hidden />
    <p className="font-semibold">{title ?? t('components.errorState.title')}</p>
    <p className="mt-1 max-w-md text-sm text-soil-500">{errorMessage(error)}</p>
    {onRetry && (
      <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
        {t('common.retry')}
      </Button>
    )}
  </div>
  );
};

export default ErrorState;
