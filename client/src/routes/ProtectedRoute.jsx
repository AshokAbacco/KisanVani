import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PageLoader } from '../components/common/Spinner';
import { useT } from '../i18n';

/** Requires a signed-in user. Visitors are sent to login and returned afterwards. */
const ProtectedRoute = () => {
  const { status, waking } = useAuth();
  const location = useLocation();
  const t = useT();
  if (status === 'loading') return <PageLoader label={waking ? t('layout.serverWaking', 'Connecting to the KisanVani server… this can take up to a minute.') : t('layout.restoringSession', 'Restoring your session…')} />;
  if (status !== 'authenticated') return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <Outlet />;
};

export default ProtectedRoute;