const Lead = require('../models/lead');
const Activity = require('../models/Activity');
const Communication = require('../models/Communication');
const User = require('../models/User');
const ActivityService = require('../services/ActivityService');
const CommunicationService = require('../services/CommunicationService');
const { sendSuccess, sendBadRequest, sendNotFound, sendForbidden } = require('../utils/responseHandler');
const { validateLeadData } = require('../utils/validators');
const { LEAD_STATUSES, ACTIVITY_TYPES, USER_ROLES, COMMUNICATION_SOURCES } = require('../utils/constants');

const isAdminUser = (user) => user?.role === 'admin';
const isTeamUser = (user) =>
  user?.role === USER_ROLES.TEAM_MEMBER || user?.role === USER_ROLES.TEAM_MANAGER;
const canAssignOthers = (user) =>
  user?.role === USER_ROLES.ADMIN || user?.role === USER_ROLES.TEAM_MANAGER;
const canViewLeadHistory = (user) =>
  user?.role === USER_ROLES.ADMIN || user?.role === USER_ROLES.TEAM_MANAGER;
const allowsFlexibleReplySource = (source) =>
  source === COMMUNICATION_SOURCES.IMPORTERR_INQUIRY;

const createInboundClientCommunication = async ({ leadId, source, message }) => {
  if (!message || !String(message).trim()) return;
  await Communication.create({
    lead: leadId,
    senderType: 'client',
    senderUser: null,
    source,
    direction: 'inbound',
    message: String(message).trim()
  });
};

const validateAssignableUser = async (assignedTo) => {
  if (!assignedTo) return { valid: true };

  const assignee = await User.findOne({
    _id: assignedTo,
    role: USER_ROLES.TEAM_MEMBER,
    isActive: true
  }).select('_id');

  if (!assignee) {
    return { valid: false, message: 'assignedTo must be an active team member' };
  }

  return { valid: true };
};

const getLeads = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      source,
      assignedTo,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    if (status) query.status = status;
    if (source) query.source = source;
    if (assignedTo) query.assignedTo = assignedTo;

    // Non-admin team users can only view leads assigned to themselves.
    if (isTeamUser(req.user)) {
      query.assignedTo = req.user.id;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const leads = await Lead.find(query)
      .populate('assignedTo', 'name email')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Lead.countDocuments(query);

    sendSuccess(res, 'Leads retrieved successfully', {
      leads,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get leads error:', error);
    sendBadRequest(res, 'Failed to retrieve leads');
  }
};

const getLeadById = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate('assignedTo', 'name email')
      .populate('duplicateOf', 'name email');

    if (!lead) {
      return sendNotFound(res, 'Lead not found');
    }

    const assignedUserId = lead?.assignedTo?._id
      ? lead.assignedTo._id.toString()
      : lead?.assignedTo
        ? lead.assignedTo.toString()
        : null;

    if (isTeamUser(req.user) && assignedUserId !== req.user.id) {
      return sendForbidden(res, 'You can only view your assigned leads');
    }

    const activities = canViewLeadHistory(req.user)
      ? await Activity.find({ lead: lead._id })
        .populate('performedBy', 'name email')
        .sort({ createdAt: -1 })
      : [];
    const communications = await Communication.find({ lead: lead._id })
      .populate('senderUser', 'name email role')
      .sort({ createdAt: 1 });

    sendSuccess(res, 'Lead retrieved successfully', {
      lead,
      activities,
      communications
    });
  } catch (error) {
    console.error('Get lead error:', error);
    sendBadRequest(res, 'Failed to retrieve lead');
  }
};

