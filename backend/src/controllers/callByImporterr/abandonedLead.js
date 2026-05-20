const CrmAbandonedLead = require('../../models/CrmAbandonedLead');
const { sendSuccess, sendBadRequest, sendServerError } = require('../../utils/responseHandler');

const VALID_STAGES = ['cart', 'payment'];
const VALID_STATUSES = ['open', 'converted', 'cancelled'];

const parseStage = (value) => {
  const s = String(value || '').toLowerCase();
  return VALID_STAGES.includes(s) ? s : null;
};

const parseStatus = (value) => {
  const s = String(value || '').toLowerCase();
  return VALID_STATUSES.includes(s) ? s : null;
};

const upsertAbandonedLeadFromImporterr = async (req, res) => {
  try {
    const {
      importerrLeadId,
      userId,
      name,
      email,
      phone,
      stage,
      status = 'open',
      cartValue,
      cartValueExcludesShipping,
      totalLMDCharges,
      gstOnLMD,
      shippingAddress,
      billingAddress,
      leadItems,
      itemSignature,
      importerrOrderId,
      convertedAt,
    } = req.body || {};

    if (!importerrLeadId || !String(importerrLeadId).trim()) {
      return sendBadRequest(res, 'importerrLeadId is required');
    }
    const parsedStage = parseStage(stage);
    if (!parsedStage) {
      return sendBadRequest(res, 'stage must be cart or payment');
    }
    const parsedStatus = parseStatus(status) || 'open';

    const update = {
      importerrLeadId: String(importerrLeadId).trim(),
      userId: userId ? String(userId).trim() : '',
      name: name ? String(name).trim() : '',
      email: email ? String(email).trim().toLowerCase() : '',
      phone: phone ? String(phone).trim() : '',
      stage: parsedStage,
      status: parsedStatus,
      cartValue: Number(cartValue) || 0,
      cartValueExcludesShipping: Boolean(cartValueExcludesShipping),
      totalLMDCharges: Number(totalLMDCharges) || 0,
      gstOnLMD: Number(gstOnLMD) || 0,
      leadItems: Array.isArray(leadItems) ? leadItems : [],
      itemSignature: itemSignature ? String(itemSignature) : '',
      importerrOrderId: importerrOrderId ? String(importerrOrderId) : '',
      lastSyncedAt: new Date(),
    };

    if (shippingAddress && typeof shippingAddress === 'object') {
      update.shippingAddress = shippingAddress;
    }
    if (billingAddress && typeof billingAddress === 'object') {
      update.billingAddress = billingAddress;
    }
    if (convertedAt) {
      update.convertedAt = new Date(convertedAt);
    }

    const doc = await CrmAbandonedLead.findOneAndUpdate(
      { importerrLeadId: update.importerrLeadId },
      { $set: update },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return sendSuccess(res, 'Abandoned lead synced', doc);
  } catch (error) {
    console.error('upsertAbandonedLeadFromImporterr error:', error);
    return sendServerError(res, error.message || 'Failed to sync abandoned lead');
  }
};

const updateAbandonedLeadStatusFromImporterr = async (req, res) => {
  try {
    const {
      importerrLeadId,
      userId,
      itemSignature,
      status,
      importerrOrderId,
      stage,
    } = req.body || {};

    const parsedStatus = parseStatus(status);
    if (!parsedStatus) {
      return sendBadRequest(res, 'status must be open, converted, or cancelled');
    }

    const filter = {};
    if (importerrLeadId) {
      filter.importerrLeadId = String(importerrLeadId).trim();
    } else if (userId && itemSignature) {
      filter.userId = String(userId).trim();
      filter.itemSignature = String(itemSignature);
      filter.status = 'open';
      const parsedStage = parseStage(stage);
      if (parsedStage) filter.stage = parsedStage;
    } else {
      return sendBadRequest(res, 'importerrLeadId or (userId + itemSignature) is required');
    }

    const $set = {
      status: parsedStatus,
      lastSyncedAt: new Date(),
    };
    if (importerrOrderId) $set.importerrOrderId = String(importerrOrderId);
    if (parsedStatus === 'converted') $set.convertedAt = new Date();

    const result = await CrmAbandonedLead.updateMany(filter, { $set });

    return sendSuccess(res, 'Abandoned lead status updated', {
      matched: result.matchedCount ?? result.n ?? 0,
      modified: result.modifiedCount ?? result.nModified ?? 0,
    });
  } catch (error) {
    console.error('updateAbandonedLeadStatusFromImporterr error:', error);
    return sendServerError(res, error.message || 'Failed to update abandoned lead status');
  }
};

module.exports = {
  upsertAbandonedLeadFromImporterr,
  updateAbandonedLeadStatusFromImporterr,
};
