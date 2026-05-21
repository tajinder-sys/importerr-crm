import { Route, Navigate } from 'react-router-dom';
import { ROUTE_PATHS } from './paths';
import { AdminRoute, TeamManagerRoute, TeamMemberRoute } from './guards';
import {
  LazyActivities,
  LazyCompletedLeads,
  LazyDashboard,
  LazyLeadDetails,
  LazyLeads,
  LazyMyTeam,
  LazyProfile,
  LazyTeams,
  LazyUnassignedLeads,
  LazyAbandonedQueue,
  LazyAbandonedSettings,
} from './lazyPages';

export const appRoutes = (
  <>
    <Route path="/leads/abandoned-queue" element={<Navigate to={ROUTE_PATHS.ABANDONED_QUEUE} replace />} />
    <Route path={ROUTE_PATHS.DASHBOARD} element={<LazyDashboard />} />
    <Route
      path={ROUTE_PATHS.LEADS_UNASSIGNED}
      element={(
        <TeamManagerRoute>
          <LazyUnassignedLeads />
        </TeamManagerRoute>
      )}
    />
    <Route path={ROUTE_PATHS.LEADS_COMPLETED} element={<LazyCompletedLeads />} />
    <Route
      path={ROUTE_PATHS.ABANDONED_QUEUE}
      element={(
        <AdminRoute>
          <LazyAbandonedQueue />
        </AdminRoute>
      )}
    />
    <Route
      path={ROUTE_PATHS.ABANDONED_SETTINGS}
      element={(
        <AdminRoute>
          <LazyAbandonedSettings />
        </AdminRoute>
      )}
    />
    <Route path={ROUTE_PATHS.LEADS} element={<LazyLeads />} />
    <Route path={ROUTE_PATHS.LEAD_DETAIL} element={<LazyLeadDetails />} />
    <Route path={ROUTE_PATHS.ACTIVITIES} element={<LazyActivities />} />
    <Route
      path={ROUTE_PATHS.MY_TEAM}
      element={(
        <TeamMemberRoute>
          <LazyMyTeam />
        </TeamMemberRoute>
      )}
    />
    <Route path={ROUTE_PATHS.PROFILE} element={<LazyProfile />} />
    <Route path={ROUTE_PATHS.TEAMS} element={<Navigate to={ROUTE_PATHS.USER_MANAGEMENT} replace />} />
    <Route
      path={ROUTE_PATHS.USER_MANAGEMENT}
      element={(
        <AdminRoute>
          <LazyTeams />
        </AdminRoute>
      )}
    />
  </>
);
