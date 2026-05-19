const NotificationPolicy = require('../models/NotificationPolicy');
const { NOTIFICATION_CATALOG, catalogByKey } = require('../utils/notificationCatalog');

function mapPolicyRow(row) {
  return {
    key: row.key,
    label: row.label,
    description: row.description || '',
    category: row.category,
    priority: row.priority,
    order: row.order,
    enabled: Boolean(row.enabled),
    roles: {
      admin: Boolean(row.roles?.admin),
      team_manager: Boolean(row.roles?.team_manager),
      team_member: Boolean(row.roles?.team_member),
    },
  };
}

async function ensureDefaults() {
  const existing = await NotificationPolicy.find().lean();
  const byKey = new Map(existing.map((r) => [r.key, r]));

  for (let i = 0; i < NOTIFICATION_CATALOG.length; i += 1) {
    const def = NOTIFICATION_CATALOG[i];
    if (!byKey.has(def.key)) {
      await NotificationPolicy.create({
        key: def.key,
        label: def.label,
        description: def.description ?? '',
        category: def.category,
        priority: def.priority,
        order: i,
        enabled: def.defaultEnabled !== false,
        roles: { ...def.defaultRoles },
      });
    }
  }

  const known = catalogByKey();
  for (const row of existing) {
    const def = known.get(row.key);
    if (!def) continue;
    const patch = {};
    if (!row.label || row.label !== def.label) patch.label = def.label;
    if (row.description !== (def.description ?? '')) patch.description = def.description ?? '';
    if (row.category !== def.category) patch.category = def.category;
    if (Object.keys(patch).length) {
      await NotificationPolicy.updateOne({ key: row.key }, { $set: patch });
    }
  }
}

async function getPolicies() {
  await ensureDefaults();
  const rows = await NotificationPolicy.find().sort({ order: 1, key: 1 }).lean();
  return rows.map(mapPolicyRow);
}

async function getPolicyMap() {
  const policies = await getPolicies();
  return new Map(policies.map((p) => [p.key, p]));
}

async function getPolicyForType(typeKey) {
  await ensureDefaults();
  const row = await NotificationPolicy.findOne({ key: typeKey }).lean();
  if (!row) return null;
  return mapPolicyRow(row);
}

async function updatePolicies(updates, adminUserId) {
  if (!Array.isArray(updates) || !updates.length) {
    const err = new Error('policies array is required');
    err.statusCode = 400;
    throw err;
  }

  await ensureDefaults();
  const known = catalogByKey();

  for (const item of updates) {
    const key = item?.key;
    if (!key || typeof key !== 'string') {
      const err = new Error('Each policy must have a key');
      err.statusCode = 400;
      throw err;
    }
    if (!known.has(key)) {
      const err = new Error(`Unknown notification type: ${key}`);
      err.statusCode = 400;
      throw err;
    }

    const patch = { updatedBy: adminUserId || null };
    if (typeof item.enabled === 'boolean') patch.enabled = item.enabled;
    if (item.roles && typeof item.roles === 'object') {
      patch.roles = {};
      if (typeof item.roles.admin === 'boolean') patch.roles.admin = item.roles.admin;
      if (typeof item.roles.team_manager === 'boolean') {
        patch.roles.team_manager = item.roles.team_manager;
      }
      if (typeof item.roles.team_member === 'boolean') {
        patch.roles.team_member = item.roles.team_member;
      }
    }

    await NotificationPolicy.updateOne({ key }, { $set: patch });
  }

  return getPolicies();
}

async function resetPoliciesToDefaults(adminUserId) {
  await ensureDefaults();

  for (let i = 0; i < NOTIFICATION_CATALOG.length; i += 1) {
    const def = NOTIFICATION_CATALOG[i];
    await NotificationPolicy.updateOne(
      { key: def.key },
      {
        $set: {
          label: def.label,
          description: def.description ?? '',
          category: def.category,
          priority: def.priority,
          order: i,
          enabled: def.defaultEnabled !== false,
          roles: { ...def.defaultRoles },
          updatedBy: adminUserId || null,
        },
      }
    );
  }

  return getPolicies();
}

module.exports = {
  ensureDefaults,
  getPolicies,
  getPolicyMap,
  getPolicyForType,
  updatePolicies,
  resetPoliciesToDefaults,
  mapPolicyRow,
};
