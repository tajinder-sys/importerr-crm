export const USER_ROLES = {
  ADMIN: 'admin',
  TEAM_MANAGER: 'team_manager',
  TEAM_MEMBER: 'team_member'
};

export const LEAD_SOURCES = {
  IMPORTERR_INQUIRY: 'importerr_inquiry',
  IMPORTERR_Contact: 'importerr_contact',
  IMPORTERR_Ticket: 'importerr_ticket',
  EMAIL: 'email',
  WHATSAPP: 'whatsapp',
  META_ADS: 'meta_ads',
  PHONE: 'phone',
};

export const LEAD_STATUSES = {
  NEW: 'new',
  CONTACTED: 'contacted',
  INTERESTED: 'interested',
  NEGOTIATION: 'negotiation',
  CONVERTED: 'converted',
  REPEAT_CUSTOMER: 'repeat_customer',
  LOST: 'lost'
};

export const ACTIVITY_TYPES = {
  LEAD_CREATED: 'lead_created',
  LEAD_ASSIGNED: 'lead_assigned',
  STATUS_UPDATED: 'status_updated',
  NOTE_ADDED: 'note_added',
  FILE_ATTACHED: 'file_attached',
  COMMUNICATION_SENT: 'communication_sent',
  LEAD_CONVERTED: 'lead_converted',
  LEAD_UPDATED: 'lead_updated',
  STAGE_CHANGED: 'stage_changed',
  TASK_CREATED: 'task_created',
  TASK_UPDATED: 'task_updated',
  TASK_DELETED: 'task_deleted',
};

/** Matches backend Task / User `priority` enum. */
export const TASK_PRIORITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
};

export const TASK_PRIORITY_OPTIONS = [
  { value: TASK_PRIORITY_LEVELS.LOW, label: 'Low' },
  { value: TASK_PRIORITY_LEVELS.MEDIUM, label: 'Medium' },
  { value: TASK_PRIORITY_LEVELS.HIGH, label: 'High' },
  { value: TASK_PRIORITY_LEVELS.URGENT, label: 'Urgent' },
];

/** @deprecated Use ROUTE_PATHS from routes/paths.js */
export { ROUTE_PATHS as ROUTES } from '../routes/paths';

export const STATUS_COLORS = {
  [LEAD_STATUSES.NEW]: 'bg-blue-100 text-blue-800',
  [LEAD_STATUSES.CONTACTED]: 'bg-yellow-100 text-yellow-800',
  [LEAD_STATUSES.INTERESTED]: 'bg-purple-100 text-purple-800',
  [LEAD_STATUSES.NEGOTIATION]: 'bg-orange-100 text-orange-800',
  [LEAD_STATUSES.CONVERTED]: 'bg-green-100 text-green-800',
  [LEAD_STATUSES.REPEAT_CUSTOMER]: 'bg-emerald-100 text-emerald-800',
  [LEAD_STATUSES.LOST]: 'bg-red-100 text-red-800'
};

export const SOURCE_LABELS = {
  [LEAD_SOURCES.IMPORTERR_INQUIRY]: 'Importerr Inquiry',
  [LEAD_SOURCES.IMPORTERR_Contact]: 'Importerr Contact',
  [LEAD_SOURCES.IMPORTERR_Ticket]: 'Importerr Ticket',
  [LEAD_SOURCES.EMAIL]: 'Email',
  [LEAD_SOURCES.WHATSAPP]: 'WhatsApp',
  [LEAD_SOURCES.META_ADS]: 'Meta Ads',
  [LEAD_SOURCES.PHONE]: 'Phone',
};

export const STATUS_LABELS = {
  [LEAD_STATUSES.NEW]: 'New',
  [LEAD_STATUSES.CONTACTED]: 'Contacted',
  [LEAD_STATUSES.INTERESTED]: 'Interested',
  [LEAD_STATUSES.NEGOTIATION]: 'Negotiation',
  [LEAD_STATUSES.CONVERTED]: 'Converted',
  [LEAD_STATUSES.REPEAT_CUSTOMER]: 'Repeat Customer',
  [LEAD_STATUSES.LOST]: 'Lost'
};
