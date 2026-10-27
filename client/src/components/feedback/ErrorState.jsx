import { AlertTriangle } from 'lucide-react';
import Button from '../common/Button';
import { errorMessage } from '../../utils/errors';

const ErrorState = ({ error, onRetry, title = 'This could not be loaded' }) => (
  <div className="flex flex-col items-center justify-center px-4 py-12 text-center" role="alert">
    <AlertTriangle className="mb-2 h-7 w-7 text-chilli-500" aria-hidden />
    <p className="font-semibold">{title}</p>
    <p className="mt-1 max-w-md text-sm text-soil-500">{errorMessage(error)}</p>
    {onRetry && (
      <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
        Try again
      </Button>
    )}
  </div>
);

export default ErrorState;
