const { processAbandonedQueueBatch } = require('../services/abandonedQueueProcessorService');
const { processAbandonedReminderEmailBatch } = require('../services/abandonedReminderEmailService');

const HANDLERS = {
  abandoned_queue_lead: () => processAbandonedQueueBatch(),
  abandoned_reminder_email: () => processAbandonedReminderEmailBatch(),
};

/**
 * Run a registered cron job by id (used by scheduler and manual “Run now”).
 */
const runCronHandlerById = async (jobId) => {
  const fn = HANDLERS[jobId];
  if (!fn) {
    const err = new Error(`Unknown cron job: ${jobId}`);
    err.code = 'UNKNOWN_CRON_JOB';
    throw err;
  }
  return fn();
};

module.exports = {
  HANDLERS,
  runCronHandlerById,
};
