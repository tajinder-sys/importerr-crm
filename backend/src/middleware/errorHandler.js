const { sendServerError } = require('../utils/responseHandler');

const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return sendBadRequest(res, 'Validation failed', errors);
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return sendBadRequest(res, `${field} already exists`);
  }

  if (err.name === 'JsonWebTokenError') {
    return sendUnauthorized(res, 'Invalid token');
  }

  if (err.name === 'TokenExpiredError') {
    return sendUnauthorized(res, 'Token expired');
  }

  return sendServerError(res, 'Internal server error');
};

module.exports = errorHandler;
