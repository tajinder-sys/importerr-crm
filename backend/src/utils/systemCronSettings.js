const CrmSetting = require('../models/CrmSetting');

const SYSTEM_CRON_GROUP = 'system_cron';

/** Registered jobs (extend here + cronJobHandlers to add a cron). Order matters: same tick runs top → bottom. */
const CRON_JOBS = [
  {
    id: 'abandoned_reminder_email',
    enabledKey: 'cron_job_abandoned_reminder_email_enabled',
    intervalKey: 'cron_job_abandoned_reminder_email_interval_minutes',
    defaultEnabled: false,
    defaultIntervalMinutes: 10,
    minIntervalMinutes: 1,
    maxIntervalMinutes: 24 * 60,
    label: 'Abandoned reminder emails',
    description:
      'Sends abandoned cart / checkout reminder emails from this CRM when SMTP is configured (limits and templates under Abandoned → Settings).',
    legacyEnabledKey: 'abandoned_reminder_cron_enabled',
  },
  {
    id: 'abandoned_queue_lead',
    enabledKey: 'cron_job_abandoned_queue_lead_enabled',
    intervalKey: 'cron_job_abandoned_queue_lead_interval_minutes',
    defaultEnabled: true,
    defaultIntervalMinutes: 15,
    minIntervalMinutes: 1,
    maxIntervalMinutes: 24 * 60,
    label: 'Abandoned queue → CRM leads',
    description:
      'Periodically creates and assigns CRM leads from eligible abandoned checkout queue rows (batch size is set under Abandoned → Settings).',
    legacyEnabledKey: 'abandoned_cron_enabled',
  },
];

const ENV_KILL = {
  abandoned_queue_lead: 'ABANDONED_QUEUE_CRON_ENABLED',
  abandoned_reminder_email: 'ABANDONED_REMINDER_CRON_ENABLED',
};

const parseBool = (raw, fallback = false) => {
  if (raw === undefined || raw === null) return fallback;
  return ['true', '1', 'yes', 'on'].includes(String(raw).toLowerCase());
};

const parseInterval = (raw, def, min, max) => {
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n) || n < min) return min;
  return Math.min(max, n);
};

const findJob = (jobId) => CRON_JOBS.find((j) => j.id === jobId) || null;

const isCronJobEnvForcedOff = (jobId) => {
  const envKey = ENV_KILL[jobId];
  if (!envKey) return false;
  return String(process.env[envKey] || '').toLowerCase() === 'false';
};

const isCronJobEnvForcedOn = (jobId) => {
  const envKey = ENV_KILL[jobId];
  if (!envKey) return false;
  return String(process.env[envKey] || '').toLowerCase() === 'true';
};

/**
 * DB value only (legacy abandoned_* keys used only when system_cron row missing).
 */
const getCronJobDbEnabled = async (jobId) => {
  const def = findJob(jobId);
  if (!def) return false;
  const row = await CrmSetting.findOne({ key: def.enabledKey }).lean();
  if (row) return parseBool(row.value, def.defaultEnabled);
  if (def.legacyEnabledKey) {
    const legacy = await CrmSetting.findOne({ key: def.legacyEnabledKey }).lean();
    if (legacy) return parseBool(legacy.value, def.defaultEnabled);
  }
  return def.defaultEnabled;
};

/**
 * Respects per-job env kill/force (same semantics as previous abandoned crons).
 */
const isCronJobEffectiveEnabled = async (jobId) => {
  if (isCronJobEnvForcedOff(jobId)) return false;
  if (isCronJobEnvForcedOn(jobId)) return true;
  return getCronJobDbEnabled(jobId);
};

const getCronJobIntervalMinutes = async (jobId) => {
  const def = findJob(jobId);
  if (!def) return 15;
  const row = await CrmSetting.findOne({ key: def.intervalKey }).lean();
  return parseInterval(row?.value, def.defaultIntervalMinutes, def.minIntervalMinutes, def.maxIntervalMinutes);
};

const ensureSystemCronSettings = async () => {
  for (const job of CRON_JOBS) {
    const enabledRow = await CrmSetting.findOne({ key: job.enabledKey }).select('_id').lean();
    if (!enabledRow) {
      let seed = job.defaultEnabled;
      if (job.legacyEnabledKey) {
        const legacy = await CrmSetting.findOne({ key: job.legacyEnabledKey }).lean();
        if (legacy) seed = parseBool(legacy.value, job.defaultEnabled);
      }
      await CrmSetting.create({
        key: job.enabledKey,
        value: seed ? 'true' : 'false',
        type: 'boolean',
        label: `${job.label} — enabled`,
        description: 'Controlled from Settings → Crons.',
        group: SYSTEM_CRON_GROUP,
      });
    }

    const intervalRow = await CrmSetting.findOne({ key: job.intervalKey }).select('_id').lean();
    if (!intervalRow) {
      await CrmSetting.create({
        key: job.intervalKey,
        value: String(job.defaultIntervalMinutes),
        type: 'number',
        label: `${job.label} — interval (minutes)`,
        description: 'How often this job is eligible to run.',
        group: SYSTEM_CRON_GROUP,
      });
    }
  }
};

const getCronJobIds = () => CRON_JOBS.map((j) => j.id);

const getJobsWithDbValues = async () => {
  await ensureSystemCronSettings();
  const keys = CRON_JOBS.flatMap((j) => [j.enabledKey, j.intervalKey]);
  const rows = await CrmSetting.find({ key: { $in: keys } }).lean();
  const byKey = new Map(rows.map((r) => [r.key, r.value]));

  return CRON_JOBS.map((job) => {
    const enabled = parseBool(byKey.get(job.enabledKey), job.defaultEnabled);
    const intervalMinutes = parseInterval(
      byKey.get(job.intervalKey),
      job.defaultIntervalMinutes,
      job.minIntervalMinutes,
      job.maxIntervalMinutes
    );
    return {
      id: job.id,
      label: job.label,
      description: job.description,
      enabled,
      intervalMinutes,
      minIntervalMinutes: job.minIntervalMinutes,
      maxIntervalMinutes: job.maxIntervalMinutes,
      envKillKey: ENV_KILL[job.id] || null,
      envForcedOff: isCronJobEnvForcedOff(job.id),
      envForcedOn: isCronJobEnvForcedOn(job.id),
    };
  });
};

const updateCronJobSettings = async (jobId, { enabled, intervalMinutes } = {}) => {
  const def = findJob(jobId);
  if (!def) return { ok: false, error: 'unknown_job' };

  if (enabled !== undefined) {
    const row = await CrmSetting.findOne({ key: def.enabledKey });
    if (!row) return { ok: false, error: 'missing_enabled_row' };
    row.value = Boolean(enabled) ? 'true' : 'false';
    row.type = 'boolean';
    await row.save();
  }

  if (intervalMinutes !== undefined) {
    const row = await CrmSetting.findOne({ key: def.intervalKey });
    if (!row) return { ok: false, error: 'missing_interval_row' };
    const n = parseInterval(intervalMinutes, def.defaultIntervalMinutes, def.minIntervalMinutes, def.maxIntervalMinutes);
    row.value = String(n);
    row.type = 'number';
    await row.save();
  }

  return { ok: true };
};

module.exports = {
  SYSTEM_CRON_GROUP,
  CRON_JOBS,
  ensureSystemCronSettings,
  getCronJobIds,
  getCronJobDbEnabled,
  isCronJobEffectiveEnabled,
  getCronJobIntervalMinutes,
  getJobsWithDbValues,
  updateCronJobSettings,
  isCronJobEnvForcedOff,
  isCronJobEnvForcedOn,
};
