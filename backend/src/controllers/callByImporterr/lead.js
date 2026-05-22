const User = require('../../models/User');
const Lead = require('../../models/lead');
const Communication = require('../../models/Communication');
const ActivityService = require('../../services/ActivityService');
const { assignLeadWithAI } = require('../../services/aiAssignmentService');
const {
  LEAD_SOURCES,
  LEAD_STATUSES,
  USER_ROLES,
  ACTIVITY_TYPES,
  COMMUNICATION_SOURCES
} = require('../../utils/constants');
const { sendSuccess, sendBadRequest, sendNotFound, sendServerError } = require('../../utils/responseHandler');
const EmailService = require('../../services/EmailService');

const resolveAutoAssignedTeamMember = async () => {
  const activeMembers = await User.find({
    role: USER_ROLES.TEAM_MEMBER,
    isActive: true
  })
    .select('_id')
    .lean();

  if (!activeMembers.length) {
    return null;
  }

  const memberIds = activeMembers.map((member) => member._id);
  const assignmentCounts = await Lead.aggregate([
    { $match: { assignedTo: { $in: memberIds } } },
    { $group: { _id: '$assignedTo', count: { $sum: 1 } } }
  ]);

  const countMap = new Map(assignmentCounts.map((item) => [String(item._id), item.count]));

  let selected = activeMembers[0]._id;
  let minCount = Number.MAX_SAFE_INTEGER;
  for (const member of activeMembers) {
    const count = countMap.get(String(member._id)) || 0;
    if (count < minCount) {
      minCount = count;
      selected = member._id;
    }
  }

  return selected;
};

const createInboundClientCommunication = async ({
  leadId,
  source,
  message,
  preferredUserId = null,
}) => {
  if (!message || !String(message).trim()) return false;
  const communicationSource = Object.values(COMMUNICATION_SOURCES).includes(source)
    ? source
    : COMMUNICATION_SOURCES.IMPORTERR_INQUIRY;
  const trimmed = String(message).trim();
  const commExists = await Communication.findOne({
    lead: leadId,
    message: trimmed,
    source: communicationSource,
    direction: 'inbound',
  }).lean();
  if (commExists) return false;

  await Communication.create({
    lead: leadId,
    senderType: 'client',
    senderUser: null,
    source: communicationSource,
    direction: 'inbound',
    message: trimmed,
  });

  await ActivityService.logActivity({
    leadId,
    type: ACTIVITY_TYPES.COMMUNICATION_RECEIVED,
    description: `Inbound message via ${communicationSource}`,
    preferredUserId,
    metadata: { source: communicationSource, direction: 'inbound' },
  });

  return true;
};

