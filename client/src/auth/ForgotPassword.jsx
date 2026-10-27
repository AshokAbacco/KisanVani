import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Input } from '../components/forms/Field';
import Button from '../components/common/Button';
import Alert from '../components/feedback/Alert';
import { authApi } from '../services';
import { errorMessage } from '../utils/errors';

const ForgotPassword = () => {
  const [error, setError] = useState(null);
  const navigate = useNavigate();
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
      <h1 className="text-3xl font-semibold">Reset your password</h1>
      <p className="mt-2 text-soil-500">Enter the e-mail or mobile number on your account. We will send a 6-digit code and a reset link to your registered e-mail.</p>
      <form onSubmit={handleSubmit(submit)} className="mt-8 space-y-5" noValidate>
        <Input label="E-mail or mobile number" autoComplete="username" error={errors.identifier?.message} {...register('identifier', { required: 'Enter your e-mail or mobile number' })} />
        {error && <Alert tone="error">{error}</Alert>}
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          Send verification code
        </Button>
      </form>
      <p className="mt-6 text-sm text-soil-500">
        Remembered it?{' '}
        <Link to="/login" className="link">
          Sign in
        </Link>
      </p>
    </>
  );
};

export default ForgotPassword;
