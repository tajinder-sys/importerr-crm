const Bull = require('bull');
const Redis = require('ioredis');
const { getRedisConfig, getRedisUrl, isRedisConfigured } = require('../config/redis');

// Bull parses URLs itself but drops TLS for rediss:// — use ioredis with full URL.
const emailQueue = new Bull(
  'email-lead-ingestion',
  isRedisConfigured()
    ? {
        createClient(type) {
          const shared = { enableReadyCheck: false };
          const extra =
            type === 'bclient' || type === 'subscriber'
              ? { maxRetriesPerRequest: null }
              : {};
          return new Redis(getRedisUrl(), { ...shared, ...extra });
        },
      }
    : { redis: getRedisConfig() }
);

let lastQueueErrorAt = 0;

emailQueue.on('error', (err) => {
  console.error('[EmailQueue] Error:', err.message);
  const now = Date.now();
  if (now - lastQueueErrorAt < 300000) return;
  lastQueueErrorAt = now;
  try {
    const NotificationService = require('../services/NotificationService');
    NotificationService.dispatch({
      type: 'system_integration_error',
      title: 'Email queue error',
      body: err.message,
      dedupeKey: `system_integration_error:email_queue:${Math.floor(now / 300000)}`,
    }).catch(() => {});
  } catch (_) {
    // ignore
  }
});

module.exports = emailQueue;
