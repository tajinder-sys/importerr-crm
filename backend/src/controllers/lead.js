const mongoose = require('mongoose');
const Lead = require('../models/lead');
const Activity = require('../models/Activity');
const Communication = require('../models/Communication');
const User = require('../models/User');
const ActivityService = require('../services/ActivityService');
const CommunicationService = require('../services/CommunicationService');
const { sendSuccess, sendBadRequest, sendNotFound, sendForbidden } = require('../utils/responseHandler');
const { validateLeadData } = require('../utils/validators');
const { LEAD_STATUSES, ACTIVITY_TYPES, USER_ROLES, COMMUNICATION_SOURCES, TASK_PRIORITY_LEVELS } = require('../utils/constants');
const Pipeline = require('../models/Pipeline');
const Stage = require('../models/Stage');
const Task = require('../models/Task');

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
      skip: skipRaw,
      status,
      source,
      assignedTo,
      priority,
      stageId,
      pipelineId,
      search,
      accountId,
      sortBy = 'priority',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    if (status) query.status = status;
    if (source) query.source = source;
    if (assignedTo) query.assignedTo = assignedTo;
    if (priority) query.priority = priority;
    if (stageId) query.stageId = mongoose.Types.ObjectId.isValid(stageId) ? new mongoose.Types.ObjectId(stageId) : stageId;
    if (pipelineId) query.pipelineId = mongoose.Types.ObjectId.isValid(pipelineId) ? new mongoose.Types.ObjectId(pipelineId) : pipelineId;
    if (accountId) query.accountId = accountId;

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

    // Only get leads that have pipelineId and stageId set (unless specifically filtered)
    if (!pipelineId) {
      query.pipelineId = { $exists: true, $ne: null };
    }
    if (!stageId) {
      query.stageId = { $exists: true, $ne: null };
    }

    const allowedSort = new Set(['name', 'email', 'phone', 'createdAt', 'updatedAt', 'status', 'source', 'priority']);
    const sortField = allowedSort.has(String(sortBy)) ? String(sortBy) : 'createdAt';
    const sortDir = sortOrder === 'desc' ? -1 : 1;

    const limitNum = Math.min(200, Math.max(1, parseInt(String(limit), 10) || 10));
    let skipVal;
    if (skipRaw !== undefined && skipRaw !== null && skipRaw !== '') {
      const s = parseInt(String(skipRaw), 10);
      skipVal = Number.isFinite(s) && s >= 0 ? s : 0;
    } else {
      const p = Math.max(1, parseInt(String(page), 10) || 1);
      skipVal = (p - 1) * limitNum;
    }
    const pageNum = Math.floor(skipVal / limitNum) + 1;

    let leads;
    if (sortField === 'priority') {
      const ranked = await Lead.aggregate([
        { $match: query },
        {
          $addFields: {
            _priorityRank: {
              $switch: {
                branches: [
                  { case: { $eq: ['$priority', TASK_PRIORITY_LEVELS.LOW] }, then: 1 },
                  { case: { $eq: ['$priority', TASK_PRIORITY_LEVELS.MEDIUM] }, then: 2 },
                  { case: { $eq: ['$priority', TASK_PRIORITY_LEVELS.HIGH] }, then: 3 },
                  { case: { $eq: ['$priority', TASK_PRIORITY_LEVELS.URGENT] }, then: 4 },
                ],
                default: 1,
              },
            },
          },
        },
        { $sort: { _priorityRank: sortDir, _id: sortDir } },
        { $skip: skipVal },
        { $limit: limitNum },
        { $project: { _id: 1 } },
      ]);

      const orderedIds = ranked.map((r) => String(r._id));
      const docs = await Lead.find({ _id: { $in: orderedIds } })
        .populate('assignedTo', 'name email')
        .populate('pipelineId', 'name')
        .populate('stageId', 'name order color followUpDays probabilityPercent')
        .lean();

      const byId = new Map(docs.map((d) => [String(d._id), d]));
      leads = orderedIds.map((id) => byId.get(id)).filter(Boolean);
    } else {
      const sort = { [sortField]: sortDir, _id: sortDir };
      leads = await Lead.find(query)
        .populate('assignedTo', 'name email')
        .populate('pipelineId', 'name')
        .populate('stageId', 'name order color followUpDays probabilityPercent')
        .sort(sort)
        .limit(limitNum)
        .skip(skipVal)
        .lean();
    }

    const leadIds = leads.map((lead) => lead._id);

    const tasks = await Task.find({
      lead_id: { $in: leadIds },
      deletedAt: { $exists: false }
    })

    const tasksMap = {};

    tasks.forEach((task) => {
      const leadId = task.lead_id.toString();

      if (!tasksMap[leadId]) {
        tasksMap[leadId] = [];
      }

      tasksMap[leadId].push(task);
    });

    const total = await Lead.countDocuments(query);
    const leadsWithTasks = leads.map((lead) => ({
      ...lead,
      tasks: tasksMap[lead._id.toString()] || []
    }));
    sendSuccess(res, 'Leads retrieved successfully', {
      leads: leadsWithTasks,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
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
      .populate('duplicateOf', 'name email')
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

    const tasks = await Task.find({
      lead_id: lead._id,
      deletedAt: { $exists: false }
    })
    .populate('assigned_to', 'name email')
    .populate('created_by', 'name email')
    .sort({ createdAt: -1 });
    
    sendSuccess(res, 'Lead retrieved successfully', {
      lead,
      activities,
      communications,
      tasks
    });
  } catch (error) {
    console.error('Get lead error:', error);
    sendBadRequest(res, 'Failed to retrieve lead');
  }
};

