const toFiniteNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const pickOverrideNumber = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue;
    const num = Number(value);
    if (Number.isFinite(num)) return num;
  }
  return undefined;
};

const buildProductLookup = (productRef) => {
  const ref = String(productRef || '').trim();
  const or = [{ sku: ref }, { offerId: ref }];
  if (ref.match(/^[0-9a-fA-F]{24}$/)) {
    or.unshift({ _id: ref });
  }
  return { $or: or };
};

const generateQuoteReferenceId = () => {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `IQ-${y}${m}${d}-${random}`;
};

module.exports = {
  toFiniteNumber,
  pickOverrideNumber,
  buildProductLookup,
  generateQuoteReferenceId
};
