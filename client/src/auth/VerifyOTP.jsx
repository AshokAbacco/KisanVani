import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Input } from '../components/forms/Field';
import Button from '../components/common/Button';
import Alert from '../components/feedback/Alert';
import { authApi } from '../services';
import { errorMessage } from '../utils/errors';

const VerifyOTP = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
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
    if (!identifier) return setError('Enter your e-mail or mobile number first.');
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
      <h1 className="text-3xl font-semibold">Enter the verification code</h1>
      <p className="mt-2 text-soil-500">We sent a 6-digit code to the e-mail on your account. It expires in 15 minutes.</p>
      {state?.devNote && (
        <Alert tone="info" className="mt-6" title="Development mode">
          {state.devNote}
        </Alert>
      )}
      {resent && (
        <Alert tone="success" className="mt-6">
          A new code has been sent.
        </Alert>
      )}
      <form onSubmit={handleSubmit(submit)} className="mt-8 space-y-5" noValidate>
        <Input label="E-mail or mobile number" error={errors.identifier?.message} {...register('identifier', { required: 'Required' })} />
        <Input
          label="6-digit code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          inputClass="num text-center text-2xl tracking-[0.5em]"
          error={errors.otp?.message}
          {...register('otp', { required: 'Enter the code', pattern: { value: /^\d{6}$/, message: 'The code has 6 digits' } })}
        />
        {error && <Alert tone="error">{error}</Alert>}
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          Verify code
        </Button>
      </form>
      <div className="mt-6 flex justify-between text-sm">
        <button type="button" onClick={resend} className="link">
          Send a new code
        </button>
        <Link to="/login" className="text-soil-500 hover:text-soil">
          Back to sign in
        </Link>
      </div>
    </>
  );
};

export default VerifyOTP;
