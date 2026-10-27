import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { CheckCircle2 } from 'lucide-react';
import { Input } from '../components/forms/Field';
import Button from '../components/common/Button';
import Alert from '../components/feedback/Alert';
import { authApi } from '../services';
import { errorMessage } from '../utils/errors';
import { rules } from '../validators';

const ResetPassword = () => {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm();

  const submit = async ({ password }) => {
    setError(null);
    try {
      await authApi.resetPassword({ token, password });
      setDone(true);
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  if (!token)
    return (
      <>
        <h1 className="text-3xl font-semibold">Reset link missing</h1>
        <p className="mt-3 text-soil-600">Open the link from your e-mail again, or request a new code.</p>
        <Button to="/forgot-password" className="mt-6">
          Request a new code
        </Button>
      </>
    );

  if (done)
    return (
      <>
        <CheckCircle2 className="h-10 w-10 text-field-600" aria-hidden />
        <h1 className="mt-4 text-3xl font-semibold">Password updated</h1>
        <p className="mt-3 text-soil-600">You have been signed out on all devices. Sign in with your new password.</p>
        <Button to="/login" className="mt-6">
          Sign in
        </Button>
      </>
    );

  return (
    <>
      <h1 className="text-3xl font-semibold">Set a new password</h1>
      <p className="mt-2 text-soil-500">Use at least 8 characters, including a letter and a number.</p>
      <form onSubmit={handleSubmit(submit)} className="mt-8 space-y-5" noValidate>
        <Input label="New password" type="password" autoComplete="new-password" error={errors.password?.message} {...register('password', rules.password)} />
        <Input
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          error={errors.confirm?.message}
          {...register('confirm', { validate: (v) => v === watch('password') || 'Passwords do not match' })}
        />
        {error && (
          <Alert tone="error">
            {error}{' '}
            <Link to="/forgot-password" className="underline">
              Request a new code
            </Link>
          </Alert>
        )}
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          Set new password
        </Button>
      </form>
    </>
  );
};

export default ResetPassword;
