const express = require('express');
const jwt = require('jsonwebtoken');
const verifyImporterrApiAccess = require('../../middleware/verifyImporterrApiAccess');
const { sendBadRequest, sendSuccess, sendUnauthorized } = require('../../utils/responseHandler');
const { getQuoteByRefrenceId } = require('../../controllers/callByImporterr/quote');

const router = express.Router();
const TOKEN_EXPIRY = process.env.INTERNAL_JWT_EXPIRY || '15m';
const SERVICE_NAME = process.env.INTERNAL_SERVICE_NAME || 'crm';

const getSecret = () => String(process.env.INTERNAL_JWT_SECRET || process.env.JWT_SECRET || '').trim();

router.post('/generate-token', (req, res) => {
  const providedApiKey = String(req.header('x-api-key') || '').trim();
  const expectedApiKey = String(process.env.INTERNAL_SERVICE_API_KEY || '').trim();
  if (!expectedApiKey) {
    return sendBadRequest(res, 'INTERNAL_SERVICE_API_KEY is not configured');
  }
  if (!providedApiKey || providedApiKey !== expectedApiKey) {
    return sendUnauthorized(res, 'Invalid API key');
  }

  const secret = getSecret();
  if (!secret) {
    return sendBadRequest(res, 'INTERNAL_JWT_SECRET is not configured');
  }

  const requesterService = String(req.body?.requesterService || 'unknown').trim() || 'unknown';
  const token = jwt.sign({ requesterService }, secret, {
    expiresIn: TOKEN_EXPIRY,
    issuer: SERVICE_NAME
  });

  return sendSuccess(res, 'Token generated successfully', {
    token,
    expiresIn: TOKEN_EXPIRY
  });
});

module.exports = router;
