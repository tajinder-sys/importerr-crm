const { callImporterrService } = require('../utils/importerrServiceApiClient');
const { PRODUCT_API_ROUTES } = require('../utils/constants');

const getImporterOrderId = (lead) => {
  const id = lead?.importerOrderId;
  return id ? String(id).trim() : null;
};

function parseStatusRows(payload) {
  const data = payload?.data;
  if (Array.isArray(data?.statuses)) return data.statuses;
  if (Array.isArray(data)) return data;
  if (Array.isArray(payload?.statuses)) return payload.statuses;
  return [];
}

function buildStatusMap(rows) {
  console.log('rows', rows);
  const map = new Map();
  for (const row of rows) {
    const status = row?.status ? String(row.status) : '';
    if (!status) continue;
    if (row.importerOrderId) map.set(String(row.importerOrderId), status);
    if (row.upsaleoOrderId) map.set(String(row.upsaleoOrderId), status);
  }
  return map;
}

async function fetchOrderStatusMap(importerOrderIds = []) {
  const ids = [
    ...new Set(
      (importerOrderIds || []).map((id) => String(id || '').trim()).filter(Boolean)
    ),
  ];
  if (!ids.length) return new Map();

  const baseUrl = String(process.env.IMPORTERR_BASE_URL || '').trim();
  if (!baseUrl) return new Map();

  try {
    const payload = await callImporterrService({
      baseUrl,
      path: PRODUCT_API_ROUTES.ORDERS_STATUS_SUMMARY,
      method: 'POST',
      body: { importerOrderIds: ids },
      timeoutMs: Number(process.env.IMPORTERR_TIMEOUT_MS) || 15000,
    });
    return buildStatusMap(parseStatusRows(payload));
  } catch (err) {
    console.error('fetchOrderStatusMap:', err.message);
    return new Map();
  }
}

async function attachOrderStatusToLead(lead) {
  const plain = lead?.toObject ? lead.toObject() : { ...lead };
  const id = getImporterOrderId(plain);
  if (!id) return plain;
  const status = (await fetchOrderStatusMap([id])).get(id);
  return status ? { ...plain, orderStatus: status } : plain;
}

async function attachOrderStatusToLeads(leads = []) {
  if (!leads.length) return [];
  const ids = leads.map(getImporterOrderId).filter(Boolean);
  if (!ids.length) return leads;
  const statusMap = await fetchOrderStatusMap(ids);
  return leads.map((lead) => {
    const id = getImporterOrderId(lead);
    const orderStatus = id ? statusMap.get(id) : null;
    return orderStatus ? { ...lead, orderStatus } : lead;
  });
}

module.exports = {
  attachOrderStatusToLead,
  attachOrderStatusToLeads,
  getImporterOrderId,
};