const createLead = async (req, res) => {
  try {
    const errors = validateLeadData(req.body);
    if (errors.length > 0) {
      return sendBadRequest(res, 'Validation failed', errors);
    }

    const {
      name,
      phone,
      email,
      source,
      message,
      assignedTo,
      leadType = 'guest',
      userId = null,
      productIntentId = null
    } = req.body;

    let resolvedAssignedTo = assignedTo;
    if (isTeamUser(req.user)) {
      resolvedAssignedTo = req.user.id;
    } else if (assignedTo && canAssignOthers(req.user)) {
      const assigneeValidation = await validateAssignableUser(assignedTo);
      if (!assigneeValidation.valid) {
        return sendBadRequest(res, assigneeValidation.message);
      }
    }

    const existingLead = await Lead.findOne({
      $or: [{ phone }, { email }],
      duplicateOf: { $exists: false }
    });

    if (existingLead) {
      return sendBadRequest(res, 'Lead with this phone or email already exists');
    }

    const lead = new Lead({
      name,
      phone,
      email,
      source,
      message,
      leadType,
      userId: userId || null,
      productIntentId: productIntentId || null,
      assignedTo: resolvedAssignedTo,
      lastInteraction: new Date()
    });

    await lead.save();
    await createInboundClientCommunication({
      leadId: lead._id,
      source,
      message
    });

    await ActivityService.createActivity({
      leadId: lead._id,
      type: ACTIVITY_TYPES.LEAD_CREATED,
      description: `Lead created for ${name}`,
      performedBy: req.user.id,
      metadata: { source }
    });

    const populatedLead = await Lead.findById(lead._id)
      .populate('assignedTo', 'name email');

    sendSuccess(res, 'Lead created successfully', populatedLead);
  } catch (error) {
    console.error('Create lead error:', error);
    sendBadRequest(res, 'Failed to create lead');
  }
};

const addLeadCommunication = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id).select('_id source assignedTo phone email');
    if (!lead) {
      return sendNotFound(res, 'Lead not found');
    }

    if (isTeamUser(req.user) && lead?.assignedTo?.toString() !== req.user.id) {
      return sendForbidden(res, 'You can only communicate for your assigned leads');
    }

    const { message, source } = req.body;
    if (!message || !String(message).trim()) {
      return sendBadRequest(res, 'message is required');
    }

    const allowedSources = allowsFlexibleReplySource(lead.source)
      ? [COMMUNICATION_SOURCES.WHATSAPP, COMMUNICATION_SOURCES.EMAIL]
      : [lead.source];

    const selectedSource = source || allowedSources[0];
    if (!allowedSources.includes(selectedSource)) {
      return sendBadRequest(
        res,
        `Invalid communication source. Allowed: ${allowedSources.join(', ')}`
      );
    }

    await CommunicationService.sendMessage({
      source: selectedSource,
      toPhone: lead.phone || '',
      toEmail: lead.email || '',
      message: String(message).trim()
    });

    const communication = await Communication.create({
      lead: lead._id,
      senderType: 'team_member',
      senderUser: req.user.id,
      source: selectedSource,
      direction: 'outbound',
      message: String(message).trim()
    });

    const populatedCommunication = await Communication.findById(communication._id).populate(
      'senderUser',
      'name email role'
    );

    await ActivityService.createActivity({
      leadId: lead._id,
      type: ACTIVITY_TYPES.COMMUNICATION_SENT,
      description: `Communication sent via ${selectedSource}`,
      performedBy: req.user.id,
      metadata: { source: selectedSource, direction: 'outbound' }
    });

    sendSuccess(res, 'Communication sent successfully', populatedCommunication);
  } catch (error) {
    console.error('Add lead communication error:', error);
    sendBadRequest(res, 'Failed to communicate with lead');
  }
};

