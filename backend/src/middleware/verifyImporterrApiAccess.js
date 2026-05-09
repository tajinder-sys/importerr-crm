const jwt = require('jsonwebtoken');
const { sendUnauthorized, sendServerError } = require('../utils/responseHandler');

const getSecret = () => String(process.env.INTERNAL_JWT_SECRET || process.env.JWT_SECRET || '').trim();
const getExpectedApiKey = () => String(process.env.INTERNAL_SERVICE_API_KEY || '').trim();

const getBearerToken = (req) => {
  const authHeader = String(req.header('Authorization') || '');
  if (!authHeader.toLowerCase().startsWith('bearer ')) return '';
  return authHeader.slice(7).trim();
};

const verifyImporterrApiAccess = (req, res, next) => {
  const expectedApiKey = getExpectedApiKey();
  const providedApiKey = String(req.header('x-api-key') || '').trim();

  if (expectedApiKey && providedApiKey && providedApiKey === expectedApiKey) {
    return next();
  }

  const token = getBearerToken(req);
  if (!token) {
    return sendUnauthorized(res, 'Missing API credentials');
  }

  const secret = getSecret();
  if (!secret) {
    return sendServerError(res, 'INTERNAL_JWT_SECRET is not configured');
  }

  try {
    const decoded = jwt.verify(token, secret);
    req.importerrAuth = decoded;
    return next();
  } catch (_error) {
    return sendUnauthorized(res, 'Invalid or expired token');
  }
};

module.exports = verifyImporterrApiAccess;
