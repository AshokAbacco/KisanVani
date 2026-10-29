import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Input } from '../components/forms/Field';
import Button from '../components/common/Button';
import Alert from '../components/feedback/Alert';
import { authApi } from '../services';
import { errorMessage } from '../utils/errors';
import { useI18n } from '../i18n';

const ForgotPassword = () => {
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { t } = useI18n();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  const submit = async ({ identifier }) => {
    setError(null);
    try {
      const res = await authApi.forgotPassword({ identifier });
      navigate('/verify-otp', { state: { identifier, message: res.message, devNote: res.devNote } });
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <>
      <h1 className="text-3xl font-semibold">{t('auth.resetTitle')}</h1>
      <p className="mt-2 text-soil-500">{t('forgot.body')}</p>
      <form onSubmit={handleSubmit(submit)} className="mt-8 space-y-5" noValidate>
        <Input
          label={t('auth.identifier')}
          autoComplete="username"
          error={errors.identifier?.message}
          {...register('identifier', { required: t('validation.identifierRequired') })}
        />
        {error && <Alert tone="error">{error}</Alert>}
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          {t('auth.sendCode')}
        </Button>
      </form>
      <p className="mt-6 text-sm text-soil-500">
        {t('forgot.remembered')}{' '}
        <Link to="/login" className="link">
          {t('auth.signIn')}
        </Link>
      </p>
    </>
  );
};

export default ForgotPassword;