const updateLead = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return sendNotFound(res, 'Lead not found');
    }

    const {
      name,
      email,
      phone,
      source,
      message,
      status,
      assignedTo,
      dealValue,
      lostReason,
      leadType,
      userId,
      productIntentId,
      cartId
    } = req.body;

    const oldLeadSnapshot = {
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      source: lead.source,
      message: lead.message,
      status: lead.status,
      assignedTo: lead.assignedTo ? lead.assignedTo.toString() : null,
      dealValue: lead.dealValue,
      lostReason: lead.lostReason,
      leadType: lead.leadType,
      userId: lead.userId,
      productIntentId: lead.productIntentId,
      cartId: lead.cartId
    };

    if (name) lead.name = name;
    if (email) lead.email = email;
    if (phone) lead.phone = phone;
    if (source) lead.source = source;
    if (message !== undefined) lead.message = message;
    if (status) lead.status = status;
    if (assignedTo !== undefined) {
      if (isTeamUser(req.user)) {
        lead.assignedTo = req.user.id;
      } else if (canAssignOthers(req.user)) {
        if (assignedTo) {
          const assigneeValidation = await validateAssignableUser(assignedTo);
          if (!assigneeValidation.valid) {
            return sendBadRequest(res, assigneeValidation.message);
          }
        }
        lead.assignedTo = assignedTo;
      }
    }
    if (dealValue !== undefined) lead.dealValue = dealValue;
    if (lostReason !== undefined) lead.lostReason = lostReason;
    if (leadType !== undefined) lead.leadType = leadType;
    if (userId !== undefined) lead.userId = userId || null;
    if (productIntentId !== undefined) lead.productIntentId = productIntentId || null;
    if (cartId !== undefined) lead.cartId = cartId || null;

    lead.lastInteraction = new Date();
    await lead.save();

    const newAssignedTo = lead.assignedTo ? lead.assignedTo.toString() : null;

    if (oldLeadSnapshot.status !== lead.status) {
      await ActivityService.createActivity({
        leadId: lead._id,
        type: ACTIVITY_TYPES.STATUS_UPDATED,
        description: `Status changed from ${oldLeadSnapshot.status} to ${lead.status}`,
        performedBy: req.user.id,
        metadata: { oldStatus: oldLeadSnapshot.status, newStatus: lead.status }
      });
    }

    if (oldLeadSnapshot.assignedTo !== newAssignedTo) {
      await ActivityService.createActivity({
        leadId: lead._id,
        type: ACTIVITY_TYPES.LEAD_ASSIGNED,
        description: `Lead assigned to ${newAssignedTo ? 'new agent' : 'unassigned'}`,
        performedBy: req.user.id,
        metadata: { oldAssignedTo: oldLeadSnapshot.assignedTo, newAssignedTo }
      });
    }

    const changedFields = {};
    const fieldsToTrack = [
      'name',
      'email',
      'phone',
      'source',
      'message',
      'dealValue',
      'lostReason',
      'leadType',
      'userId',
      'productIntentId',
      'cartId'
    ];

    fieldsToTrack.forEach((field) => {
      const oldValue = oldLeadSnapshot[field] ?? null;
      const newValue = lead[field] ?? null;
      if (String(oldValue) !== String(newValue)) {
        changedFields[field] = { oldValue, newValue };
      }
    });

    if (Object.keys(changedFields).length > 0) {
      await ActivityService.createActivity({
        leadId: lead._id,
        type: ACTIVITY_TYPES.LEAD_UPDATED,
        description: 'Lead details updated',
        performedBy: req.user.id,
        metadata: { changedFields }
      });
    }

    const populatedLead = await Lead.findById(lead._id)
      .populate('assignedTo', 'name email');

    sendSuccess(res, 'Lead updated successfully', populatedLead);
  } catch (error) {
    console.error('Update lead error:', error);
    sendBadRequest(res, 'Failed to update lead');
  }
};

const deleteLead = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return sendNotFound(res, 'Lead not found');
    }

    await Lead.findByIdAndDelete(req.params.id);

    sendSuccess(res, 'Lead deleted successfully');
  } catch (error) {
    console.error('Delete lead error:', error);
    sendBadRequest(res, 'Failed to delete lead');
  }
};

const getLeadStatsOverview = async (req, res) => {
  try {
    const baseMatch = isTeamUser(req.user) ? { assignedTo: req.user.id } : {};

    const totalLeads = await Lead.countDocuments(baseMatch);
    const newLeads = await Lead.countDocuments({ ...baseMatch, status: LEAD_STATUSES.NEW });
    const contactedLeads = await Lead.countDocuments({ ...baseMatch, status: LEAD_STATUSES.CONTACTED });
    const interestedLeads = await Lead.countDocuments({ ...baseMatch, status: LEAD_STATUSES.INTERESTED });
    const negotiationLeads = await Lead.countDocuments({ ...baseMatch, status: LEAD_STATUSES.NEGOTIATION });
    const convertedLeads = await Lead.countDocuments({ ...baseMatch, status: LEAD_STATUSES.CONVERTED });
    const lostLeads = await Lead.countDocuments({ ...baseMatch, status: LEAD_STATUSES.LOST });

    const totalRevenue = await Lead.aggregate([
      { $match: { ...baseMatch, status: LEAD_STATUSES.CONVERTED } },
      { $group: { _id: null, total: { $sum: '$dealValue' } } }
    ]);

    const leadsBySource = await Lead.aggregate([
      { $match: baseMatch },
      { $group: { _id: '$source', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(2) : 0;

    sendSuccess(res, 'Lead statistics retrieved successfully', {
      totalLeads,
      newLeads,
      contactedLeads,
      interestedLeads,
      negotiationLeads,
      convertedLeads,
      lostLeads,
      totalRevenue: totalRevenue[0]?.total || 0,
      conversionRate,
      leadsBySource
    });
  } catch (error) {
    console.error('Get lead stats error:', error);
    sendBadRequest(res, 'Failed to retrieve lead statistics');
  }
};

module.exports = {
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  addLeadCommunication,
  deleteLead,
  getLeadStatsOverview
};