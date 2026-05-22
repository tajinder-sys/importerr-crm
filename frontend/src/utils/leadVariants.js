export function flattenLeadVariants(variants) {
  if (!variants) return [];
  if (Array.isArray(variants)) return variants;
  if (Array.isArray(variants.variantLines)) return variants.variantLines;
  if (Array.isArray(variants.variants)) return variants.variants;
  if (Array.isArray(variants.items)) return variants.items;
  return [];
}

export function leadVariantQty(row) {
  return Math.max(0, Number(row?.quantity ?? row?.selectedQuantity ?? row?.qty ?? 0));
}

export function totalQtyFromLeadVariants(variants) {
  return flattenLeadVariants(variants).reduce((sum, v) => sum + leadVariantQty(v), 0);
}
