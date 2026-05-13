/**
 * Application constants
 */

const USER_ROLES = {
  ADMIN: 'admin',
  TEAM_MANAGER: 'team_manager',
  TEAM_MEMBER: 'team_member'
};

const TEAM_ROLES = {
  LEAD: 'lead',
  MEMBER: 'member'
};

const TEAM_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ARCHIVED: 'archived'
};

/** Same values as Task model `priority` (lead routing / workload). */
const TASK_PRIORITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent'
};

const LEAD_SOURCES = {
  EMAIL: 'email',
  WHATSAPP: 'whatsapp',
  META_ADS: 'meta_ads',
  PHONE: 'phone',
  IMPORTERR_INQUIRY: 'importerr_inquiry',
  IMPORTERR_TICKET: 'importerr_ticket',
  IMPORTERR_CONTACT: 'importerr_contact',
};

const LEAD_STATUSES = {
  NEW: 'new',
  CONTACTED: 'contacted',
  INTERESTED: 'interested',
  NEGOTIATION: 'negotiation',
  CONVERTED: 'converted',
  REPEAT_CUSTOMER: 'repeat_customer',
  LOST: 'lost'
};

const ASSIGNMENT_TYPES = {
  ROUND_ROBIN: 'round_robin',
  WORKLOAD_BASED: 'workload_based',
  SOURCE_BASED: 'source_based',
  VALUE_BASED: 'value_based',
  MANUAL: 'manual'
};

const ACTIVITY_TYPES = {
  LEAD_CREATED: 'lead_created',
  LEAD_UPDATED: 'lead_updated',
  LEAD_ASSIGNED: 'lead_assigned',
  STATUS_UPDATED: 'status_updated',
  NOTE_ADDED: 'note_added',
  FILE_ATTACHED: 'file_attached',
  COMMUNICATION_SENT: 'communication_sent',
  LEAD_CONVERTED: 'lead_converted',
  QUOTE_SENT: 'lead_quote_sent',
  QUOTE_RESENT: 'lead_quote_resent',
  STAGE_CHANGED: 'stage_changed'
};

const COMMUNICATION_SOURCES = {
  WHATSAPP: LEAD_SOURCES.WHATSAPP,
  EMAIL: LEAD_SOURCES.EMAIL,
  IMPORTERR_INQUIRY: LEAD_SOURCES.IMPORTERR_INQUIRY,
  IMPORTERR_CONTACT: LEAD_SOURCES.IMPORTERR_CONTACT,
  IMPORTERR_TICKET: LEAD_SOURCES.IMPORTERR_TICKET,
  META_ADS: LEAD_SOURCES.META_ADS,
  PHONE: LEAD_SOURCES.PHONE,
};

const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500
};

const PRODUCT_API_ROUTES = {
  USER_BY_ID: '/users/{userId}',
  SELLERS_LIST: '/users/sellers',
  PRODUCT_BY_SKU: '/products/sku/{sku}',
  PRODUCT_DETAILS: '/products/{productRef}/product-details',
  GET_FINAL_PRICE: '/products/get-final-price',
  CART_BY_INTENT: '/carts/intent/{intentId}',
  PRODUCTS_BY_SKUS: '/products/by-skus',
  CREATE_CART: '/carts',
  APPLY_DISCOUNT: '/carts/{cartId}/discount',
  SEND_QUOTE: '/quotes/send'
};

module.exports = {
  USER_ROLES,
  TEAM_ROLES,
  TEAM_STATUS,
  TASK_PRIORITY_LEVELS,
  LEAD_SOURCES,
  LEAD_STATUSES,
  ASSIGNMENT_TYPES,
  ACTIVITY_TYPES,
  COMMUNICATION_SOURCES,
  HTTP_STATUS,
  PRODUCT_API_ROUTES
};
