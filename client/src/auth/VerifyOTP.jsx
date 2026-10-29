import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Input } from '../components/forms/Field';
import Button from '../components/common/Button';
import Alert from '../components/feedback/Alert';
import { authApi } from '../services';
import { errorMessage } from '../utils/errors';
import { useI18n } from '../i18n';

const VerifyOTP = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [error, setError] = useState(null);
  const [resent, setResent] = useState(false);
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { identifier: state?.identifier || '' } });

  const submit = async (v) => {
    setError(null);
    try {
      const { resetToken } = await authApi.verifyOtp({ identifier: v.identifier, otp: v.otp.trim() });
      navigate(`/reset-password?token=${encodeURIComponent(resetToken)}`, { replace: true });
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const resend = async () => {
    const identifier = getValues('identifier');
    if (!identifier) return setError(t('verify.enterIdFirst'));
    try {
      await authApi.forgotPassword({ identifier });
      setResent(true);
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    }
    return undefined;
  };

  return (
    <>
      <h1 className="text-3xl font-semibold">{t('verify.title')}</h1>
      <p className="mt-2 text-soil-500">{t('verify.body')}</p>
      {state?.devNote && (
        <Alert tone="info" className="mt-6" title={t('verify.devMode')}>
          {state.devNote}
        </Alert>
      )}
      {resent && (
        <Alert tone="success" className="mt-6">
          {t('verify.resent')}
        </Alert>
      )}
      <form onSubmit={handleSubmit(submit)} className="mt-8 space-y-5" noValidate>
        <Input label={t('auth.identifier')} error={errors.identifier?.message} {...register('identifier', { required: t('validation.identifierRequired') })} />
        <Input
          label={t('verify.code')}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          inputClass="num text-center text-2xl tracking-[0.5em]"
          error={errors.otp?.message}
          {...register('otp', {
            required: t('validation.codeRequired'),
            pattern: { value: /^\d{6}$/, message: t('validation.codeDigits') },
          })}
        />
        {error && <Alert tone="error">{error}</Alert>}
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          {t('auth.verifyCode')}
        </Button>
      </form>
      <div className="mt-6 flex flex-wrap justify-between gap-3 text-sm">
        <button type="button" onClick={resend} className="link">
          {t('verify.resend')}
        </button>
        <Link to="/login" className="text-soil-500 hover:text-soil">
          {t('verify.backToSignIn')}
        </Link>
      </div>
    </>
  );
};

export default VerifyOTP;