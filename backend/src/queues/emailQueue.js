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

emailQueue.on('error', (err) => {
  console.error('[EmailQueue] Error:', err.message);
});

module.exports = emailQueue;
