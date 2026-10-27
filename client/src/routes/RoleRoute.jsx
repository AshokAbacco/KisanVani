import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { roleBase } from '../constants/roles';

/**
 * Keeps each dashboard to its role. This is a convenience for navigation only —
 * every API call is authorised again on the server.
 */
const RoleRoute = ({ roles }) => {
  const { user } = useAuth();
  if (!roles.includes(user.role)) return <Navigate to={roleBase(user.role)} replace />;
  return <Outlet />;
};

export default RoleRoute;
