/** Single source of truth for app URL paths */
export const ROUTE_PATHS = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  LEADS: '/leads',
  LEADS_COMPLETED: '/leads/completed',
  LEADS_UNASSIGNED: '/leads/unassigned',
  ABANDONED_QUEUE: '/abandoned/queues',
  ABANDONED_SETTINGS: '/abandoned/settings',
  LEAD_DETAIL: '/leads/:id',
  ACTIVITIES: '/activities',
  MY_TEAM: '/my-team',
  PROFILE: '/profile',
  TEAMS: '/teams',
  SELLER_USERS: '/seller-users',
  EXPORT_REPORTS: '/export-reports',
  SETTINGS_API_CONFIG: '/settings/api-config',
  SETTINGS_INTEGRATIONS: '/settings/integrations/:source',
  SETTINGS_PAYMENT_METHODS: '/settings/payment-methods',
  SETTINGS_DASHBOARD_SECTIONS: '/settings/dashboard-sections',
  SETTINGS_NOTIFICATIONS: '/settings/notifications',
  SETTINGS_CRONS: '/settings/crons',
  SETTINGS_TEAMS: '/settings/teams',
  SETTINGS_PIPELINES: '/settings/pipelines',
  TEMPLATES: '/templates/:type',
  TEMPLATES_EMAIL: '/templates/email',
  TEMPLATES_WHATSAPP: '/templates/whatsapp',
};

export const leadDetailPath = (id) => `/leads/${encodeURIComponent(id)}`;

export const integrationsPath = (source) =>
  `/settings/integrations/${encodeURIComponent(source)}`;

export const templatesPath = (type) => `/templates/${encodeURIComponent(type)}`;
