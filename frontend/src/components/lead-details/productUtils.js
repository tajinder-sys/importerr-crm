/** Map Importerr variation → lead variant line (matches inquiry / pricing shape). */
export const mapImporterrVariationToLeadVariant = (v, selectedQuantity = 1) => {
  const attrs = Array.isArray(v?.skuAttributes) ? v.skuAttributes : [];
  const label =
    attrs.map((a) => a.valueTrans || a.value).filter(Boolean).join(' / ') || `Variant ${v.skuId}`;
  const imgAttr = attrs.find((a) => a.skuImageUrl || a.thumbnailImage);
  const imageUrl = imgAttr?.skuImageUrl || imgAttr?.thumbnailImage || '';
  const ap = Number(v.ap ?? v.finalPrice ?? v.consignPrice ?? 0);
  const qty = Math.max(1, Number(selectedQuantity) || 1);
  return {
    skuId: v.skuId,
    label,
    ap,
    unitPrice: ap,
    selectedQuantity: qty,
    imageUrl,
  };
};
