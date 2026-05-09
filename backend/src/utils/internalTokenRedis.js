const Redis = require('ioredis');

const redisConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  lazyConnect: true,
  maxRetriesPerRequest: 2
};

let redisClient = null;
let connectPromise = null;

const getRedisClient = async () => {
  if (redisClient?.status === 'ready') {
    return redisClient;
  }

  if (connectPromise) {
    return connectPromise;
  }

  redisClient = new Redis(redisConfig);
  connectPromise = redisClient
    .connect()
    .then(() => redisClient)
    .catch(() => null)
    .finally(() => {
      connectPromise = null;
    });

  return connectPromise;
};

const getValue = async (key) => {
  const redis = await getRedisClient();
  if (!redis) return '';
  const value = await redis.get(key);
  return String(value || '');
};

const setValue = async (key, value, ttlSeconds = 900) => {
  const redis = await getRedisClient();
  if (!redis) return false;
  await redis.set(key, String(value || ''), 'EX', Math.max(1, Number(ttlSeconds)));
  return true;
};

const delValue = async (key) => {
  const redis = await getRedisClient();
  if (!redis) return false;
  await redis.del(key);
  return true;
};

module.exports = {
  getValue,
  setValue,
  delValue
};
