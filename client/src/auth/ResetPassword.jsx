import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { CheckCircle2 } from 'lucide-react';
import { Input } from '../components/forms/Field';
import Button from '../components/common/Button';
import Alert from '../components/feedback/Alert';
import { authApi } from '../services';
import { errorMessage } from '../utils/errors';
import { makeRules } from '../validators';
import { useI18n } from '../i18n';

const ResetPassword = () => {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);
  const { t } = useI18n();
  const rules = makeRules(t);
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
        <h1 className="text-3xl font-semibold">{t('reset.missingTitle')}</h1>
        <p className="mt-3 text-soil-600">{t('reset.missingBody')}</p>
        <Button to="/forgot-password" className="mt-6">
          {t('reset.requestNew')}
        </Button>
      </>
    );

  if (done)
    return (
      <>
        <CheckCircle2 className="h-10 w-10 text-field-600" aria-hidden />
        <h1 className="mt-4 text-3xl font-semibold">{t('reset.doneTitle')}</h1>
        <p className="mt-3 text-soil-600">{t('reset.doneBody')}</p>
        <Button to="/login" className="mt-6">
          {t('auth.signIn')}
        </Button>
      </>
    );

  return (
    <>
      <h1 className="text-3xl font-semibold">{t('auth.setNewPassword')}</h1>
      <p className="mt-2 text-soil-500">{t('reset.body')}</p>
      <form onSubmit={handleSubmit(submit)} className="mt-8 space-y-5" noValidate>
        <Input label={t('reset.newPassword')} type="password" autoComplete="new-password" error={errors.password?.message} {...register('password', rules.password)} />
        <Input
          label={t('reset.confirmNew')}
          type="password"
          autoComplete="new-password"
          error={errors.confirm?.message}
          {...register('confirm', { validate: (v) => v === watch('password') || t('validation.mismatch') })}
        />
        {error && (
          <Alert tone="error">
            {error}{' '}
            <Link to="/forgot-password" className="underline">
              {t('reset.requestNew')}
            </Link>
          </Alert>
        )}
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          {t('auth.setNewPassword')}
        </Button>
      </form>
    </>
  );
};

export default ResetPassword;