const createLeadFromImporterr = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      source = LEAD_SOURCES.IMPORTERR_INQUIRY,
      status = LEAD_STATUSES.NEW,
      leadType = 'registered',
      assignedTo = null,
      duplicateOf = null,
      userId = null,
      productId = null,
      productSku = null,
      variants = null,
      totalQuantity = 0,
      importerOrderId = null,
      message = '',
      subject = null,
      issueCategory = null
    } = req.body || {};
    if (!name || !String(name).trim()) {
      return sendBadRequest(res, 'name is required');
    }
    if (!email || !String(email).trim()) {
      return sendBadRequest(res, 'email is required');
    }
    if (!phone || !String(phone).trim()) {
      return sendBadRequest(res, 'phone is required');
    }

    const normalizedUserId = userId ? String(userId).trim() : null;
    const normImporterOrderId = importerOrderId ? String(importerOrderId).trim() : null;
    const normalizedSubject = subject ? String(subject).trim() : null;
    const normalizedIssueCategory = issueCategory ? String(issueCategory).trim() : null;
    const normalizedProductSku = productSku ? String(productSku).trim() : null;
    const normalizedVariants =
      variants && typeof variants === 'object'
        ? JSON.parse(JSON.stringify(variants))
        : null;
    const resolvedMessage =
      String(message || '').trim() ||
      `Importerr inquiry for SKU ${String(productSku || '').trim()}`.trim();
    const resolvedSource = source || LEAD_SOURCES.IMPORTERR_INQUIRY;

    // Prevent duplicate leads per customer+SKU for importerr submissions.
    if (normalizedUserId && normalizedProductSku) {
      const existingLead = await Lead.findOne({
        userId: normalizedUserId,
        productSku: normalizedProductSku
      });

      if (existingLead) {
        const previousStatus = existingLead.status;
        existingLead.status = LEAD_STATUSES.NEW;
        existingLead.message = resolvedMessage;
        existingLead.subject = normalizedSubject;
        existingLead.issueCategory = normalizedIssueCategory;
        existingLead.source = resolvedSource;
        if (normImporterOrderId) existingLead.importerOrderId = normImporterOrderId;
        existingLead.totalQuantity = Number(totalQuantity) || 0;
        if (normalizedVariants) {
          existingLead.variants = normalizedVariants;
        }
        existingLead.lastInteraction = new Date();
        await existingLead.save();

        await createInboundClientCommunication({
          leadId: existingLead._id,
          source: existingLead.source,
          message: resolvedMessage,
          preferredUserId: existingLead.assignedTo,
        });

        await ActivityService.logActivity({
          leadId: existingLead._id,
          type: ACTIVITY_TYPES.LEAD_UPDATED,
          description: 'Existing lead refreshed from Importerr inquiry (same user and product)',
          preferredUserId: existingLead.assignedTo,
          metadata: {
            matchedBy: 'userId+productSku',
            userId: normalizedUserId,
            productSku: normalizedProductSku,
            oldStatus: previousStatus,
            newStatus: LEAD_STATUSES.NEW,
            variants: normalizedVariants,
            totalQuantity:
              Number(totalQuantity) > 0 ? Number(totalQuantity) : existingLead.totalQuantity || 0,
          },
        });

        return sendSuccess(
          res,
          'Lead already exists for this user and product. Status reset to new and communication added.',
          existingLead
        );
      }
    }

    const lead = await Lead.create({
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      phone: String(phone).trim(),
      source: resolvedSource,
      status: status || LEAD_STATUSES.NEW,
      message: resolvedMessage,
      subject: normalizedSubject,
      issueCategory: normalizedIssueCategory,
      leadType: leadType || 'registered',
      assignedTo: assignedTo || null,
      duplicateOf: duplicateOf || null,
      userId: normalizedUserId,
      productId: productId ? String(productId).trim() : null,
      productSku: normalizedProductSku,
      variants: normalizedVariants,
      totalQuantity: Number(totalQuantity) > 0 ? Number(totalQuantity) : 0,
      importerOrderId: normImporterOrderId,
    });

    await createInboundClientCommunication({
      leadId: lead._id,
      source: lead.source,
      message: lead.message,
      preferredUserId: assignedTo,
    });

    await ActivityService.logActivity({
      leadId: lead._id,
      type: ACTIVITY_TYPES.LEAD_CREATED,
      description: `Lead created from Importerr inquiry${lead.productSku ? ` (${lead.productSku})` : ''}`,
      preferredUserId: assignedTo,
      metadata: {
        source: lead.source,
        userId: lead.userId || null,
        productId: lead.productId || null,
        productSku: lead.productSku || null,
        variants: lead.variants || null,
        totalQuantity: lead.totalQuantity || 0,
      },
    });
    // AI pipeline + priority + user assignment (non-blocking)
    assignLeadWithAI(lead).catch(err => console.error('AI assignment failed:', err.message));

    return sendSuccess(res, 'Lead created from importerr inquiry', lead);
  } catch (error) {
    return sendServerError(res, error.message || 'Failed to create lead from importerr');
  }
};

module.exports = {
  createLeadFromImporterr
};
