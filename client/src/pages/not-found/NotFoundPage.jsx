import Button from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import { roleBase } from '../../constants/roles';
import { useI18n } from '../../i18n';

const NotFoundPage = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-start justify-center px-5 py-20">
      <p className="num font-display text-7xl font-bold text-field-200">404</p>
      <h1 className="mt-4 font-display text-3xl font-semibold">{t('notFound.title')}</h1>
      <p className="mt-3 text-soil-600">{t('notFound.body')}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button to={user ? roleBase(user.role) : '/'}>{user ? t('notFound.backDashboard') : t('notFound.backHome')}</Button>
        <Button to="/contact" variant="secondary">
          {t('notFound.contactSupport')}
        </Button>
      </div>
    </div>
  );
};

export default NotFoundPage;