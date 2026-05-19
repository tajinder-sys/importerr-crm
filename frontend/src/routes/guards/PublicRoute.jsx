import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import AppLoader from '../../components/common/AppLoader';
import { ROUTE_PATHS } from '../paths';

const PublicRoute = ({ children }) => {
  const { isAuthenticated, isLoading, token } = useAuth();
  const location = useLocation();
  const hasSession = isAuthenticated && Boolean(token);

  if (isLoading) {
    return (
      <AppLoader
        variant="fullscreen"
        message="Checking session"
        description="Verifying your credentials"
      />
    );
  }

  if (hasSession) {
    const redirectTo = location.state?.from?.pathname || ROUTE_PATHS.DASHBOARD;
    return <Navigate to={redirectTo} replace />;
  }

  return children;
};

export default PublicRoute;
