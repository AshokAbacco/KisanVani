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
  const { logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { lang, setLang, t } = useI18n();
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
      toast.success(t('accountSettings.passwordChanged'));
    } catch (e) {
      if (e.response?.data?.error?.code === 'INVALID_PASSWORD') setError('currentPassword', { message: t('accountSettings.wrongPassword') });
      else if (!applyFieldErrors(e, setError)) toast.error(e);
    }
  };

  // Same language state as the website navbar and dashboard header; <LanguageSync> saves it to the profile.
  const changeLang = (code) => {
    if (code === lang) return;
    setLang(code);
    toast.success(t('accountSettings.languageSaved'));
  };

  const signOutEverywhere = async () => {
    await authApi.logoutAll();
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <>
      <PageHeader title={t('common.settings')} description={t('accountSettings.intro')} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title={t('accountSettings.changePassword')}>
          <form onSubmit={handleSubmit(changePassword)} className="space-y-4" noValidate>
            <Input label={t('accountSettings.currentPassword')} type="password" autoComplete="current-password" error={errors.currentPassword?.message} {...register('currentPassword', { required: t('accountSettings.enterCurrent') })} />
            <Input label={t('reset.newPassword')} type="password" autoComplete="new-password" hint={t('register.fields.passwordHint')} error={errors.newPassword?.message} {...register('newPassword', rules.password)} />
            <Input label={t('reset.confirmNew')} type="password" autoComplete="new-password" error={errors.confirm?.message} {...register('confirm', { validate: (v) => v === watch('newPassword') || t('validation.mismatch') })} />
            <Button type="submit" icon={KeyRound} loading={isSubmitting}>
              {t('accountSettings.changePassword')}
            </Button>
          </form>
        </Section>
        <div className="space-y-6">
          <Section title={t('common.language')} description={t('accountSettings.languageIntro')}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {LANGUAGES.filter((l) => l.ready).map((l) => (
                <button
                  key={l.code}
                  lang={l.code}
                  aria-pressed={lang === l.code}
                  onClick={() => changeLang(l.code)}
                  className={`rounded-lg border px-3 py-2 text-left text-sm disabled:cursor-not-allowed disabled:opacity-50 ${lang === l.code ? 'accent-soft border-transparent font-semibold accent-text' : 'border-soil-200 hover:bg-soil-100'}`}
                >
                  <span className="block">{l.native}</span>
                  <span className="text-xs text-soil-500">{l.label}</span>
                </button>
              ))}
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-soil-500">
              <Languages className="h-3.5 w-3.5" aria-hidden /> {t('accountSettings.languageNote')}
            </p>
          </Section>
          <Section title={t('accountSettings.devices')}>
            <p className="text-sm text-soil-600">{t('accountSettings.devicesIntro')}</p>
            <Button className="mt-4" variant="secondary" icon={LogOut} onClick={() => setConfirmAll(true)}>
              {t('accountSettings.signOutAll')}
            </Button>
          </Section>
          {children}
        </div>
      </div>
      <ConfirmDialog open={confirmAll} onClose={() => setConfirmAll(false)} title={t('accountSettings.signOutAllTitle')} message={t('accountSettings.signOutAllMessage')} confirmLabel={t('accountSettings.signOutEverywhere')} onConfirm={signOutEverywhere} />
    </>
  );
};

export default AccountSettingsPage;
