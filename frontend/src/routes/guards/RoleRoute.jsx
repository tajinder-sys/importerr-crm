import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ROUTE_PATHS } from '../paths';

/**
 * Restricts children to users whose role is in allowedRoles.
 */
const RoleRoute = ({ children, allowedRoles, redirectTo = ROUTE_PATHS.DASHBOARD }) => {
  const { user } = useAuth();
  const role = user?.role;

  if (!allowedRoles?.length || !role || !allowedRoles.includes(role)) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
};

export default RoleRoute;
