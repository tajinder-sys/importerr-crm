/**
 * Shared Redis settings for node-redis, ioredis, and Bull.
 * Prefer REDIS_URL (Upstash: rediss://default:PASSWORD@host:6379).
 * Or REDIS_HOST + REDIS_PORT + REDIS_PASSWORD (TLS auto for *.upstash.io).
 */

function normalizeHostPort(rawHost, rawPort) {
  let host = rawHost.trim();
  let port = Number(rawPort) || 6379;

  if (host.startsWith('redis://') || host.startsWith('rediss://')) {
    const parsed = new URL(host);
    return {
      host: parsed.hostname,
      port: Number(parsed.port) || 6379,
      password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    };
  }

  // REDIS_HOST=hostname:6379 (port accidentally in host)
  const colon = host.lastIndexOf(':');
  if (colon > 0 && /^\d+$/.test(host.slice(colon + 1))) {
    port = Number(host.slice(colon + 1));
    host = host.slice(0, colon);
  }

  return { host, port };
}

function normalizeRedisUrl(url) {
  const trimmed = url.trim();
  if (trimmed.startsWith('redis://') || trimmed.startsWith('rediss://')) {
    return trimmed;
  }
  // REDIS_URL copied without scheme
  if (trimmed.includes('@') && trimmed.includes('upstash.io')) {
    return `rediss://${trimmed.startsWith('default:') ? '' : 'default:'}${trimmed}`;
  }
  return trimmed;
}

function needsTls(hostname, explicitUrl) {
  if (explicitUrl?.startsWith('rediss://')) return true;
  if (process.env.REDIS_TLS === 'true') return true;
  return Boolean(hostname?.endsWith('.upstash.io'));
}

function getRedisConfig() {
  const url = process.env.REDIS_URL?.trim();
  if (url) {
    const parsed = new URL(normalizeRedisUrl(url));
    const config = {
      host: parsed.hostname,
      port: Number(parsed.port) || 6379,
      password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    };
    if (needsTls(parsed.hostname, url)) {
      config.tls = {};
    }
    return config;
  }

  const rawHost = process.env.REDIS_HOST?.trim() || '127.0.0.1';
  if (rawHost.includes(' ')) {
    throw new Error(
      'REDIS_HOST must be hostname only (e.g. gentle-salmon-67395.upstash.io). Put the full URL in REDIS_URL instead.'
    );
  }
  const { host, port, password: urlPassword } = normalizeHostPort(
    rawHost,
    process.env.REDIS_PORT
  );
  const config = {
    host,
    port,
    ...(process.env.REDIS_PASSWORD || urlPassword
      ? { password: process.env.REDIS_PASSWORD || urlPassword }
      : {}),
  };
  if (needsTls(host)) {
    config.tls = {};
  }
  return config;
}

function getRedisUrl() {
  const fromEnv = process.env.REDIS_URL?.trim();
  if (fromEnv) return normalizeRedisUrl(fromEnv);

  const { host, port, password, tls } = getRedisConfig();
  const scheme = tls ? 'rediss' : 'redis';
  const auth = password ? `default:${encodeURIComponent(password)}@` : '';
  return `${scheme}://${auth}${host}:${port}`;
}

function isRedisConfigured() {
  return Boolean(process.env.REDIS_URL?.trim() || process.env.REDIS_HOST?.trim());
}

module.exports = {
  getRedisConfig,
  getRedisUrl,
  isRedisConfigured,
};