const createOrUpdateLead = async (req, res) => {
  try {
    const isExplicitUpdate = Boolean(req.params?.id);

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
      status,
      priority,
      assignedTo,
      leadType       = 'guest',
      userId         = null,
      pipelineId,
      stageId,
      productId,
      productSku,
      variants,
      totalQuantity,
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

    let resolvedPipelineId = pipelineId || null;
    let resolvedStageId    = stageId    || null;

    if (resolvedPipelineId) {
      const pipeline = await Pipeline.findById(resolvedPipelineId);
      if (!pipeline) {
        return sendBadRequest(res, 'Invalid pipeline selected');
      }

      if (resolvedStageId) {
        const stage = await Stage.findOne({
          _id:        resolvedStageId,
          pipelineId: resolvedPipelineId,
        });
        if (!stage) {
          return sendBadRequest(res, 'Selected stage does not belong to the chosen pipeline');
        }
      } else {
        // Auto-assign the first stage when pipeline is set but stage is not
        const firstStage = await Stage.findOne({ pipelineId: resolvedPipelineId }).sort({ order: 1 });
        if (firstStage) resolvedStageId = firstStage._id;
      }
    }

    let lead         = null;
    let isNewLead    = false;

    if (isExplicitUpdate) {
      lead = await Lead.findById(req.params.id);
      if (!lead) return sendNotFound(res, 'Lead not found');

    } else {
      if (phone || email) {
        lead = await Lead.findOne({
          $or: [
            ...(phone ? [{ phone }] : []),
            ...(email ? [{ email }] : []),
          ],
          duplicateOf: { $exists: false },
        });
      }

      if (!lead) {
        lead      = new Lead({ lastInteraction: new Date() });
        isNewLead = true;
      }
    }

    const snapshot = {
      name:           lead.name,
      phone:          lead.phone,
      email:          lead.email,
      source:         lead.source,
      message:        lead.message,
      status:         lead.status,
      priority:       lead.priority ?? TASK_PRIORITY_LEVELS.LOW,
      assignedTo:     lead.assignedTo?.toString()      || null,
      dealValue:      lead.dealValue,
      leadType:       lead.leadType,
      userId:         lead.userId,
      cartId:         lead.cartId,
      pipelineId:     lead.pipelineId?.toString()      || null,
      stageId:        lead.stageId?.toString()         || null,
    };

    if (name            !== undefined) lead.name             = name;
    if (phone           !== undefined) lead.phone            = phone;
    if (email           !== undefined) lead.email            = email;
    if (source          !== undefined) lead.source           = source;
    if (message         !== undefined) lead.message          = message;
    if (status          !== undefined) lead.status           = status;
    if (priority        !== undefined && Object.values(TASK_PRIORITY_LEVELS).includes(priority)) {
      lead.priority = priority;
    }
    if (leadType        !== undefined) lead.leadType         = leadType;
    if (userId          !== undefined) lead.userId           = userId          || null;

    if (resolvedAssignedTo !== undefined) {
      lead.assignedTo = resolvedAssignedTo || null;
    }

    if (resolvedPipelineId) lead.pipelineId = resolvedPipelineId;
    if (resolvedStageId)    lead.stageId    = resolvedStageId;

    if (isExplicitUpdate) {
      if (productId !== undefined) {
        lead.productId = productId ? String(productId).trim() : null;
      }
      if (productSku !== undefined) {
        lead.productSku = productSku ? String(productSku).trim() : null;
      }
      if (variants !== undefined) {
        lead.variants =
          variants && typeof variants === 'object'
            ? JSON.parse(JSON.stringify(variants))
            : null;
      }
      if (totalQuantity !== undefined) {
        lead.totalQuantity = Number(totalQuantity) >= 0 ? Number(totalQuantity) : 0;
      }
    }

    lead.lastInteraction = new Date();
    await lead.save();

    if (source && message) {
      await createInboundClientCommunication({ leadId: lead._id, source, message });
    }

    if (isNewLead) {
      await ActivityService.createActivity({
        leadId:      lead._id,
        type:        ACTIVITY_TYPES.LEAD_CREATED,
        description: `Lead created for ${lead.name}`,
        performedBy: req.user.id,
        metadata:    { source, pipelineId: resolvedPipelineId, stageId: resolvedStageId },
      });

    } else {
      const newAssignedTo = lead.assignedTo?.toString() || null;

      if (snapshot.status !== lead.status) {
        await ActivityService.createActivity({
          leadId:      lead._id,
          type:        ACTIVITY_TYPES.STATUS_UPDATED,
          description: `Status changed from "${snapshot.status}" to "${lead.status}"`,
          performedBy: req.user.id,
          metadata:    { oldStatus: snapshot.status, newStatus: lead.status },
        });
      }

      if (snapshot.assignedTo !== newAssignedTo) {
        await ActivityService.createActivity({
          leadId:      lead._id,
          type:        ACTIVITY_TYPES.LEAD_ASSIGNED,
          description: `Lead ${newAssignedTo ? 'assigned to new agent' : 'unassigned'}`,
          performedBy: req.user.id,
          metadata:    { oldAssignedTo: snapshot.assignedTo, newAssignedTo },
        });
      }

      const TRACKED_FIELDS = [
        'name', 'phone', 'email', 'source', 'message',
        'priority',
        'leadType',
        'userId',
        'pipelineId', 'stageId',
      ];

      const changedFields = {};
      TRACKED_FIELDS.forEach((field) => {
        const oldVal = snapshot[field]       ?? null;
        const newVal = lead[field]?.toString() ?? null;
        if (String(oldVal) !== String(newVal)) {
          changedFields[field] = { oldValue: oldVal, newValue: newVal };
        }
      });

      if (Object.keys(changedFields).length > 0) {
        await ActivityService.createActivity({
          leadId:      lead._id,
          type:        ACTIVITY_TYPES.LEAD_UPDATED,
          description: isExplicitUpdate
            ? 'Lead details updated'
            : `Existing lead updated for ${lead.name}`,
          performedBy: req.user.id,
          metadata:    { changedFields },
        });
      }
    }

    // ── 9. Return populated lead ─────────────────────────────────────────────
    const populatedLead = await Lead.findById(lead._id)
      .populate('assignedTo', 'name email')
      .populate('pipelineId', 'name')
      .populate('stageId',    'name color order followUpDays probabilityPercent');

    const message_  = isNewLead             ? 'Lead created successfully'
                    : isExplicitUpdate       ? 'Lead updated successfully'
                    :                          'Existing lead updated successfully';

    return sendSuccess(res, message_, populatedLead);

  } catch (error) {
    console.error('createOrUpdateLead error:', error);
    return sendBadRequest(res, 'Failed to save lead');
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
      conversionRate,
      leadsBySource
    });
  } catch (error) {
    console.error('Get lead stats error:', error);
    sendBadRequest(res, 'Failed to retrieve lead statistics');
  }
};

