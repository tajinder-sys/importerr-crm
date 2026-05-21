import { Navigate, Route } from 'react-router-dom';
import { ROUTE_PATHS } from './paths';
import { AdminRoute } from './guards';
import {
  LazyApiConfig,
  LazyDashboardSections,
  LazyExportReports,
  LazyIntegrations,
  LazyNotificationSettings,
  LazyLeadAssignmentStrategySettings,
  LazySystemCrons,
  LazyPaymentMethods,
  LazyPipelineStages,
  LazySellerUsers,
  LazyTeamsSetting,
  LazyTemplates,
} from './lazyPages';

export const adminRoutes = (
  <>
    <Route
      path={ROUTE_PATHS.SETTINGS_API_CONFIG}
      element={(
        <AdminRoute>
          <LazyApiConfig />
        </AdminRoute>
      )}
    />
    <Route
      path={ROUTE_PATHS.SETTINGS_INTEGRATIONS}
      element={(
        <AdminRoute>
          <LazyIntegrations />
        </AdminRoute>
      )}
    />
    <Route
      path={ROUTE_PATHS.SETTINGS_PAYMENT_METHODS}
      element={(
        <AdminRoute>
          <LazyPaymentMethods />
        </AdminRoute>
      )}
    />
    <Route
      path={ROUTE_PATHS.SETTINGS_DASHBOARD_SECTIONS}
      element={(
        <AdminRoute>
          <LazyDashboardSections />
        </AdminRoute>
      )}
    />
    <Route
      path={ROUTE_PATHS.SETTINGS_NOTIFICATIONS}
      element={(
        <AdminRoute>
          <LazyNotificationSettings />
        </AdminRoute>
      )}
    />
    <Route
      path={ROUTE_PATHS.SETTINGS_LEAD_ASSIGNMENT_STRATEGIES}
      element={(
        <AdminRoute>
          <LazyLeadAssignmentStrategySettings />
        </AdminRoute>
      )}
    />
    <Route
      path={ROUTE_PATHS.SETTINGS_CRONS}
      element={(
        <AdminRoute>
          <LazySystemCrons />
        </AdminRoute>
      )}
    />
    <Route
      path={ROUTE_PATHS.SELLER_USERS}
      element={(
        <AdminRoute>
          <LazySellerUsers />
        </AdminRoute>
      )}
    />
    <Route
      path={ROUTE_PATHS.SETTINGS_TEAMS}
      element={<Navigate to={ROUTE_PATHS.TEAMS_SETTINGS} replace />}
    />
    <Route
      path={ROUTE_PATHS.TEAMS_SETTINGS}
      element={(
        <AdminRoute>
          <LazyTeamsSetting />
        </AdminRoute>
      )}
    />
    <Route
      path={ROUTE_PATHS.SETTINGS_PIPELINES}
      element={(
        <AdminRoute>
          <LazyPipelineStages />
        </AdminRoute>
      )}
    />
    <Route
      path={ROUTE_PATHS.TEMPLATES}
      element={(
        <AdminRoute>
          <LazyTemplates />
        </AdminRoute>
      )}
    />
    <Route
      path={ROUTE_PATHS.EXPORT_REPORTS}
      element={(
        <AdminRoute>
          <LazyExportReports />
        </AdminRoute>
      )}
    />
  </>
);
