import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import AppLoader from '../../components/common/AppLoader';
import { ROUTE_PATHS } from '../paths';

const ProtectedRoute = ({ children, allowedRoles = null, requiredRole = null }) => {
  const { isAuthenticated, isLoading, user, token } = useAuth();
  const location = useLocation();
  const roles = allowedRoles ?? (requiredRole ? [requiredRole] : null);
  const hasSession = isAuthenticated && Boolean(token);

  if (isLoading) {
    return <AppLoader variant="shell" />;
  }

  if (!hasSession) {
    return <Navigate to={ROUTE_PATHS.LOGIN} replace state={{ from: location }} />;
  }

  if (roles?.length && user?.role && !roles.includes(user.role)) {
    return <Navigate to={ROUTE_PATHS.DASHBOARD} replace />;
  }

  return children;
};

export default ProtectedRoute;
