/**
 * Central registry of notification types.
 * Add new entries here — DB policies sync automatically via ensureDefaults().
 *
 * recipientStrategy:
 *   assignee | assignee_and_previous | team_managers | all_team_managers | all_admins | explicit
 */

const { USER_ROLES } = require('./constants');

const NOTIFICATION_CATEGORIES = {
  LEADS: 'leads',
  TASKS: 'tasks',
  SLA: 'sla',
  TEAM: 'team',
  SYSTEM: 'system',
};

const NOTIFICATION_PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
};

const NOTIFICATION_CATALOG = [
  {
    key: 'lead_assigned',
    label: 'Lead assigned',
    description: 'When a lead is assigned or reassigned to an agent.',
    category: NOTIFICATION_CATEGORIES.LEADS,
    priority: NOTIFICATION_PRIORITIES.HIGH,
    defaultEnabled: true,
    defaultRoles: {
      [USER_ROLES.ADMIN]: false,
      [USER_ROLES.TEAM_MANAGER]: false,
      [USER_ROLES.TEAM_MEMBER]: true,
    },
    recipientStrategy: 'assignee_and_previous',
  },
  {
    key: 'client_reply',
    label: 'Client reply',
    description: 'Inbound message from client on an existing lead (email, WhatsApp, etc.).',
    category: NOTIFICATION_CATEGORIES.LEADS,
    priority: NOTIFICATION_PRIORITIES.URGENT,
    defaultEnabled: true,
    defaultRoles: {
      [USER_ROLES.ADMIN]: false,
      [USER_ROLES.TEAM_MANAGER]: false,
      [USER_ROLES.TEAM_MEMBER]: true,
    },
    recipientStrategy: 'assignee',
  },
  {
    key: 'new_lead_inbound',
    label: 'New inbound lead',
    description: 'A new lead arrives from a channel before or after assignment.',
    category: NOTIFICATION_CATEGORIES.LEADS,
    priority: NOTIFICATION_PRIORITIES.HIGH,
    defaultEnabled: true,
    defaultRoles: {
      [USER_ROLES.ADMIN]: true,
      [USER_ROLES.TEAM_MANAGER]: true,
      [USER_ROLES.TEAM_MEMBER]: false,
    },
    recipientStrategy: 'assignee_and_all_team_managers',
  },
  {
    key: 'lead_unassigned',
    label: 'Unassigned leads',
    description: 'Leads sitting in the pool without an owner (scheduled checks).',
    category: NOTIFICATION_CATEGORIES.TEAM,
    priority: NOTIFICATION_PRIORITIES.HIGH,
    defaultEnabled: true,
    defaultRoles: {
      [USER_ROLES.ADMIN]: true,
      [USER_ROLES.TEAM_MANAGER]: true,
      [USER_ROLES.TEAM_MEMBER]: false,
    },
    recipientStrategy: 'team_managers_and_admins',
  },
  {
    key: 'sla_warning',
    label: 'SLA warning',
    description: 'Lead stage SLA is nearing its limit (~80% elapsed).',
    category: NOTIFICATION_CATEGORIES.SLA,
    priority: NOTIFICATION_PRIORITIES.HIGH,
    defaultEnabled: true,
    defaultRoles: {
      [USER_ROLES.ADMIN]: false,
      [USER_ROLES.TEAM_MANAGER]: false,
      [USER_ROLES.TEAM_MEMBER]: true,
    },
    recipientStrategy: 'assignee',
  },
  {
    key: 'sla_breach',
    label: 'SLA breached',
    description: 'Lead stage SLA time has been exceeded.',
    category: NOTIFICATION_CATEGORIES.SLA,
    priority: NOTIFICATION_PRIORITIES.URGENT,
    defaultEnabled: true,
    defaultRoles: {
      [USER_ROLES.ADMIN]: false,
      [USER_ROLES.TEAM_MANAGER]: true,
      [USER_ROLES.TEAM_MEMBER]: true,
    },
    recipientStrategy: 'assignee_and_team_managers',
  },
  {
    key: 'task_assigned',
    label: 'Task assigned',
    description: 'A follow-up or action task is assigned to a user.',
    category: NOTIFICATION_CATEGORIES.TASKS,
    priority: NOTIFICATION_PRIORITIES.HIGH,
    defaultEnabled: true,
    defaultRoles: {
      [USER_ROLES.ADMIN]: false,
      [USER_ROLES.TEAM_MANAGER]: false,
      [USER_ROLES.TEAM_MEMBER]: true,
    },
    recipientStrategy: 'assignee',
  },
  {
    key: 'task_due_today',
    label: 'Task due today',
    description: 'Reminder that a task is due today.',
    category: NOTIFICATION_CATEGORIES.TASKS,
    priority: NOTIFICATION_PRIORITIES.HIGH,
    defaultEnabled: true,
    defaultRoles: {
      [USER_ROLES.ADMIN]: false,
      [USER_ROLES.TEAM_MANAGER]: false,
      [USER_ROLES.TEAM_MEMBER]: true,
    },
    recipientStrategy: 'assignee',
  },
  {
    key: 'task_overdue',
    label: 'Task overdue',
    description: 'A task has passed its due date.',
    category: NOTIFICATION_CATEGORIES.TASKS,
    priority: NOTIFICATION_PRIORITIES.URGENT,
    defaultEnabled: true,
    defaultRoles: {
      [USER_ROLES.ADMIN]: false,
      [USER_ROLES.TEAM_MANAGER]: true,
      [USER_ROLES.TEAM_MEMBER]: true,
    },
    recipientStrategy: 'assignee_and_team_managers',
  },
  {
    key: 'quote_sent',
    label: 'Quote sent',
    description: 'Confirmation when a quote is sent for a lead.',
    category: NOTIFICATION_CATEGORIES.LEADS,
    priority: NOTIFICATION_PRIORITIES.LOW,
    defaultEnabled: true,
    defaultRoles: {
      [USER_ROLES.ADMIN]: false,
      [USER_ROLES.TEAM_MANAGER]: false,
      [USER_ROLES.TEAM_MEMBER]: true,
    },
    recipientStrategy: 'assignee',
  },
  {
    key: 'stage_changed',
    label: 'Stage changed',
    description: 'Lead moved to a different pipeline stage.',
    category: NOTIFICATION_CATEGORIES.LEADS,
    priority: NOTIFICATION_PRIORITIES.MEDIUM,
    defaultEnabled: false,
    defaultRoles: {
      [USER_ROLES.ADMIN]: false,
      [USER_ROLES.TEAM_MANAGER]: false,
      [USER_ROLES.TEAM_MEMBER]: true,
    },
    recipientStrategy: 'assignee',
  },
  {
    key: 'mention_in_note',
    label: '@mention in note',
    description: 'Someone mentioned a user in a lead note.',
    category: NOTIFICATION_CATEGORIES.LEADS,
    priority: NOTIFICATION_PRIORITIES.MEDIUM,
    defaultEnabled: true,
    defaultRoles: {
      [USER_ROLES.ADMIN]: true,
      [USER_ROLES.TEAM_MANAGER]: true,
      [USER_ROLES.TEAM_MEMBER]: true,
    },
    recipientStrategy: 'explicit',
  },
  {
    key: 'system_integration_error',
    label: 'Integration / system error',
    description: 'Gmail, Redis queue, Importerr API or other integration failures.',
    category: NOTIFICATION_CATEGORIES.SYSTEM,
    priority: NOTIFICATION_PRIORITIES.URGENT,
    defaultEnabled: true,
    defaultRoles: {
      [USER_ROLES.ADMIN]: true,
      [USER_ROLES.TEAM_MANAGER]: false,
      [USER_ROLES.TEAM_MEMBER]: false,
    },
    recipientStrategy: 'all_admins',
  },
];

const catalogByKey = () => new Map(NOTIFICATION_CATALOG.map((item) => [item.key, item]));

function getCatalogEntry(key) {
  return NOTIFICATION_CATALOG.find((item) => item.key === key) || null;
}

module.exports = {
  NOTIFICATION_CATALOG,
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_PRIORITIES,
  catalogByKey,
  getCatalogEntry,
};
