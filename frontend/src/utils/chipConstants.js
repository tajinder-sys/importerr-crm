export const CHIP_VARIANTS = {
  STATUS: {
    new: 'primary',
    contacted: 'warning',
    interested: 'purple',
    negotiation: 'orange',
    converted: 'success',
    lost: 'danger'
  },
  SOURCE: {
    importerr_inquiry: 'primary',
    whatsapp: 'success',
    meta_ads: 'purple',
    email: 'warning',
    phone: 'orange',
  },
  ROLE: {
    team_member: 'neutral',
    team_manager: 'purple',
    admin: 'danger'
  },
  TEAM_STATUS: {
    active: 'success',
    inactive: 'warning',
    archived: 'danger'
  },
  PRIORITY: {
    low: 'neutral',
    medium: 'warning',
    high: 'orange',
    urgent: 'danger',
  },
  ORDER_STATUS: {
    pending: 'warning',
    processing: 'primary',
    shipped: 'purple',
    delivered: 'success',
    completed: 'success',
    cancelled: 'danger',
    canceled: 'danger',
    refunded: 'orange',
    failed: 'danger',
    paid: 'success',
  },
};

export const getChipVariant = (group, value, fallback = 'neutral') => {
  const key = String(value || '')
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  return CHIP_VARIANTS[group]?.[key] || fallback;
};
