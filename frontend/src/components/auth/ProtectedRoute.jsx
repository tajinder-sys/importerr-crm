import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Skeleton from '../common/ui/Skeleton';

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col border-r border-gray-200 bg-white">
          <div className="space-y-4 p-4">
            <Skeleton className="h-10 w-36" />
            <Skeleton className="h-8 w-full rounded-lg" />
            <Skeleton className="h-8 w-full rounded-lg" />
            <Skeleton className="h-8 w-full rounded-lg" />
            <Skeleton className="h-8 w-4/5 rounded-lg" />
          </div>
        </div>
        <div className="md:ml-64">
          <div className="h-16 border-b border-gray-200 bg-white" />
          <div className="px-4 py-6 sm:px-6 md:px-8">
            <div className="mx-auto max-w-7xl space-y-6">
              <Skeleton className="h-8 w-56" />
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-72 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
