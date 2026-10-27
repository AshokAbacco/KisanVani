import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { KeyRound, LogOut, Languages } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Section from '../../components/common/Section';
import Button from '../../components/common/Button';
import { Input } from '../../components/forms/Field';
import ConfirmDialog from '../../components/modals/ConfirmDialog';
import { authApi } from '../../services';
import { setAccessToken } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useI18n, LANGUAGES } from '../../i18n';
import { rules } from '../../validators';
import { applyFieldErrors } from '../../utils/errors';

/** Password, language and session management — the same for every role. */
const AccountSettingsPage = ({ children }) => {
  const { setUser, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { lang, setLang } = useI18n();
  const [confirmAll, setConfirmAll] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm();

  const changePassword = async (v) => {
    try {
      const res = await authApi.changePassword({ currentPassword: v.currentPassword, newPassword: v.newPassword });
      setAccessToken(res.accessToken);
      reset();
      toast.success('Password changed. Other devices have been signed out.');
    } catch (e) {
      if (e.response?.data?.error?.code === 'INVALID_PASSWORD') setError('currentPassword', { message: 'Current password is incorrect' });
      else if (!applyFieldErrors(e, setError)) toast.error(e);
    }
  };

  const changeLang = async (code) => {
    setLang(code);
    try {
      setUser(await authApi.updateMe({ preferredLanguage: code }));
      toast.success('Language saved');
    } catch (e) {
      toast.error(e);
    }
  };

  const signOutEverywhere = async () => {
    await authApi.logoutAll();
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <>
      <PageHeader title="Settings" description="Your password, language and signed-in devices." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Change password">
          <form onSubmit={handleSubmit(changePassword)} className="space-y-4" noValidate>
            <Input label="Current password" type="password" autoComplete="current-password" error={errors.currentPassword?.message} {...register('currentPassword', { required: 'Enter your current password' })} />
            <Input label="New password" type="password" autoComplete="new-password" hint="8+ characters with a letter and a number" error={errors.newPassword?.message} {...register('newPassword', rules.password)} />
            <Input label="Confirm new password" type="password" autoComplete="new-password" error={errors.confirm?.message} {...register('confirm', { validate: (v) => v === watch('newPassword') || 'Passwords do not match' })} />
            <Button type="submit" icon={KeyRound} loading={isSubmitting}>
              Change password
            </Button>
          </form>
        </Section>
        <div className="space-y-6">
          <Section title="Language">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  disabled={!l.ready}
                  onClick={() => changeLang(l.code)}
                  className={`rounded-lg border px-3 py-2 text-left text-sm disabled:cursor-not-allowed disabled:opacity-50 ${lang === l.code ? 'accent-soft border-transparent font-semibold accent-text' : 'border-soil-200 hover:bg-soil-100'}`}
                >
                  <span className="block">{l.native}</span>
                  <span className="text-xs text-soil-500">{l.ready ? l.label : `${l.label} (coming soon)`}</span>
                </button>
              ))}
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-soil-500">
              <Languages className="h-3.5 w-3.5" aria-hidden /> Screens not yet translated stay in English.
            </p>
          </Section>
          <Section title="Signed-in devices">
            <p className="text-sm text-soil-600">Lost a phone or used a shared computer? Sign out everywhere, including this device.</p>
            <Button className="mt-4" variant="secondary" icon={LogOut} onClick={() => setConfirmAll(true)}>
              Sign out of all devices
            </Button>
          </Section>
          {children}
        </div>
      </div>
      <ConfirmDialog open={confirmAll} onClose={() => setConfirmAll(false)} title="Sign out of all devices?" message="You will need your password to sign in again on every device." confirmLabel="Sign out everywhere" onConfirm={signOutEverywhere} />
    </>
  );
};

export default AccountSettingsPage;
