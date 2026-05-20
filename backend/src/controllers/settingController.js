const CrmSetting = require('../models/CrmSetting');
const { SETTING_TYPES } = require('../models/CrmSetting');
const {
  ABANDONED_SETTINGS_GROUP,
  ensureAbandonedQueueSettings,
  parseSettingNumber,
  ABANDONED_SETTINGS_HIDDEN_FROM_UI,
} = require('../utils/abandonedQueueSettings');
const {
  ensureSystemCronSettings,
  getCronJobIds,
  getJobsWithDbValues,
  updateCronJobSettings,
} = require('../utils/systemCronSettings');
const { getSnapshot } = require('../cron/cronScheduler');
const { runCronHandlerById } = require('../cron/cronJobHandlers');
const { sendSuccess, sendNotFound, sendBadRequest, sendServerError } = require('../utils/responseHandler');

const coerceValueForType = (value, type) => {
  const raw = value === undefined || value === null ? '' : String(value);
  if (type === 'number') {
    const n = parseSettingNumber(raw, NaN);
    if (Number.isNaN(n)) return { error: 'Invalid number value' };
    return { stored: String(n) };
  }
  if (type === 'boolean') {
    const truthy = ['true', '1', 'yes', 'on'].includes(raw.toLowerCase());
    return { stored: truthy ? 'true' : 'false' };
  }
  if (type === 'json') {
    try {
      JSON.parse(raw || '{}');
      return { stored: raw || '{}' };
    } catch {
      return { error: 'Invalid JSON value' };
    }
  }
  return { stored: raw };
};

const listSettings = async (req, res) => {
  try {
    await ensureAbandonedQueueSettings();
    const filter = {};
    if (req.query.group) {
      filter.group = String(req.query.group);
    }
    const settings = await CrmSetting.find(filter).sort({ group: 1, key: 1 }).lean();
    return sendSuccess(res, 'Settings retrieved', settings);
  } catch (error) {
    console.error('listSettings error:', error);
    return sendServerError(res, error.message || 'Failed to list settings');
  }
};

const updateSetting = async (req, res) => {
  try {
    const key = String(req.params.key || '').trim();
    if (!key) {
      return sendBadRequest(res, 'key is required');
    }

    const existing = await CrmSetting.findOne({ key });
    if (!existing) {
      return sendNotFound(res, 'Setting not found');
    }

    const type = req.body?.type && SETTING_TYPES.includes(req.body.type)
      ? req.body.type
      : existing.type;
    const { value } = req.body;
    if (value === undefined) {
      return sendBadRequest(res, 'value is required');
    }

    const coerced = coerceValueForType(value, type);
    if (coerced.error) {
      return sendBadRequest(res, coerced.error);
    }

    existing.value = coerced.stored;
    existing.type = type;
    if (req.body?.label !== undefined) existing.label = String(req.body.label);
    if (req.body?.description !== undefined) existing.description = String(req.body.description);
    await existing.save();

    return sendSuccess(res, 'Setting updated', existing);
  } catch (error) {
    console.error('updateSetting error:', error);
    return sendServerError(res, error.message || 'Failed to update setting');
  }
};

const listAbandonedQueueSettings = async (_req, res) => {
  try {
    await ensureAbandonedQueueSettings();
    const settings = await CrmSetting.find({ group: ABANDONED_SETTINGS_GROUP })
      .sort({ key: 1 })
      .lean();
    const filtered = settings.filter((s) => !ABANDONED_SETTINGS_HIDDEN_FROM_UI.has(s.key));
    return sendSuccess(res, 'Abandoned queue settings retrieved', filtered);
  } catch (error) {
    console.error('listAbandonedQueueSettings error:', error);
    return sendServerError(res, error.message || 'Failed to list abandoned queue settings');
  }
};

const listSystemCronJobs = async (_req, res) => {
  try {
    await ensureSystemCronSettings();
    const jobs = await getJobsWithDbValues();
    const snap = getSnapshot();
    const snapById = new Map(snap.map((s) => [s.id, s]));
    const merged = jobs.map((j) => ({
      ...j,
      lastRunAt: snapById.get(j.id)?.lastRunAt ?? null,
      running: snapById.get(j.id)?.running ?? false,
    }));
    return sendSuccess(res, 'System cron jobs', { jobs: merged });
  } catch (error) {
    console.error('listSystemCronJobs error:', error);
    return sendServerError(res, error.message || 'Failed to list cron jobs');
  }
};

const updateSystemCronJob = async (req, res) => {
  try {
    const jobId = String(req.params.jobId || '').trim();
    if (!getCronJobIds().includes(jobId)) {
      return sendBadRequest(res, 'Unknown cron job id');
    }
    const { enabled, intervalMinutes } = req.body || {};
    if (enabled === undefined && intervalMinutes === undefined) {
      return sendBadRequest(res, 'Provide enabled and/or intervalMinutes');
    }
    if (enabled !== undefined && typeof enabled !== 'boolean') {
      return sendBadRequest(res, 'enabled must be a boolean');
    }
    if (intervalMinutes !== undefined) {
      const n = Number(intervalMinutes);
      if (!Number.isFinite(n)) {
        return sendBadRequest(res, 'intervalMinutes must be a number');
      }
    }
    const result = await updateCronJobSettings(jobId, { enabled, intervalMinutes });
    if (!result.ok) {
      return sendBadRequest(res, result.error || 'Update failed');
    }
    const jobs = await getJobsWithDbValues();
    const updated = jobs.find((j) => j.id === jobId);
    return sendSuccess(res, 'Cron job updated', updated);
  } catch (error) {
    console.error('updateSystemCronJob error:', error);
    return sendServerError(res, error.message || 'Failed to update cron job');
  }
};

const runSystemCronJobNow = async (req, res) => {
  try {
    const jobId = String(req.params.jobId || '').trim();
    if (!getCronJobIds().includes(jobId)) {
      return sendBadRequest(res, 'Unknown cron job id');
    }
    const summary = await runCronHandlerById(jobId);
    return sendSuccess(res, 'Cron job run finished', summary);
  } catch (error) {
    console.error('runSystemCronJobNow error:', error);
    if (error.code === 'UNKNOWN_CRON_JOB') {
      return sendBadRequest(res, error.message);
    }
    return sendServerError(res, error.message || 'Cron job run failed');
  }
};

module.exports = {
  listSettings,
  updateSetting,
  listAbandonedQueueSettings,
  listSystemCronJobs,
  updateSystemCronJob,
  runSystemCronJobNow,
};
