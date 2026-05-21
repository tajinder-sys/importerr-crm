import { lazy } from 'react';

export const LazyLogin = lazy(() => import('../pages/Login'));
export const LazyDashboard = lazy(() => import('../pages/Dashboard'));
export const LazyLeads = lazy(() => import('../pages/Leads/LeadsManagement/Lead.jsx'));
export const LazyCompletedLeads = lazy(() => import('../pages/Leads/CompletedLeads.jsx'));
export const LazyUnassignedLeads = lazy(() => import('../pages/Leads/UnassignedLeads.jsx'));
export const LazyAbandonedQueue = lazy(() => import('../pages/Abandoned/AbandonedQueue.jsx'));
export const LazyAbandonedSettings = lazy(() => import('../pages/Abandoned/AbandonedSettings.jsx'));
export const LazyLeadDetails = lazy(() => import('../pages/LeadDetails'));
export const LazyActivities = lazy(() => import('../pages/Activities/Activities.jsx'));
export const LazyMyTeam = lazy(() => import('../pages/MyTeam.jsx'));
export const LazyProfile = lazy(() => import('../pages/Profile.jsx'));
export const LazyTeams = lazy(() => import('../pages/Teams'));

export const LazyApiConfig = lazy(() => import('../pages/settings/ApiConfig.jsx'));
export const LazyIntegrations = lazy(() => import('../pages/settings/Integrations.jsx'));
export const LazyPaymentMethods = lazy(() => import('../pages/settings/PaymentMethods'));
export const LazyDashboardSections = lazy(() => import('../pages/settings/DashboardSections'));
export const LazyNotificationSettings = lazy(() => import('../pages/settings/NotificationSettings.jsx'));
export const LazyLeadAssignmentStrategySettings = lazy(
  () => import('../pages/settings/LeadAssignmentStrategySettings.jsx')
);
export const LazySystemCrons = lazy(() => import('../pages/settings/SystemCrons.jsx'));
export const LazySellerUsers = lazy(() => import('../pages/settings/SellerUsers.jsx'));
export const LazyTeamsSetting = lazy(() => import('../pages/settings/TeamsSetting.jsx'));
export const LazyPipelineStages = lazy(() => import('../pages/settings/PipelineStages/PipelineStages.jsx'));
export const LazyTemplates = lazy(() => import('../pages/Templates'));
export const LazyExportReports = lazy(() => import('../pages/ExportReports.jsx'));
