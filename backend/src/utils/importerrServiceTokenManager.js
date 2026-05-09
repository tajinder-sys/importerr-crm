const { getValue, setValue, delValue } = require('./internalTokenRedis');

const TOKEN_CACHE_KEY = process.env.IMPORTERR_TOKEN_CACHE_KEY || 'internal:token:importerr';
const TOKEN_TTL_SECONDS = Number(process.env.INTERNAL_JWT_TOKEN_CACHE_TTL || 900);

const setImporterrServiceToken = async (token) => {
  return setValue(TOKEN_CACHE_KEY, String(token || '').trim(), TOKEN_TTL_SECONDS);
};

const getImporterrServiceToken = async () => {
  return getValue(TOKEN_CACHE_KEY);
};

const clearImporterrServiceToken = async () => {
  return delValue(TOKEN_CACHE_KEY);
};

module.exports = {
  setImporterrServiceToken,
  getImporterrServiceToken,
  clearImporterrServiceToken
};
