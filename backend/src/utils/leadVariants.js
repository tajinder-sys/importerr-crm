/** Normalize lead variants payload to { variantLines: [...] } for storage (buying / inquiry). */
function normalizeLeadVariantsForStorage(variants) {
  if (!variants) return null;
  if (Array.isArray(variants)) {
    return variants.length ? { variantLines: JSON.parse(JSON.stringify(variants)) } : null;
  }
  if (typeof variants === 'object') {
    const lines = variants.variantLines || variants.variants || variants.items;
    if (Array.isArray(lines)) {
      return lines.length ? { variantLines: JSON.parse(JSON.stringify(lines)) } : null;
    }
    return JSON.parse(JSON.stringify(variants));
  }
  return null;
}

function flattenLeadVariants(variants) {
  if (!variants) return [];
  if (Array.isArray(variants)) return variants;
  if (Array.isArray(variants.variantLines)) return variants.variantLines;
  if (Array.isArray(variants.variants)) return variants.variants;
  if (Array.isArray(variants.items)) return variants.items;
  return [];
}

function totalQtyFromVariants(variants) {
  const lines = flattenLeadVariants(normalizeLeadVariantsForStorage(variants));
  if (!lines.length) return 0;
  return lines.reduce(
    (sum, v) => sum + Math.max(0, Number(v?.selectedQuantity ?? v?.quantity ?? v?.qty ?? 0)),
    0
  );
}

function lineToActualVariant(line) {
  if (!line || typeof line !== 'object') return null;
  const sku = String(line.sku ?? line.skuId ?? line.offerId ?? '').trim();
  if (!sku) return null;
  const quantity = Math.max(
    0,
    Number(line.quantity ?? line.selectedQuantity ?? line.qty ?? 0)
  );
  return { sku, quantity };
}

/** Customer / inquiry product: { sku, variants: [{ sku, quantity }] }. */
function normalizeActualProduct(input) {
  if (!input || typeof input !== 'object') return null;

  const sku = input.sku != null ? String(input.sku).trim() : '';
  let rawVariants = input.variants;
  if (!Array.isArray(rawVariants) && rawVariants) {
    rawVariants = flattenLeadVariants(rawVariants);
  }
  const variants = (Array.isArray(rawVariants) ? rawVariants : [])
    .map(lineToActualVariant)
    .filter(Boolean);

  if (!sku && !variants.length) return null;
  return { sku: sku || null, variants };
}

function actualProductFromLines(sku, linesOrPayload) {
  const lines = Array.isArray(linesOrPayload)
    ? linesOrPayload
    : flattenLeadVariants(normalizeLeadVariantsForStorage(linesOrPayload));
  return normalizeActualProduct({
    sku: sku ? String(sku).trim() : null,
    variants: lines.map(lineToActualVariant).filter(Boolean),
  });
}

function totalQtyFromActualProduct(actualProduct) {
  const ap = normalizeActualProduct(actualProduct);
  if (!ap) return 0;
  return ap.variants.reduce((sum, v) => sum + (v.quantity || 0), 0);
}

/** Read actualProduct from lead; supports legacy flat fields until migrated. */
function getActualProductFromLead(lead) {
  if (!lead) return null;
  const nested = normalizeActualProduct(lead.actualProduct);
  if (nested && (nested.sku || nested.variants.length)) return nested;

  const legacySku = lead.actualSku ? String(lead.actualSku).trim() : '';
  const legacyLines = flattenLeadVariants(lead.actualVariants);
  if (legacySku || legacyLines.length) {
    return actualProductFromLines(legacySku, legacyLines);
  }

  const fallbackSku = lead.productSku ? String(lead.productSku).trim() : '';
  const fallbackLines = flattenLeadVariants(lead.variants);
  if (fallbackSku || fallbackLines.length) {
    return actualProductFromLines(fallbackSku, fallbackLines);
  }
  return null;
}

/** Snapshot current lead as actualProduct before switching to a buying SKU. */
function snapshotActualFromLead(lead) {
  const existing = getActualProductFromLead(lead);
  if (existing && (existing.sku || existing.variants.length)) return existing;

  const sku = lead.productSku ? String(lead.productSku).trim() : null;
  return actualProductFromLines(sku, lead.variants);
}

function applyActualProductToLead(lead, actualProduct) {
  lead.actualProduct = normalizeActualProduct(actualProduct);
}

module.exports = {
  normalizeLeadVariantsForStorage,
  flattenLeadVariants,
  totalQtyFromVariants,
  lineToActualVariant,
  normalizeActualProduct,
  actualProductFromLines,
  totalQtyFromActualProduct,
  getActualProductFromLead,
  snapshotActualFromLead,
  applyActualProductToLead,
};
