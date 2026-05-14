export const API_ROUTES = {
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    me: '/auth/me'
  },
  users: {
    list: '/users',
    teamAssignable: '/users/team-assignable',
    create: '/users',
    byId: (userId) => `/users/${encodeURIComponent(userId)}`,
    update: (userId) => `/users/${encodeURIComponent(userId)}`,
    updatePassword: (userId) => `/users/${encodeURIComponent(userId)}/password`,
    toggle: (userId) => `/users/${encodeURIComponent(userId)}/toggle`
  },
  leads: {
    list: '/leads',
    unassigned: '/leads/unassigned',
    create: '/leads',
    byId: (leadId) => `/leads/${encodeURIComponent(leadId)}`,
    update: (leadId) => `/leads/${encodeURIComponent(leadId)}`,
    updateStage: (leadId) => `/leads/${encodeURIComponent(leadId)}/stage`,
    communications: (leadId) => `/leads/${encodeURIComponent(leadId)}/communications`,
    notes: {
      list: (leadId) => `/leads/${encodeURIComponent(leadId)}/notes`,
      add: (leadId) => `/leads/${encodeURIComponent(leadId)}/notes`,
      update: (leadId, noteId) => `/leads/${encodeURIComponent(leadId)}/notes/${encodeURIComponent(noteId)}`,
      delete: (leadId, noteId) => `/leads/${encodeURIComponent(leadId)}/notes/${encodeURIComponent(noteId)}`
    }
  },
  importerr: {
    userById: (userId) => `/importerr/users/${encodeURIComponent(userId)}`,
    sellersList: '/importerr/users/sellers',
    productBySku: (sku) => `/importerr/products/sku/${encodeURIComponent(sku)}`,
    productVariantPriceDetails: (productRef) =>
      `/importerr/products/${encodeURIComponent(productRef)}/product-details`,
    finalPriceByOfferId: () => `/importerr/products/get-final-price`,
    sendQuote: () => `/quote/send`
  },
  quote: {
    send: () => `/quote/send`,
    get: (leadId) => `/quote/${encodeURIComponent(leadId)}`
  },
  teams: {
    list: '/teams',
    create: '/teams',
    byId: (id) => `/teams/${encodeURIComponent(id)}`,
    update: (id) => `/teams/${encodeURIComponent(id)}`,
    delete: (id) => `/teams/${encodeURIComponent(id)}`,
    members: (id) => `/teams/${encodeURIComponent(id)}/members`
  },
  teamGroups: {
    list: '/team-groups',
    active: '/team-groups/active',
    create: '/team-groups',
    byId: (id) => `/team-groups/${encodeURIComponent(id)}`,
    update: (id) => `/team-groups/${encodeURIComponent(id)}`,
    delete: (id) => `/team-groups/${encodeURIComponent(id)}`
  },
  templates: {
    list: '/templates',
    create: '/templates',
    aiGenerate: '/templates/ai-generate',
    update: (id) => `/templates/${encodeURIComponent(id)}`,
    delete: (id) => `/templates/${encodeURIComponent(id)}`
  },
  paymentMethods: {
    list: '/payment-methods',
    create: '/payment-methods',
    byId: (id) => `/payment-methods/${encodeURIComponent(id)}`,
    update: (id) => `/payment-methods/${encodeURIComponent(id)}`,
    delete: (id) => `/payment-methods/${encodeURIComponent(id)}`,
    toggle: (id) => `/payment-methods/${encodeURIComponent(id)}/toggle`
  },
  connectedAccounts: {
    list: '/channels/accounts',
    create: '/channels/accounts',
    toggle: (id) => `/channels/accounts/${encodeURIComponent(id)}/toggle`,
    delete: (id) => `/channels/accounts/${encodeURIComponent(id)}`
  },
  pipelines: {
    list: '/pipelines',
    create: '/pipelines',
    byId: (id) => `/pipelines/${encodeURIComponent(id)}`,
    update: (id) => `/pipelines/${encodeURIComponent(id)}`,
    delete: (id) => `/pipelines/${encodeURIComponent(id)}`
  },
  stages: {
    list: '/stages',
    create: '/stages',
    byId: (id) => `/stages/${encodeURIComponent(id)}`,
    update: (id) => `/stages/${encodeURIComponent(id)}`,
    delete: (id) => `/stages/${encodeURIComponent(id)}`,
    toggle: (id) => `/stages/${encodeURIComponent(id)}/toggle`
  },
  dashboard: {
    filters: '/dashboard/filters',
    kpis: '/dashboard/kpis',
    stages: '/dashboard/stages',
    sources: '/dashboard/sources',
    userPerformance: '/dashboard/user-performance',
    tasksSummary: '/dashboard/tasks-summary',
    recentLeads: '/dashboard/recent-leads',
    leadTimeline: '/dashboard/lead-timeline',
    pipelineWinRates: '/dashboard/pipeline-win-rates'
  },
  tasks: {
    list: '/tasks',
    create: '/tasks',
    byId: (id) => `/tasks/${encodeURIComponent(id)}`,
    update: (id) => `/tasks/${encodeURIComponent(id)}`,
    delete: (id) => `/tasks/${encodeURIComponent(id)}`,
    stats: '/tasks/stats',
    addNote: (id) => `/tasks/${encodeURIComponent(id)}/notes`,
    complete: (id) => `/tasks/${encodeURIComponent(id)}/complete`
  },
  sellerAssignments: {
    list: '/seller-assignments',
    upsert: (importerrUserId) => `/seller-assignments/${encodeURIComponent(importerrUserId)}`,
  },
};
