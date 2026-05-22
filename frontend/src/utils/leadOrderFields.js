export function leadHasImporterOrder(lead) {
  return Boolean(lead?.importerOrderId);
}

export function leadHasOrder(lead) {
  return leadHasImporterOrder(lead);
}

export function leadOrderDisplayId(lead) {
  return lead?.importerOrderId || null;
}

export function leadOrderFetchId(lead) {
  return lead?.importerOrderId || null;
}
