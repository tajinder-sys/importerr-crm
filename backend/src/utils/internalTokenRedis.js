const Redis = require('ioredis');
const { getRedisConfig } = require('../config/redis');

const clientOptions = {
  lazyConnect: true,
  maxRetriesPerRequest: 2,
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

  const url = process.env.REDIS_URL?.trim();
  redisClient = url
    ? new Redis(url, clientOptions)
    : new Redis({ ...getRedisConfig(), ...clientOptions });
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
