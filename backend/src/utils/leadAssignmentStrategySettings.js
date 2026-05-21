const CrmSetting = require('../models/CrmSetting');

const LEAD_ASSIGNMENT_GROUP = 'lead_assignment';

const SETTING_KEYS = {
  STRATEGY_ORDER: 'lead_assignment.strategy_order',
};

/** Order in which assignLeadWithAI tries strategies (first match wins). */
const STRATEGY_IDS = {
  CONNECTED_ACCOUNT: 'connected_account',
  PREVIOUS_LEAD_HISTORY: 'previous_lead_history',
  SELLER_ASSIGNMENT: 'seller_assignment',
  AI_FALLBACK: 'ai_fallback',
};

const DEFAULT_STRATEGY_ORDER = [
  STRATEGY_IDS.CONNECTED_ACCOUNT,
  STRATEGY_IDS.PREVIOUS_LEAD_HISTORY,
  STRATEGY_IDS.SELLER_ASSIGNMENT,
  STRATEGY_IDS.AI_FALLBACK,
];

const STRATEGY_META = {
  [STRATEGY_IDS.CONNECTED_ACCOUNT]: {
    label: 'Connected account',
    description: 'Round-robin among users linked to the lead’s connected account.',
  },
  [STRATEGY_IDS.PREVIOUS_LEAD_HISTORY]: {
    label: 'Previous lead (same email)',
    description: 'Reuse assignee and pipeline from the most recent lead with the same email.',
  },
  [STRATEGY_IDS.SELLER_ASSIGNMENT]: {
    label: 'Seller mapping',
    description: 'Assign using active Importerr seller → CRM user mapping.',
  },
  [STRATEGY_IDS.AI_FALLBACK]: {
    label: 'AI fallback',
    description: 'Match pipeline with AI, then pick least-loaded member on that pipeline’s team.',
  },
};

const DEFAULT_SETTINGS = [
  {
    key: SETTING_KEYS.STRATEGY_ORDER,
    value: JSON.stringify(DEFAULT_STRATEGY_ORDER),
    type: 'json',
    label: 'Assignment strategy order',
    description:
      'Order in which auto-assignment strategies run. The first strategy that can assign the lead is used.',
    group: LEAD_ASSIGNMENT_GROUP,
  },
];

const parseStrategyOrder = (raw) => {
  if (!raw || !String(raw).trim()) return [...DEFAULT_STRATEGY_ORDER];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...DEFAULT_STRATEGY_ORDER];
    const valid = parsed.filter((id) => Object.values(STRATEGY_IDS).includes(id));
    const missing = DEFAULT_STRATEGY_ORDER.filter((id) => !valid.includes(id));
    return [...valid, ...missing];
  } catch {
    return [...DEFAULT_STRATEGY_ORDER];
  }
};

const ensureLeadAssignmentStrategySettings = async () => {
  for (const def of DEFAULT_SETTINGS) {
    await CrmSetting.updateOne({ key: def.key }, { $setOnInsert: def }, { upsert: true });
  }
};

const getAssignmentStrategyOrder = async () => {
  await ensureLeadAssignmentStrategySettings();
  const row = await CrmSetting.findOne({ key: SETTING_KEYS.STRATEGY_ORDER }).lean();
  return parseStrategyOrder(row?.value);
};

const getAssignmentStrategySettingsPayload = async () => {
  await ensureLeadAssignmentStrategySettings();
  const order = await getAssignmentStrategyOrder();
  return {
    order,
    strategies: order.map((id) => ({
      id,
      ...STRATEGY_META[id],
    })),
    allStrategies: DEFAULT_STRATEGY_ORDER.map((id) => ({
      id,
      ...STRATEGY_META[id],
    })),
  };
};

module.exports = {
  LEAD_ASSIGNMENT_GROUP,
  SETTING_KEYS,
  STRATEGY_IDS,
  DEFAULT_STRATEGY_ORDER,
  STRATEGY_META,
  ensureLeadAssignmentStrategySettings,
  getAssignmentStrategyOrder,
  getAssignmentStrategySettingsPayload,
  parseStrategyOrder,
};
