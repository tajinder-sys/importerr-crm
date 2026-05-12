const { PRODUCT_API_ROUTES, ACTIVITY_TYPES } = require('../../utils/constants');
const { sendSuccess, sendBadRequest, sendNotFound } = require('../../utils/responseHandler');
const { callImporterrService } = require('../../utils/importerrServiceApiClient');
const ActivityService = require('../../services/ActivityService');
const EmailService = require('../../services/EmailService');
const Lead = require('../../models/lead');
const ImporterrQuote = require('../../models/ImporterrQuote');

const getRuntimeConfig = () => ({
  baseUrl: process.env.IMPORTERR_BASE_URL || '',
  timeoutMs: Number(process.env.IMPORTERR_TIMEOUT_MS) || 15000
});

const toPath = (template = '', params = {}) => {
  return Object.entries(params).reduce((path, [key, value]) => {
    return path.replace(`{${key}}`, encodeURIComponent(String(value)));
  }, template);
};


const callImporterrApi = async ({ config, path, method = 'GET', body }) => {
  if (!config.baseUrl) {
    throw new Error('Importerr API base URL is not configured');
  }

  return callImporterrService({
    baseUrl: config.baseUrl,
    path,
    method,
    body,
    timeoutMs: config.timeoutMs
  });
};

const getImporterrUserByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const config = getRuntimeConfig();
    const path = toPath(PRODUCT_API_ROUTES.USER_BY_ID, { userId });
    const {user} = await callImporterrApi({ config, path });
    const quotes = await ImporterrQuote.findOne({ userId })
      .sort({ createdAt: -1 })
      .lean();
    sendSuccess(res, 'Importerr user fetched successfully',{user, quotes});
  } catch (error) {
    console.error('Get importerr user error:', error);
    sendBadRequest(res, error.message || 'Failed to fetch importerr user');
  }
};

const getImporterrProductVariantPriceDetails = async (req, res) => {
  try {
    const { productRef } = req.params;
    const config = getRuntimeConfig();
    const path = toPath(PRODUCT_API_ROUTES.PRODUCT_DETAILS, { productRef });
    const payload = await callImporterrApi({ config, path });
    sendSuccess(
      res,
      'Importerr product variant price details fetched successfully',
      payload?.data || payload
    );
  } catch (error) {
    console.error('Get importerr product variant price details error:', error);
    sendBadRequest(res, error.message || 'Failed to fetch importerr product variant price details');
  }
};

const getImporterrSellers = async (req, res) => {
  try {
    const config = getRuntimeConfig();
    const q = new URLSearchParams();
    if (req.query.page != null && req.query.page !== '') q.set('page', String(req.query.page));
    if (req.query.limit != null && req.query.limit !== '') q.set('limit', String(req.query.limit));
    if (req.query.search != null && req.query.search !== '') q.set('search', String(req.query.search));
    const qs = q.toString();
    const path = `${PRODUCT_API_ROUTES.SELLERS_LIST}${qs ? `?${qs}` : ''}`;
    const payload = await callImporterrApi({ config, path });
    const data = payload?.data ?? payload;
    sendSuccess(res, payload?.message || 'Sellers fetched successfully', data);
  } catch (error) {
    console.error('Get importerr sellers error:', error);
    sendBadRequest(res, error.message || 'Failed to fetch importerr sellers');
  }
};

const getImporterrFinalPriceByOfferId = async (req, res) => {
  try {
    const { variants, offerId, overrides, freightTimeoutMs, toProvinceCode, toCityCode, toCountryCode } = req.body;
    const normalizedVariants = Array.isArray(variants)
      ? variants.map((variant) => ({
          skuId: variant?.skuId,
          ap: Number(variant?.ap ?? variant?.unitPrice ?? 0),
          selectedQuantity: Number(variant?.selectedQuantity ?? variant?.quantity ?? 1),
          ...(variant?.overrides ? { overrides: variant.overrides } : {})
        }))
      : [];
    const config = {
      ...getRuntimeConfig(),
      timeoutMs:
        Number(
          process.env.IMPORTERR_TIMEOUT_MS
        ) || 60000
    };
    const path = toPath(PRODUCT_API_ROUTES.GET_FINAL_PRICE);
    const start = Date.now();
    const payload = await callImporterrApi({
      config,
      path,
      method: 'POST',
      body: { variants: normalizedVariants, offerId, overrides, freightTimeoutMs, toProvinceCode, toCityCode, toCountryCode }
    });
    if (String(process.env.DEBUG_IMPORTERR_PROXY_TIMING || '').toLowerCase() === 'true') {
      console.log(`[ImporterrController] get-final-price total ${Date.now() - start}ms; variants=${normalizedVariants.length}`);
    }
    sendSuccess(
      res,
      'Importerr final price fetched successfully',
      payload?.data || payload
    );
  } catch (error) {
    console.error('Get importerr final price error:', error);
    sendBadRequest(res, error.message || 'Failed to fetch importerr final price');
  }
};


module.exports = {
  getImporterrUserByUserId,
  getImporterrSellers,
  getImporterrProductVariantPriceDetails,
  getImporterrFinalPriceByOfferId,
};
