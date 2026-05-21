const DashboardSectionConfig = require('../models/DashboardSectionConfig');
const { DASHBOARD_SECTION_DEFAULTS } = require('../utils/dashboardSectionDefaults');

/** Retired sections — hidden from dashboard and admin layout list. */
const HIDDEN_DASHBOARD_SECTION_KEYS = new Set(['recent_leads', 'tasks']);

async function ensureDefaults() {
  const existing = await DashboardSectionConfig.find().lean();
  const byKey = new Map(existing.map((r) => [r.key, r]));

  for (const def of DASHBOARD_SECTION_DEFAULTS) {
    if (!byKey.has(def.key)) {
      await DashboardSectionConfig.create({ ...def });
    }
  }

  const knownKeys = new Set(DASHBOARD_SECTION_DEFAULTS.map((d) => d.key));
  for (const row of existing) {
    if (!knownKeys.has(row.key)) continue;
    const def = DASHBOARD_SECTION_DEFAULTS.find((d) => d.key === row.key);
    if (!def) continue;
    const needsLabel = !row.label || row.label !== def.label;
    if (needsLabel) {
      await DashboardSectionConfig.updateOne(
        { key: row.key },
        { $set: { label: def.label, description: def.description ?? row.description } }
      );
    }
  }

  if (HIDDEN_DASHBOARD_SECTION_KEYS.size) {
    await DashboardSectionConfig.updateMany(
      { key: { $in: [...HIDDEN_DASHBOARD_SECTION_KEYS] } },
      { $set: { visible: false } }
    );
  }
}

async function getSectionsForDashboard() {
  await ensureDefaults();
  const rows = await DashboardSectionConfig.find().sort({ order: 1, key: 1 }).lean();
  return rows
    .filter((r) => !HIDDEN_DASHBOARD_SECTION_KEYS.has(r.key))
    .map((r) => ({
    key: r.key,
    label: r.label,
    description: r.description || '',
    order: r.order,
    visible: Boolean(r.visible),
  }));
}

function buildVisibilityMap(sections) {
  const map = {};
  for (const s of sections) {
    map[s.key] = Boolean(s.visible);
  }
  for (const def of DASHBOARD_SECTION_DEFAULTS) {
    if (map[def.key] === undefined) map[def.key] = true;
  }
  for (const key of HIDDEN_DASHBOARD_SECTION_KEYS) {
    map[key] = false;
  }
  return map;
}

async function getVisibilityMap() {
  const sections = await getSectionsForDashboard();
  return buildVisibilityMap(sections);
}

async function updateSections(updates, adminUserId) {
  if (!Array.isArray(updates) || !updates.length) {
    const err = new Error('sections array is required');
    err.statusCode = 400;
    throw err;
  }

  await ensureDefaults();

  for (const item of updates) {
    const key = item?.key;
    if (!key || typeof key !== 'string') {
      const err = new Error('Each section must have a key');
      err.statusCode = 400;
      throw err;
    }
    const known = DASHBOARD_SECTION_DEFAULTS.find((d) => d.key === key);
    if (!known) {
      const err = new Error(`Unknown section key: ${key}`);
      err.statusCode = 400;
      throw err;
    }

    const patch = { updatedBy: adminUserId || null };
    if (typeof item.visible === 'boolean') patch.visible = item.visible;
    if (typeof item.order === 'number' && Number.isFinite(item.order)) {
      patch.order = Math.max(0, Math.floor(item.order));
    }
    if (typeof item.label === 'string' && item.label.trim()) patch.label = item.label.trim();

    await DashboardSectionConfig.updateOne({ key }, { $set: patch });
  }

  return getSectionsForDashboard();
}

async function resetSectionsToDefaults(adminUserId) {
  await ensureDefaults();

  for (const def of DASHBOARD_SECTION_DEFAULTS) {
    await DashboardSectionConfig.updateOne(
      { key: def.key },
      {
        $set: {
          label: def.label,
          description: def.description ?? '',
          order: def.order,
          visible: def.visible !== false,
          updatedBy: adminUserId || null,
        },
      }
    );
  }

  return getSectionsForDashboard();
}

module.exports = {
  getSectionsForDashboard,
  getVisibilityMap,
  updateSections,
  resetSectionsToDefaults,
  buildVisibilityMap,
};
