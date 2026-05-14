const logger = require('../utils/logger');

const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const ms = Date.now() - start;
    const meta = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      ms,
      ip: req.ip || req.headers['x-forwarded-for'],
      user: req.user?._id || null,
    };

    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    logger[level](`${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`, meta);
  });

  next();
};

module.exports = requestLogger;
