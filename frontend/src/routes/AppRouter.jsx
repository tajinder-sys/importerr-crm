import { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LayoutProvider } from '../contexts/LayoutContext.jsx';
import { BrandingProvider } from '../contexts/BrandingContext.jsx';
import { surfaces } from '../config/designSystem';
import { cn } from '../utils/helpers';
import RouteFallback from '../components/common/RouteFallback';
import { ProtectedRoute, PublicRoute } from './guards';
import AppLayout from './layouts/AppLayout';
import { appRoutes } from './app.routes';
import { adminRoutes } from './admin.routes';
import { ROUTE_PATHS } from './paths';
import { LazyLogin } from './lazyPages';

const AppRouter = () => (
  <BrowserRouter>
    <div className={cn(surfaces.appShell)}>
      <Routes>
        <Route
          path={ROUTE_PATHS.LOGIN}
          element={(
            <PublicRoute>
              <Suspense fallback={<RouteFallback />}>
                <LazyLogin />
              </Suspense>
            </PublicRoute>
          )}
        />
        <Route
          element={(
            <ProtectedRoute>
              <BrandingProvider>
                <LayoutProvider>
                  <AppLayout />
                </LayoutProvider>
              </BrandingProvider>
            </ProtectedRoute>
          )}
        >
          {appRoutes}
          {adminRoutes}
          <Route path="/" element={<Navigate to={ROUTE_PATHS.DASHBOARD} replace />} />
          <Route path="*" element={<Navigate to={ROUTE_PATHS.DASHBOARD} replace />} />
        </Route>
      </Routes>
    </div>
  </BrowserRouter>
);

export default AppRouter;
