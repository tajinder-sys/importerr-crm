const CrmAbandonedLead = require('../models/CrmAbandonedLead');
const { processAbandonedReminderEmailBatch } = require('../services/abandonedReminderEmailService');
const { processAbandonedQueueBatch } = require('../services/abandonedQueueProcessorService');
const { buildEligibleOpenQueueFilter } = require('../utils/abandonedQueueQuery');
const { getAbandonedQueueMinAgeMinutes } = require('../utils/abandonedQueueSettings');
const { sendSuccess, sendNotFound, sendBadRequest, sendServerError } = require('../utils/responseHandler');

const VALID_STAGES = ['cart', 'payment'];

const parseStage = (value) => {
  const s = String(value || '').toLowerCase();
  return VALID_STAGES.includes(s) ? s : null;
};

const buildQueueFilter = async (stage, status) => {
  if (!status || status === 'open') {
    const { filter, minMinutes, minAges } = await buildEligibleOpenQueueFilter(stage);
    if (stage) {
      return { filter, minMinutes };
    }
    return { filter, minMinutes: minAges?.cart ?? 0, minAges };
  }

  const filter = { stage, status };
  const minAges = await getAbandonedQueueMinAgeMinutes();
  const minMinutes = stage === 'payment' ? minAges.payment : minAges.cart;
  return { filter, minMinutes };
};

const listAbandonedLeads = async (req, res) => {
  try {
    const stage = parseStage(req.query.stage || req.params.stage);
    if (!stage) {
      return sendBadRequest(res, 'stage must be cart or payment');
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const status = req.query.status ? String(req.query.status) : null;

    const { filter, minMinutes } = await buildQueueFilter(stage, status);

    const [leads, total] = await Promise.all([
      CrmAbandonedLead.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
      CrmAbandonedLead.countDocuments(filter),
    ]);

    return sendSuccess(res, 'Abandoned leads retrieved', {
      leads,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit) || 0,
      stage,
      minAgeMinutes: minMinutes,
    });
  } catch (error) {
    console.error('listAbandonedLeads error:', error);
    return sendServerError(res, error.message || 'Failed to list abandoned leads');
  }
};

const getAbandonedLeadById = async (req, res) => {
  try {
    const lead = await CrmAbandonedLead.findById(req.params.id).lean();
    if (!lead) {
      return sendNotFound(res, 'Abandoned lead not found');
    }
    return sendSuccess(res, 'Abandoned lead retrieved', lead);
  } catch (error) {
    console.error('getAbandonedLeadById error:', error);
    return sendServerError(res, error.message || 'Failed to get abandoned lead');
  }
};

const processAbandonedQueueNow = async (req, res) => {
  try {
    const summary = await processAbandonedQueueBatch();
    return sendSuccess(res, 'Abandoned queue processing finished', summary);
  } catch (error) {
    console.error('processAbandonedQueueNow error:', error);
    return sendServerError(res, error.message || 'Failed to process abandoned queue');
  }
};

const processAbandonedReminderBatchNow = async (req, res) => {
  try {
    const summary = await processAbandonedReminderEmailBatch();
    return sendSuccess(res, 'Abandoned reminder email batch finished', summary);
  } catch (error) {
    console.error('processAbandonedReminderBatchNow error:', error);
    return sendServerError(res, error.message || 'Failed to process abandoned reminder emails');
  }
};

module.exports = {
  listAbandonedLeads,
  getAbandonedLeadById,
  processAbandonedQueueNow,
  processAbandonedReminderBatchNow,
};
