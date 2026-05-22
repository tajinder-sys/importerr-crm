import { flattenLeadVariants, leadVariantQty } from './leadVariants';

export function normalizeActualProduct(input) {
  if (!input || typeof input !== 'object') return null;
  const sku = input.sku != null ? String(input.sku).trim() : '';
  let raw = input.variants;
  if (!Array.isArray(raw) && raw) raw = flattenLeadVariants(raw);
  const variants = (Array.isArray(raw) ? raw : [])
    .map((line) => {
      const vSku = String(line?.sku ?? line?.skuId ?? '').trim();
      if (!vSku) return null;
      return {
        sku: vSku,
        quantity: leadVariantQty(line),
      };
    })
    .filter(Boolean);
  if (!sku && !variants.length) return null;
  return { sku: sku || null, variants };
}

export function getActualProductFromLead(lead) {
  if (!lead) return null;
  const nested = normalizeActualProduct(lead.actualProduct);
  if (nested && (nested.sku || nested.variants.length)) return nested;

  const legacySku = lead.actualSku ? String(lead.actualSku).trim() : '';
  const legacyLines = flattenLeadVariants(lead.actualVariants);
  if (legacySku || legacyLines.length) {
    return normalizeActualProduct({ sku: legacySku, variants: legacyLines });
  }

  const fallbackSku = String(lead.productSku || '').trim();
  const fallbackLines = flattenLeadVariants(lead.variants);
  if (fallbackSku || fallbackLines.length) {
    return normalizeActualProduct({ sku: fallbackSku, variants: fallbackLines });
  }
  return null;
}

export function getActualSku(lead) {
  return getActualProductFromLead(lead)?.sku || String(lead?.productSku || '').trim() || '';
}

export function totalQtyFromActualProduct(actualProduct) {
  const ap = normalizeActualProduct(actualProduct);
  if (!ap) return 0;
  return ap.variants.reduce((sum, v) => sum + (v.quantity || 0), 0);
}

/** Rows for UI lists (label, skuId alias, quantity). */
export function actualProductToDisplayRows(actualProduct) {
  const ap = normalizeActualProduct(actualProduct);
  if (!ap) return [];
  return ap.variants.map((v) => ({
    sku: v.sku,
    skuId: v.sku,
    label: `SKU ${v.sku}`,
    quantity: v.quantity,
    selectedQuantity: v.quantity,
  }));
}

export function buildActualProductPayload({ sku, variantRows, variants }) {
  const lines = variantRows?.length
    ? variantRows
    : Array.isArray(variants)
      ? variants
      : flattenLeadVariants(variants);
  return normalizeActualProduct({
    sku: String(sku || '').trim(),
    variants: lines,
  });
}
