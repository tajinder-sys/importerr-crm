const logger = require('../utils/logger');
const {
  CRON_JOBS,
  ensureSystemCronSettings,
  isCronJobEffectiveEnabled,
  getCronJobIntervalMinutes,
} = require('../utils/systemCronSettings');
const { runCronHandlerById } = require('./cronJobHandlers');

const TICK_MS = 10_000;
const BOOTSTRAP_DELAY_MS = 60_000;

let intervalHandle = null;
const running = new Map();
/** @type {Map<string, number>} */
const lastRunAt = new Map();

const getSnapshot = () =>
  CRON_JOBS.map((job) => ({
    id: job.id,
    lastRunAt: lastRunAt.has(job.id) ? new Date(lastRunAt.get(job.id)).toISOString() : null,
    running: Boolean(running.get(job.id)),
  }));

const tick = async () => {
  try {
    await ensureSystemCronSettings();
  } catch (e) {
    logger.error(`[CronScheduler] ensureSystemCronSettings: ${e.message}`);
    return;
  }

  const now = Date.now();
  for (const job of CRON_JOBS) {
    if (running.get(job.id)) continue;

    let effectiveEnabled = false;
    let intervalMin = job.defaultIntervalMinutes;
    try {
      effectiveEnabled = await isCronJobEffectiveEnabled(job.id);
      intervalMin = await getCronJobIntervalMinutes(job.id);
    } catch (e) {
      logger.warn(`[CronScheduler] ${job.id} config read failed: ${e.message}`);
      continue;
    }

    if (!effectiveEnabled) continue;

    const intervalMs = Math.max(60_000, intervalMin * 60_000);
    const prev = lastRunAt.get(job.id);
    if (prev && now - prev < intervalMs) continue;

    running.set(job.id, true);
    try {
      await runCronHandlerById(job.id);
      lastRunAt.set(job.id, Date.now());
    } catch (err) {
      logger.error(`[CronScheduler] ${job.id}: ${err.message}`);
    } finally {
      running.set(job.id, false);
    }
  }
};

const startCronScheduler = () => {
  if (String(process.env.CRM_CRON_SCHEDULER_ENABLED || '').toLowerCase() === 'false') {
    logger.info('[CronScheduler] disabled via CRM_CRON_SCHEDULER_ENABLED=false');
    return;
  }

  logger.info(`[CronScheduler] master tick every ${TICK_MS / 1000}s, bootstrap delay ${BOOTSTRAP_DELAY_MS / 1000}s`);

  for (const job of CRON_JOBS) {
    lastRunAt.set(job.id, Date.now());
  }

  setTimeout(() => {
    tick().catch((e) => logger.error(`[CronScheduler] tick: ${e.message}`));
    intervalHandle = setInterval(() => {
      tick().catch((e) => logger.error(`[CronScheduler] tick: ${e.message}`));
    }, TICK_MS);
  }, BOOTSTRAP_DELAY_MS);
};

const stopCronScheduler = () => {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
};

module.exports = {
  startCronScheduler,
  stopCronScheduler,
  getSnapshot,
};
