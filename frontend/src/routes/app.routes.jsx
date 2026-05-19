import { Route } from 'react-router-dom';
import { ROUTE_PATHS } from './paths';
import { TeamManagerRoute, TeamMemberRoute } from './guards';
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
} from './lazyPages';

export const appRoutes = (
  <>
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
    <Route path={ROUTE_PATHS.TEAMS} element={<LazyTeams />} />
  </>
);