const updateLeadStage = async (req, res) => {
  try {
    const { id }      = req.params;
    const { stageId } = req.body;

    if (!stageId) {
      return sendBadRequest(res, 'stageId is required');
    }

    const lead = await Lead.findById(id);
    if (!lead) {
      return sendNotFound(res, 'Lead not found');
    }

    if (lead.stageId?.toString() === stageId) {
      const populated = await Lead.findById(id)
        .populate('stageId',    'name color order followUpDays probabilityPercent')
        .populate('pipelineId', 'name');
      return sendSuccess(res, 'Lead is already in this stage', populated);
    }

    const newStage = await Stage.findById(stageId);

    if (!newStage) {
      return sendBadRequest(res, 'Stage not found');
    }

    if (!newStage.isActive) {
      return sendBadRequest(res, 'Cannot move lead to an inactive stage');
    }

    if (
      lead.pipelineId &&
      newStage.pipelineId.toString() !== lead.pipelineId.toString()
    ) {
      return sendBadRequest(res, 'Stage does not belong to the lead\'s pipeline');
    }

    const oldStageId    = lead.stageId?.toString()    || null;
    const oldPipelineId = lead.pipelineId?.toString() || null;
    const oldPipelineName = await Pipeline.findById(oldPipelineId).select('name');
    const newPipelineName = await Pipeline.findById(newStage.pipelineId).select('name');

    lead.stageId         = newStage._id;
    lead.pipelineId      = newStage.pipelineId; // keep pipeline in sync
    lead.lastInteraction = new Date();

    await lead.save();
    const oldStageName = await Stage.findById(oldStageId).select('name');
    await ActivityService.createActivity({
      leadId:      lead._id,
      type:        ACTIVITY_TYPES.STAGE_CHANGED,
      description: `Stage changed from "${oldStageName?.name || 'none'}" to "${newStage?.name || 'none'}"`,
      performedBy: req.user.id,
      metadata: {
        oldStageName: oldStageName?.name || 'none',
        newStageId:    newStage._id.toString(),
        newStageName:  newStage?.name || 'none',
        oldPipelineName: oldPipelineName?.name || 'none',
        newPipelineName: newPipelineName?.name || 'none',
      },
    });

    const updatedLead = await Lead.findById(lead._id)
      .populate('assignedTo', 'name email')
      .populate('pipelineId', 'name')
      .populate('stageId',    'name color order followUpDays probabilityPercent');

    return sendSuccess(res, `Lead ${lead.name || ''} moved to ${newStage?.name || 'none'}`, updatedLead);

  } catch (error) {
    console.error('updateLeadStage error:', error);
    return sendBadRequest(res, 'Failed to update lead stage');
  }
};

module.exports = {
  getLeads,
  getLeadById,
  createOrUpdateLead,
  addLeadCommunication,
  deleteLead,
  getLeadStatsOverview,
  updateLeadStage
};