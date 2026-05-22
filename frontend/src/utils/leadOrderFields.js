/** Prefer Upsaleo id for Importerr order API (supports legacy orderId / importerOrderId). */
export function leadOrderFetchId(lead) {
  if (!lead) return null;
  return (
    lead.importerOrderId ||
    null
  );
}

export function leadHasOrder(lead) {
  return Boolean(leadOrderFetchId(lead));
}

export function leadOrderDisplayId(lead) {
  return lead?.importerOrderId || null;
}
