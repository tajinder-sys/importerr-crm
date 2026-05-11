const Lead = require('../models/lead');
const Communication = require('../models/Communication');
const User = require('../models/User');
const ConnectedAccount = require('../models/ConnectedAccount');
const { LEAD_SOURCES, LEAD_STATUSES } = require('../utils/constants');

const SOURCE_MAP = {
  whatsapp: LEAD_SOURCES.WHATSAPP,
  email: LEAD_SOURCES.EMAIL,
  meta: LEAD_SOURCES.META_ADS,
};

const pickFirst = (obj, keys) => {
  for (const key of keys) {
    const value = obj?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return value;
    }
  }
  return '';
};

const normalizePhone = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) return digits;
  if (digits.startsWith('91') && digits.length === 12) return digits.slice(2);
  return digits.slice(-10);
};

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
const normalizeName = (value) => String(value || '').trim();
const normalizeLeadType = (value) => (value === 'registered' ? 'registered' : 'guest');

const mapPayloadToLeadData = (channel, payload = {}) => {
  const name = normalizeName(pickFirst(payload, ['name', 'fullName', 'customerName', 'senderName']));
  const phone = normalizePhone(pickFirst(payload, ['phone', 'mobile', 'phoneNumber', 'senderPhone']));
  const email = normalizeEmail(pickFirst(payload, ['email', 'mail', 'senderEmail']));
  const message = pickFirst(payload, ['message', 'text', 'body', 'comment', 'leadMessage']);

  return {
    name,
    phone,
    email,
    message: String(message || '').trim(),
    source: SOURCE_MAP[channel],
    status: LEAD_STATUSES.NEW,
    leadType: normalizeLeadType(pickFirst(payload, ['leadType'])),
    userId: pickFirst(payload, ['userId', 'customerId']) || null,
    productIntentId: pickFirst(payload, ['productIntentId', 'intentId']) || null,
    cartId: pickFirst(payload, ['cartId']) || null,
    accountId: payload._accountId || null
  };
};

const validateInboundLeadData = (leadData) => {
  const errors = [];
  if (!leadData.name) errors.push('name is required');
  // Phone required only if email not present
  if (!leadData.phone && !leadData.email) errors.push('phone or email is required');
  if (leadData.phone && !/^\d{10}$/.test(leadData.phone)) errors.push('phone must be a valid 10-digit number');
  if (leadData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(leadData.email)) {
    errors.push('email format is invalid');
  }
  if (!['guest', 'registered'].includes(leadData.leadType)) {
    errors.push('leadType must be guest or registered');
  }
  return errors;
};

const getAutoAssignableTeamMemberId = async () => {
  const teamMembers = await User.find({ role: 'team_member', isActive: true })
    .select('_id createdAt')
    .sort({ createdAt: 1 })
    .lean();

  if (!teamMembers.length) return null;

  const assignmentCounts = await Lead.aggregate([
    {
      $match: {
        assignedTo: { $in: teamMembers.map((member) => member._id) }
      }
    },
    {
      $group: {
        _id: '$assignedTo',
        count: { $sum: 1 }
      }
    }
  ]);

  const countMap = new Map(assignmentCounts.map((item) => [String(item._id), item.count || 0]));
  const sortedByLoad = [...teamMembers].sort((a, b) => {
    const loadA = countMap.get(String(a._id)) || 0;
    const loadB = countMap.get(String(b._id)) || 0;
    if (loadA !== loadB) return loadA - loadB;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  return sortedByLoad[0]?._id || null;
};

const ingestLeadFromChannel = async (channel, payload) => {
  const leadData = mapPayloadToLeadData(channel, payload);
  const errors = validateInboundLeadData(leadData);
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const duplicateQuery = {
    $or: [
      ...(leadData.phone ? [{ phone: leadData.phone }] : []),
      ...(leadData.email ? [{ email: leadData.email }] : [])
    ]
  };

  if (!duplicateQuery.$or.length) return { ok: false, errors: ['phone or email required'] };

  let existingLead = await Lead.findOne(duplicateQuery).select(
    '_id phone email status assignedTo message userId productIntentId cartId leadType lastInteraction'
  );
  if (existingLead) {
    if (!existingLead.assignedTo) {
      const autoAssignedTo = await getAutoAssignableTeamMemberId();
      if (autoAssignedTo) {
        existingLead.assignedTo = autoAssignedTo;
      }
    }
    existingLead.lastInteraction = new Date();
    if (!existingLead.message && leadData.message) {
      existingLead.message = leadData.message;
    }
    if (!existingLead.userId && leadData.userId) existingLead.userId = leadData.userId;
    if (!existingLead.productIntentId && leadData.productIntentId) {
      existingLead.productIntentId = leadData.productIntentId;
    }
    if (!existingLead.cartId && leadData.cartId) existingLead.cartId = leadData.cartId;
    if (!existingLead.leadType && leadData.leadType) existingLead.leadType = leadData.leadType;
    await existingLead.save();
    if (leadData.message) {
      await Communication.create({
        lead: existingLead._id,
        senderType: 'client',
        senderUser: null,
        source: leadData.source,
        direction: 'inbound',
        message: leadData.message
      });
    }
    return { ok: true, lead: existingLead, isNew: false };
  }

  const autoAssignedTo = await getAutoAssignableTeamMemberId();
  const lead = await Lead.create({
    ...leadData,
    ...(autoAssignedTo ? { assignedTo: autoAssignedTo } : {}),
    lastInteraction: new Date()
  });

  if (leadData.message) {
    await Communication.create({
      lead: lead._id,
      senderType: 'client',
      senderUser: null,
      source: leadData.source,
      direction: 'inbound',
      message: leadData.message
    });
  }

  return { ok: true, lead, isNew: true };
};

module.exports = {
  ingestLeadFromChannel
};
