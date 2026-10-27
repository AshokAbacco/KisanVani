import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PageLoader } from '../components/common/Spinner';

/** Requires a signed-in user. Visitors are sent to login and returned afterwards. */
const ProtectedRoute = () => {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <PageLoader label="Restoring your session…" />;
  if (status !== 'authenticated') return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <Outlet />;
};

export default ProtectedRoute;
