const Bull = require('bull');

const redisConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: Number(process.env.REDIS_PORT) || 6379,
  ...(process.env.REDIS_PASSWORD ? { password: process.env.REDIS_PASSWORD } : {}),
};

const emailQueue = new Bull('email-lead-ingestion', { redis: redisConfig });

emailQueue.on('error', (err) => {
  console.error('[EmailQueue] Error:', err.message);
});

module.exports = emailQueue;
