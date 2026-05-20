const Lead = require('../models/lead');
const CrmAbandonedLead = require('../models/CrmAbandonedLead');
const { assignLeadWithAI } = require('./aiAssignmentService');
const ActivityService = require('./ActivityService');
const {
  LEAD_SOURCES,
  LEAD_STATUSES,
  ACTIVITY_TYPES,
  ABANDONED_QUEUE_STATUSES,
} = require('../utils/constants');
const { buildEligibleOpenQueueFilter } = require('../utils/abandonedQueueQuery');
const {
  getAbandonedQueueCronSettings,
  getLeadCreateGraceAfterReminderMinutes,
} = require('../utils/abandonedQueueSettings');
const logger = require('../utils/logger');

/** When lead grace is 0, do not create a lead for rows reminded from CRM within this window (avoids races with reminder batch / scheduler). */
const POST_CRM_REMINDER_LEAD_COOLDOWN_MS = 3 * 60 * 1000;

const buildVariantsFromLeadItems = (items = []) => {
  const variantLines = (Array.isArray(items) ? items : []).map((item) => ({
    skuId: item.sku || item.specId || '',
    specId: item.specId || '',
    quantity: Number(item.quantity) > 0 ? Number(item.quantity) : 1,
    pricingMode: item.pricingMode || 'dropshipping',
  }));
  const totalQuantity = variantLines.reduce((sum, row) => sum + (row.quantity || 0), 0);
  return { variantLines, totalQuantity };
};

const resolveLeadSource = (stage) =>
  stage === 'payment' ? LEAD_SOURCES.ABANDONED_PAYMENT : LEAD_SOURCES.ABANDONED_CART;

const buildAbandonedMessage = (queueItem) => {
  const lines = Array.isArray(queueItem.leadItems) ? queueItem.leadItems.length : 0;
  const stageLabel = queueItem.stage === 'payment' ? 'checkout (payment)' : 'cart';
  const value = Number(queueItem.cartValue) || 0;
  return [
    `Abandoned ${stageLabel} on Importerr.`,
    value > 0 ? `Cart value: ${value}.` : '',
    lines > 0 ? `${lines} product line(s).` : '',
    queueItem.itemSignature ? `Signature: ${queueItem.itemSignature}.` : '',
  ]
    .filter(Boolean)
    .join(' ');
};

const resolveContact = (queueItem) => {
  const ship = queueItem.shippingAddress || {};
  const name =
    String(queueItem.name || '').trim() ||
    `${ship.firstName || ''} ${ship.lastName || ''}`.trim() ||
    'Importerr customer';
  const email = String(queueItem.email || '').trim().toLowerCase();
  const phone =
    String(queueItem.phone || '').trim() ||
    String(ship.phone || '').trim() ||
    '';
  return { name, email, phone };
};

const createLeadFromQueueItem = async (queueItem) => {
  const { name, email, phone } = resolveContact(queueItem);
  if (!email && !phone) {
    throw new Error('Queue item has no email or phone');
  }

  const existingLead = await Lead.findOne({ abandonedQueueRef: queueItem._id }).lean();
  if (existingLead) {
    return { lead: existingLead, created: false };
  }

  const { variantLines, totalQuantity } = buildVariantsFromLeadItems(queueItem.leadItems);
  const firstSku =
    variantLines.find((v) => v.skuId)?.skuId ||
    (queueItem.leadItems?.[0]?.sku || queueItem.leadItems?.[0]?.specId || '');

  const lead = await Lead.create({
    name,
    email: email || undefined,
    phone: phone || '—',
    source: resolveLeadSource(queueItem.stage),
    status: LEAD_STATUSES.NEW,
    message: buildAbandonedMessage(queueItem),
    leadType: queueItem.userId ? 'registered' : 'guest',
    userId: queueItem.userId ? String(queueItem.userId) : null,
    productSku: firstSku || null,
    variants: variantLines.length ? { variantLines } : null,
    totalQuantity,
    abandonedQueueRef: queueItem._id,
    priority: queueItem.stage === 'payment' ? 'high' : 'medium',
  });

  await ActivityService.logActivity({
    leadId: lead._id,
    type: ACTIVITY_TYPES.LEAD_CREATED,
    description: `Lead created from abandoned ${queueItem.stage} queue`,
    metadata: {
      abandonedQueueId: String(queueItem._id),
      importerrLeadId: queueItem.importerrLeadId,
      stage: queueItem.stage,
      cartValue: queueItem.cartValue,
    },
  });

  return { lead, created: true };
};

const markQueueItemProcessed = async (queueItemId, crmLeadId) => {
  await CrmAbandonedLead.findByIdAndUpdate(queueItemId, {
    $set: {
      status: ABANDONED_QUEUE_STATUSES.PROCESSED,
      crmLeadId,
      processedAt: new Date(),
      processError: '',
    },
  });
};

const markQueueItemError = async (queueItemId, errorMessage) => {
  await CrmAbandonedLead.findByIdAndUpdate(queueItemId, {
    $set: { processError: String(errorMessage || '').slice(0, 500) },
  });
};

/**
 * Process eligible open abandoned-queue rows: create CRM lead, AI assign, mark processed.
 */
const processAbandonedQueueBatch = async () => {
  const cronSettings = await getAbandonedQueueCronSettings();
  if (!cronSettings.enabled) {
    return { skipped: true, reason: 'cron_disabled' };
  }

  const { filter } = await buildEligibleOpenQueueFilter();
  const batchLimit = cronSettings.batchSize;
  const graceMinutes = await getLeadCreateGraceAfterReminderMinutes();

  const graceFilter =
    graceMinutes > 0
      ? {
          crmReminderCount: { $gt: 0 },
          lastCrmReminderSentAt: { $lte: new Date(Date.now() - graceMinutes * 60 * 1000) },
        }
      : {};

  const baseMatch = {
    ...filter,
    ...graceFilter,
    crmLeadId: { $in: [null, undefined] },
  };

  const recentReminderCutoff = new Date(Date.now() - POST_CRM_REMINDER_LEAD_COOLDOWN_MS);
  const excludeRecentCrmReminder =
    graceMinutes === 0
      ? {
          $or: [
            { lastCrmReminderSentAt: { $exists: false } },
            { lastCrmReminderSentAt: null },
            { lastCrmReminderSentAt: { $lte: recentReminderCutoff } },
          ],
        }
      : null;

  const query =
    excludeRecentCrmReminder != null
      ? { $and: [baseMatch, excludeRecentCrmReminder] }
      : baseMatch;

  const queueItems = await CrmAbandonedLead.find(query)
    .sort({ updatedAt: 1 })
    .limit(batchLimit)
    .lean();

  const summary = {
    scanned: queueItems.length,
    created: 0,
    linked: 0,
    assigned: 0,
    failed: 0,
    errors: [],
  };

  for (const item of queueItems) {
    try {
      const { lead, created } = await createLeadFromQueueItem(item);
      if (created) summary.created += 1;
      else summary.linked += 1;

      await assignLeadWithAI(lead);
      summary.assigned += 1;

      await markQueueItemProcessed(item._id, lead._id);
    } catch (err) {
      summary.failed += 1;
      summary.errors.push({ id: String(item._id), message: err.message });
      await markQueueItemError(item._id, err.message);
      logger.warn(`[AbandonedQueueCron] item ${item._id}: ${err.message}`);
    }
  }

  if (summary.scanned > 0) {
    logger.info('[AbandonedQueueCron] batch complete', summary);
  }

  return summary;
};

module.exports = {
  processAbandonedQueueBatch,
  createLeadFromQueueItem,
};
