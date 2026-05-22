const mongoose = require('mongoose');
const Lead = require('../models/lead');
const Activity = require('../models/activity');
const Communication = require('../models/Communication');
const User = require('../models/User');
const ActivityService = require('../services/ActivityService');
const NotificationService = require('../services/NotificationService');
const CommunicationService = require('../services/CommunicationService');
const { sendSuccess, sendBadRequest, sendNotFound, sendForbidden } = require('../utils/responseHandler');
const { validateLeadData } = require('../utils/validators');
const { LEAD_STATUSES, ACTIVITY_TYPES, USER_ROLES, COMMUNICATION_SOURCES, TASK_PRIORITY_LEVELS } = require('../utils/constants');
const Pipeline = require('../models/Pipeline');
const Stage = require('../models/Stage');
const Task = require('../models/Task');
const leadStageProgressService = require('../services/leadStageProgressService');
const leadCompletionService = require('../services/leadCompletionService');
const { applyLeadCompletionFilter } = require('../utils/leadQueryFilters');
const { attachOrderStatusToLead, attachOrderStatusToLeads } = require('../services/orderStatusService');
const { sendEmail, replyInThread } = require('../services/gmailService');
const ConnectedAccount = require('../models/ConnectedAccount');
const isAdminUser = (user) => user?.role === 'admin';
const isTeamManagerUser = (user) => user?.role === USER_ROLES.TEAM_MANAGER;
const canAssignOthers = (user) =>
  user?.role === USER_ROLES.ADMIN || user?.role === USER_ROLES.TEAM_MANAGER;
const canViewLeadHistory = (user) =>
  user?.role === USER_ROLES.ADMIN || user?.role === USER_ROLES.TEAM_MANAGER;
const allowsFlexibleReplySource = (source) =>
  source === COMMUNICATION_SOURCES.IMPORTERR_INQUIRY;

async function getActivePipelineIdsForTeam(teamId) {
  if (!teamId) return [];
  const rows = await Pipeline.find({ teamId, isActive: true }).select('_id').lean();
  return rows.map((r) => r._id);
}

async function pipelineBelongsToTeam(pipelineIdStr, teamId) {
  if (!pipelineIdStr || !teamId) return false;
  const pl = await Pipeline.findById(pipelineIdStr).select('teamId').lean();
  return Boolean(pl?.teamId && String(pl.teamId) === String(teamId));
}

async function leadPipelineBelongsToTeam(leadDoc, teamId) {
  if (!leadDoc?.pipelineId || !teamId) return false;
  const pid = leadDoc.pipelineId._id ?? leadDoc.pipelineId;
  return pipelineBelongsToTeam(pid, teamId);
}

const createInboundClientCommunication = async ({
  leadId,
  source,
  message,
  preferredUserId = null,
}) => {
  if (!message || !String(message).trim()) return false;
  const trimmed = String(message).trim();
  const commExists = await Communication.findOne({
    lead: leadId,
    message: trimmed,
    source,
    direction: 'inbound',
  }).lean();
  if (commExists) return false;

  await Communication.create({
    lead: leadId,
    senderType: 'client',
    senderUser: null,
    source,
    direction: 'inbound',
    message: trimmed,
  });

  await ActivityService.logActivity({
    leadId,
    type: ACTIVITY_TYPES.COMMUNICATION_RECEIVED,
    description: `Inbound message via ${source}`,
    preferredUserId,
    metadata: { source, direction: 'inbound' },
  });

  return true;
};

const validateAssignableUser = async (assignedTo, pipelineId = null) => {
  if (!assignedTo) return { valid: true };

  const assignee = await User.findOne({
    _id: assignedTo,
    isActive: true,
    role: { $in: [USER_ROLES.TEAM_MEMBER, USER_ROLES.TEAM_MANAGER] },
  })
    .select('team_id')
    .lean();

  if (!assignee) {
    return { valid: false, message: 'assignedTo must be an active team member or team manager' };
  }

  if (pipelineId) {
    const pipeline = await Pipeline.findById(pipelineId).select('teamId').lean();
    if (!pipeline?.teamId) {
      return { valid: false, message: 'Invalid pipeline for assignment' };
    }
    if (String(assignee.team_id) !== String(pipeline.teamId)) {
      return { valid: false, message: 'Assignee must belong to the team for the selected pipeline' };
    }
  }

  return { valid: true };
};

/**
 * Mongoose casts filters for find/countDocuments, but aggregate $match does not.
 * Normalize ObjectId fields so priority (aggregate) path matches the same docs.
 */
const castLeadFilterForAggregate = (filter) => {
  const q = { ...filter };
  const toOid = (v) => {
    if (v == null) return v;
    if (v instanceof mongoose.Types.ObjectId) return v;
    if (typeof v === 'object' && !Array.isArray(v)) return v;
    const s = String(v);
    if (mongoose.Types.ObjectId.isValid(s) && s.length === 24) return new mongoose.Types.ObjectId(s);
    return v;
  };
  if (q.assignedTo !== undefined) q.assignedTo = toOid(q.assignedTo);
  if (q.stageId !== undefined) q.stageId = toOid(q.stageId);
  if (q.pipelineId !== undefined) q.pipelineId = toOid(q.pipelineId);
  return q;
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
      sortOrder = 'desc',
      completedOnly,
      dateFrom,
      dateTo,
    } = req.query;

    const query = { duplicateOf: { $in: [null, undefined] } };
    applyLeadCompletionFilter(query, {
      completedOnly: String(completedOnly).toLowerCase() === 'true',
    });

    if (status) query.status = status;
    if (source) query.source = source;
    if (priority) query.priority = priority;
    if (stageId) query.stageId = mongoose.Types.ObjectId.isValid(stageId) ? new mongoose.Types.ObjectId(stageId) : stageId;
    if (accountId) query.accountId = accountId;

    if (isAdminUser(req.user)) {
      if (assignedTo) query.assignedTo = assignedTo;
      if (pipelineId) {
        query.pipelineId = mongoose.Types.ObjectId.isValid(pipelineId)
          ? new mongoose.Types.ObjectId(pipelineId)
          : pipelineId;
      }
    } else if (isTeamManagerUser(req.user)) {
      const mt = req.user.teamId || req.user.team_id;
      if (!mt) {
        query._id = { $in: [] };
      } else if (pipelineId) {
        const allowed = await pipelineBelongsToTeam(pipelineId, mt);
        if (!allowed) {
          return sendForbidden(res, 'You can only view leads in your team\'s pipelines');
        }
        query.pipelineId = mongoose.Types.ObjectId.isValid(pipelineId)
          ? new mongoose.Types.ObjectId(pipelineId)
          : pipelineId;
        if (assignedTo) {
          const assignee = await User.findById(assignedTo).select('team_id isActive').lean();
          if (!assignee?.isActive || String(assignee.team_id) !== String(mt)) {
            return sendForbidden(res, 'You can only filter by members of your team');
          }
          query.assignedTo = assignedTo;
        }
      } else {
        const pipelineIds = await getActivePipelineIdsForTeam(mt);
        if (pipelineIds.length) {
          query.pipelineId = { $in: pipelineIds };
        } else {
          query._id = { $in: [] };
        }
        if (assignedTo) {
          const assignee = await User.findById(assignedTo).select('team_id isActive').lean();
          if (!assignee?.isActive || String(assignee.team_id) !== String(mt)) {
            return sendForbidden(res, 'You can only filter by members of your team');
          }
          query.assignedTo = assignedTo;
        }
      }
    } else if (req.user.role === USER_ROLES.TEAM_MEMBER) {
      const memberId = req.user.id || req.user._id;
      query.assignedTo = memberId;
      const mt = req.user.teamId || req.user.team_id;
      if (pipelineId) {
        const allowed = mt && (await pipelineBelongsToTeam(pipelineId, mt));
        if (!allowed) {
          return sendForbidden(res, 'You can only view leads in your team\'s pipelines');
        }
        query.pipelineId = mongoose.Types.ObjectId.isValid(pipelineId)
          ? new mongoose.Types.ObjectId(pipelineId)
          : pipelineId;
      } else if (mt) {
        const pipelineIds = await getActivePipelineIdsForTeam(mt);
        if (pipelineIds.length) {
          query.pipelineId = { $in: pipelineIds };
        } else {
          query._id = { $in: [] };
        }
      }
    } else {
      query._id = { $in: [] };
    }

    if (search) {
      query.$or = [
        { name:  { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    // date range filter
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo)   query.createdAt.$lte = new Date(new Date(dateTo).setHours(23, 59, 59, 999));
    }

    // Only get leads that have pipelineId and stageId set (unless already scoped by role)
    if (!query.pipelineId) {
      query.pipelineId = { $exists: true, $ne: null };
    }
    if (!stageId) {
      query.stageId = { $exists: true, $ne: null };
    }

    const allowedSort = new Set([
      'name',
      'email',
      'phone',
      'createdAt',
      'updatedAt',
      'completedAt',
      'status',
      'source',
      'priority',
    ]);
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
      const aggregateMatch = castLeadFilterForAggregate(query);
      const ranked = await Lead.aggregate([
        { $match: aggregateMatch },
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
    let leadsPayload = leadsWithTasks;
    try {
      leadsPayload = await leadStageProgressService.attachStageTimersToLeads(leadsWithTasks);
    } catch (slaListErr) {
      console.error('attachStageTimersToLeads:', slaListErr);
    }
    sendSuccess(res, 'Leads retrieved successfully', {
      leads: leadsPayload,
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

const getUnassignedLeads = async (req, res) => {
  try {
    if (!isAdminUser(req.user) && !isTeamManagerUser(req.user)) {
      return sendForbidden(res, 'Insufficient permissions');
    }

    const {
      page = 1,
      limit = 10,
      skip: skipRaw,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const notDuplicate = { duplicateOf: { $in: [null, undefined] } };

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

    let roleMatch;
    if (isAdminUser(req.user)) {
      roleMatch = {
        $and: [
          notDuplicate,
          {
            $or: [
              { pipelineId: { $exists: false } },
              { pipelineId: null },
              { assignedTo: { $exists: false } },
              { assignedTo: null },
            ],
          },
        ],
      };
    } else {
      const mt = req.user.teamId || req.user.team_id;
      const pipelineIds = await getActivePipelineIdsForTeam(mt);
      if (!pipelineIds.length) {
        return sendSuccess(res, 'Unassigned leads retrieved successfully', {
          leads: [],
          pagination: {
            page: 1,
            limit: limitNum,
            total: 0,
            pages: 0,
          },
        });
      }
      roleMatch = {
        $and: [
          notDuplicate,
          { pipelineId: { $in: pipelineIds } },
          {
            $or: [
              { assignedTo: { $exists: false } },
              { assignedTo: null },
            ],
          },
        ],
      };
    }

    let query = roleMatch;
    applyLeadCompletionFilter(query, { completedOnly: false });
    if (search) {
      query = {
        $and: [
          roleMatch,
          {
            $or: [
              { name: { $regex: search, $options: 'i' } },
              { email: { $regex: search, $options: 'i' } },
              { phone: { $regex: search, $options: 'i' } },
            ],
          },
        ],
      };
    }

    const allowedSort = new Set([
      'name',
      'email',
      'phone',
      'createdAt',
      'updatedAt',
      'completedAt',
      'status',
      'source',
      'priority',
    ]);
    const sortField = allowedSort.has(String(sortBy)) ? String(sortBy) : 'createdAt';
    const sortDir = sortOrder === 'desc' ? -1 : 1;
    const sort = { [sortField]: sortDir, _id: sortDir };

    const leads = await Lead.find(query)
      .populate('assignedTo', 'name email')
      .populate('pipelineId', 'name')
      .populate('stageId', 'name order color followUpDays probabilityPercent')
      .sort(sort)
      .limit(limitNum)
      .skip(skipVal)
      .lean();

    const total = await Lead.countDocuments(query);
    const pages = total === 0 ? 0 : Math.ceil(total / limitNum);

    return sendSuccess(res, 'Unassigned leads retrieved successfully', {
      leads,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages,
      },
    });
  } catch (error) {
    console.error('getUnassignedLeads error:', error);
    return sendBadRequest(res, 'Failed to retrieve unassigned leads');
  }
};

const assertCanViewLead = async (req, lead) => {
  const assignedUserId = lead?.assignedTo?._id
    ? lead.assignedTo._id.toString()
    : lead?.assignedTo
      ? lead.assignedTo.toString()
      : null;

  const myUserId = req.user.id || req.user._id;
  if (req.user.role === USER_ROLES.TEAM_MEMBER && assignedUserId !== String(myUserId)) {
    return sendForbidden(res, 'You can only view your assigned leads');
  }

  if (isTeamManagerUser(req.user)) {
    const mt = req.user.teamId || req.user.team_id;
    let ok = await leadPipelineBelongsToTeam(lead, mt);
    if (!ok && assignedUserId) {
      const assignee = await User.findById(assignedUserId).select('team_id').lean();
      ok = Boolean(assignee && String(assignee.team_id) === String(mt));
    }
    if (!ok) {
      return sendForbidden(res, 'You can only view leads for your team');
    }
  }

  return null;
};

const buildRelatedLeadMatchConditions = (lead) => {
  const conditions = [];
  const email = lead.email?.trim().toLowerCase();
  if (email) conditions.push({ email });
  const phone = lead.phone?.trim();
  if (phone) conditions.push({ phone });
  const userId = lead.userId?.trim();
  if (userId) conditions.push({ userId });
  const productSku = lead.productSku?.trim();
  if (productSku) conditions.push({ productSku });
  return conditions;
};

const getMatchReasonsForRelatedLead = (anchor, candidate) => {
  const reasons = [];
  const anchorEmail = anchor.email?.trim().toLowerCase();
  const candidateEmail = candidate.email?.trim().toLowerCase();
  if (anchorEmail && candidateEmail && anchorEmail === candidateEmail) reasons.push('email');
  if (anchor.phone && candidate.phone && String(anchor.phone) === String(candidate.phone)) {
    reasons.push('phone');
  }
  if (anchor.userId && candidate.userId && String(anchor.userId) === String(candidate.userId)) {
    reasons.push('userId');
  }
  if (
    anchor.productSku &&
    candidate.productSku &&
    String(anchor.productSku) === String(candidate.productSku)
  ) {
    reasons.push('productSku');
  }
  return reasons;
};

const getLeadById = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate('assignedTo', 'name email')
      .populate('duplicateOf', 'name email')
      .populate('pipelineId', 'name')
      .populate('stageId', 'name color')
    if (!lead) {
      return sendNotFound(res, 'Lead not found');
    }

    const forbidden = await assertCanViewLead(req, lead);
    if (forbidden) return forbidden;

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
    
    let leadPlain = lead.toObject ? lead.toObject() : lead;
    try {
      leadPlain = await attachOrderStatusToLead(leadPlain);
    } catch (orderStatusErr) {
      console.error('attachOrderStatusToLead:', orderStatusErr.message);
    }
    const completion = await leadCompletionService.getLeadCompletionMeta(leadPlain);
    const currentStageId = leadPlain.stageId?._id ?? leadPlain.stageId;
    const stageHistory = await leadStageProgressService.getLeadStageHistoryForLead(lead._id, {
      currentStageId,
    });

    sendSuccess(res, 'Lead retrieved successfully', {
      lead: leadPlain,
      completion,
      stageHistory,
      activities,
      communications,
      tasks,
    });
  } catch (error) {
    console.error('Get lead error:', error);
    sendBadRequest(res, 'Failed to retrieve lead');
  }
};

const getRelatedLeads = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id).lean();
    if (!lead) {
      return sendNotFound(res, 'Lead not found');
    }

    const forbidden = await assertCanViewLead(req, lead);
    if (forbidden) return forbidden;

    const matchConditions = buildRelatedLeadMatchConditions(lead);
    if (!matchConditions.length) {
      return sendSuccess(res, 'No match fields on this lead', {
        related: [],
        matchFields: [],
      });
    }

    const matchFields = [
      ...(lead.email?.trim() ? ['email'] : []),
      ...(lead.phone?.trim() ? ['phone'] : []),
      ...(lead.userId?.trim() ? ['userId'] : []),
      ...(lead.productSku?.trim() ? ['productSku'] : []),
    ];

    const related = await Lead.find({
      _id: { $ne: lead._id },
      $or: matchConditions,
    })
      .select(
        'name email phone userId productSku importerOrderId source status priority createdAt assignedTo pipelineId stageId isCompleted message'
      )
      .populate('assignedTo', 'name email')
      .populate('pipelineId', 'name')
      .populate('stageId', 'name color')
      .sort({ createdAt: -1 })
      .limit(25)
      .lean();

    let enriched = related.map((item) => ({
      ...item,
      matchReasons: getMatchReasonsForRelatedLead(lead, item),
    }));
    try {
      enriched = await attachOrderStatusToLeads(enriched);
    } catch (orderStatusErr) {
      console.error('attachOrderStatusToLeads:', orderStatusErr.message);
    }

    return sendSuccess(res, 'Related leads retrieved successfully', {
      related: enriched,
      matchFields,
      total: enriched.length,
    });
  } catch (error) {
    console.error('getRelatedLeads error:', error);
    return sendBadRequest(res, 'Failed to retrieve related leads');
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
      totalAmount,
    } = req.body;

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

    if (isExplicitUpdate && isTeamManagerUser(req.user)) {
      const mt = req.user.teamId || req.user.team_id;
      const existingPid = lead.pipelineId && String(lead.pipelineId._id || lead.pipelineId);
      const targetPid = resolvedPipelineId || existingPid || null;
      if (targetPid) {
        if (!(await pipelineBelongsToTeam(targetPid, mt))) {
          return sendForbidden(res, 'You can only edit leads in your team\'s pipelines');
        }
      } else if (lead?.assignedTo) {
        const assignee = await User.findById(lead.assignedTo).select('team_id').lean();
        if (!assignee || String(assignee.team_id) !== String(mt)) {
          return sendForbidden(res, 'You can only edit leads for your team');
        }
      }
    }

    let resolvedAssignedTo = assignedTo;

    if (req.user.role === USER_ROLES.TEAM_MEMBER) {
      resolvedAssignedTo = req.user.id;
    } else if (assignedTo && canAssignOthers(req.user)) {
      const pipelineForAssignment =
        resolvedPipelineId ||
        (lead?.pipelineId && String(lead.pipelineId._id || lead.pipelineId)) ||
        null;
      if (!pipelineForAssignment) {
        return sendBadRequest(res, 'Select a pipeline before assigning this lead');
      }
      const assigneeValidation = await validateAssignableUser(assignedTo, pipelineForAssignment);
      if (!assigneeValidation.valid) {
        return sendBadRequest(res, assigneeValidation.message);
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
    if (totalAmount !== undefined) {
      const n = Number(totalAmount);
      lead.totalAmount = Number.isFinite(n) && n >= 0 ? n : 0;
    }

    lead.lastInteraction = new Date();
    await lead.save();

    const stageOrPipelineChanged =
      String(snapshot.pipelineId || '') !== String(lead.pipelineId?.toString() || '') ||
      String(snapshot.stageId || '') !== String(lead.stageId?.toString() || '');
    if (stageOrPipelineChanged && lead.stageId && lead.pipelineId) {
      try {
        await leadStageProgressService.syncLeadStageProgressOnLeadPatch(
          lead._id,
          snapshot.stageId,
          snapshot.pipelineId,
          lead.pipelineId,
          lead.stageId
        );
      } catch (slaErr) {
        console.error('Lead SLA sync after save:', slaErr);
      }
    }

    if (source && message) {
      await createInboundClientCommunication({
        leadId: lead._id,
        source,
        message,
        preferredUserId: lead.assignedTo,
      });
    }

    const newAssignedTo = lead.assignedTo?.toString() || null;
    const shouldNotifyAssignee =
      Boolean(newAssignedTo) && (isNewLead || snapshot.assignedTo !== newAssignedTo);

    if (isNewLead) {
      await ActivityService.logActivity({
        leadId: lead._id,
        type: ACTIVITY_TYPES.LEAD_CREATED,
        description: `Lead created for ${lead.name}`,
        performedBy: req.user.id,
        metadata: { source, pipelineId: resolvedPipelineId, stageId: resolvedStageId },
      });

      if (newAssignedTo) {
        await ActivityService.logActivity({
          leadId: lead._id,
          type: ACTIVITY_TYPES.LEAD_ASSIGNED,
          description: 'Lead assigned to new agent',
          performedBy: req.user.id,
          metadata: { oldAssignedTo: null, newAssignedTo },
        });
      }
    } else {
      if (snapshot.status !== lead.status) {
        await ActivityService.logActivity({
          leadId: lead._id,
          type: ACTIVITY_TYPES.STATUS_UPDATED,
          description: `Status changed from "${snapshot.status}" to "${lead.status}"`,
          performedBy: req.user.id,
          metadata: { oldStatus: snapshot.status, newStatus: lead.status },
        });
      }

      if (snapshot.assignedTo !== newAssignedTo) {
        await ActivityService.logActivity({
          leadId: lead._id,
          type: ACTIVITY_TYPES.LEAD_ASSIGNED,
          description: `Lead ${newAssignedTo ? 'assigned to new agent' : 'unassigned'}`,
          performedBy: req.user.id,
          metadata: { oldAssignedTo: snapshot.assignedTo, newAssignedTo },
        });
      }

      if (String(snapshot.stageId || '') !== String(lead.stageId?.toString() || '')) {
        const [oldStage, newStage] = await Promise.all([
          snapshot.stageId ? Stage.findById(snapshot.stageId).select('name').lean() : null,
          lead.stageId ? Stage.findById(lead.stageId).select('name').lean() : null,
        ]);
        await ActivityService.logActivity({
          leadId: lead._id,
          type: ACTIVITY_TYPES.STAGE_CHANGED,
          description: `Stage changed from "${oldStage?.name || 'none'}" to "${newStage?.name || 'none'}"`,
          performedBy: req.user.id,
          metadata: {
            oldStageId: snapshot.stageId,
            newStageId: lead.stageId?.toString() || null,
            oldStageName: oldStage?.name || 'none',
            newStageName: newStage?.name || 'none',
          },
        });
      }

      const TRACKED_FIELDS = [
        'name', 'phone', 'email', 'source', 'message',
        'priority',
        'leadType',
        'userId',
        'pipelineId',
      ];

      const changedFields = {};
      TRACKED_FIELDS.forEach((field) => {
        const oldVal = snapshot[field] ?? null;
        const newVal = lead[field]?.toString() ?? null;
        if (String(oldVal) !== String(newVal)) {
          changedFields[field] = { oldValue: oldVal, newValue: newVal };
        }
      });

      if (Object.keys(changedFields).length > 0) {
        await ActivityService.logActivity({
          leadId: lead._id,
          type: ACTIVITY_TYPES.LEAD_UPDATED,
          description: isExplicitUpdate
            ? 'Lead details updated'
            : `Existing lead updated for ${lead.name}`,
          performedBy: req.user.id,
          metadata: { changedFields },
        });
      }
    }

    if (shouldNotifyAssignee) {
      const assignee = await User.findById(newAssignedTo).select('team_id').lean();
      NotificationService.dispatch({
        type: 'lead_assigned',
        title: 'Lead assigned to you',
        body: `Lead "${lead.name}" has been assigned to you`,
        assigneeUserId: newAssignedTo,
        previousAssigneeUserId: snapshot.assignedTo || null,
        leadId: lead._id,
        teamId: assignee?.team_id || null,
        actionUrl: `/leads/${lead._id}`,
        actorUserId: req.user.id,
        dedupeKey: `lead_assigned:${lead._id}:${newAssignedTo}`,
      }).catch(() => {});
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
    const lead = await Lead.findById(req.params.id).select(
      '_id source assignedTo phone email accountId gmailThreadId'
    );
    if (!lead) {
      return sendNotFound(res, 'Lead not found');
    }

    if (req.user.role === USER_ROLES.TEAM_MEMBER && lead?.assignedTo?.toString() !== String(req.user.id || req.user._id)) {
      return sendForbidden(res, 'You can only communicate for your assigned leads');
    }

    if (isTeamManagerUser(req.user)) {
      const leadForScope = await Lead.findById(req.params.id).select('pipelineId assignedTo').lean();
      const mt = req.user.teamId || req.user.team_id;
      let ok = await leadPipelineBelongsToTeam(leadForScope, mt);
      if (!ok && leadForScope?.assignedTo) {
        const assignee = await User.findById(leadForScope.assignedTo).select('team_id').lean();
        ok = Boolean(assignee && String(assignee.team_id) === String(mt));
      }
      if (!ok) {
        return sendForbidden(res, 'You can only communicate for leads for your team');
      }
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
    const trimmedMessage = String(message).trim();
    const isGmailLeadReply =
      lead.source === COMMUNICATION_SOURCES.EMAIL &&
      selectedSource === COMMUNICATION_SOURCES.EMAIL;

    if (isGmailLeadReply) {
      if (!lead.accountId) {
        return sendBadRequest(res, 'No Gmail account is linked to this lead');
      }
      if (!lead.gmailThreadId) {
        return sendBadRequest(res, 'No email thread is linked to this lead');
      }
      if (!lead.email) {
        return sendBadRequest(res, 'Lead email is required to send a reply');
      }

      const account = await ConnectedAccount.findOne({
        accountId: lead.accountId,
        type: 'gmail',
        isActive: true
      });
      if (!account) {
        return sendNotFound(res, 'Gmail account not found');
      }
      if (!account.accessToken) {
        return sendBadRequest(res, 'Gmail account is not connected. Reconnect it in Settings.');
      }

      await replyInThread(account, {
        threadId: lead.gmailThreadId,
        toEmail: lead.email,
        replyMessage: trimmedMessage
      });
    } else {
      await CommunicationService.sendMessage({
        source: selectedSource,
        toPhone: lead.phone || '',
        toEmail: lead.email || '',
        message: trimmedMessage
      });
    }

    const communication = await Communication.create({
      lead: lead._id,
      senderType: 'team_member',
      senderUser: req.user.id,
      source: selectedSource,
      direction: 'outbound',
      message: trimmedMessage,
      ...(isGmailLeadReply && lead.gmailThreadId ? { threadId: lead.gmailThreadId } : {})
    });

    const populatedCommunication = await Communication.findById(communication._id).populate(
      'senderUser',
      'name email role'
    );

    await ActivityService.logActivity({
      leadId: lead._id,
      type: ACTIVITY_TYPES.COMMUNICATION_SENT,
      description: `Communication sent via ${selectedSource}`,
      performedBy: req.user.id,
      metadata: { source: selectedSource, direction: 'outbound' },
    });

    sendSuccess(res, 'Communication sent successfully', populatedCommunication);
  } catch (error) {
    console.error('Add lead communication error:', error);
    sendBadRequest(res, 'Failed to communicate with lead');
  }
};

const markLeadCompletedHandler = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id).select('assignedTo pipelineId stageId isCompleted');
    if (!lead) {
      return sendNotFound(res, 'Lead not found');
    }

    const assignedUserId = lead.assignedTo ? String(lead.assignedTo) : null;
    const myUserId = String(req.user.id || req.user._id);

    if (req.user.role === USER_ROLES.TEAM_MEMBER && assignedUserId !== myUserId) {
      return sendForbidden(res, 'You can only complete your assigned leads');
    }

    if (isTeamManagerUser(req.user)) {
      const mt = req.user.teamId || req.user.team_id;
      let ok = await leadPipelineBelongsToTeam(lead, mt);
      if (!ok && assignedUserId) {
        const assignee = await User.findById(assignedUserId).select('team_id').lean();
        ok = Boolean(assignee && String(assignee.team_id) === String(mt));
      }
      if (!ok) {
        return sendForbidden(res, 'You can only complete leads for your team');
      }
    }

    const result = await leadCompletionService.markLeadCompleted(req.params.id, {
      completedNote: req.body?.completedNote,
      performedBy: req.user.id || req.user._id,
    });

    return sendSuccess(res, 'Lead marked as completed', result);
  } catch (error) {
    if (error.statusCode === 400) return sendBadRequest(res, error.message);
    if (error.statusCode === 404) return sendNotFound(res, error.message);
    console.error('markLeadCompleted error:', error);
    return sendBadRequest(res, 'Failed to mark lead as completed');
  }
};

const deleteLead = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return sendNotFound(res, 'Lead not found');
    }

    await ActivityService.logActivity({
      leadId: lead._id,
      type: ACTIVITY_TYPES.LEAD_DELETED,
      description: `Lead deleted: ${lead.name || lead.email || lead.phone || 'Unknown'}`,
      performedBy: req.user.id,
      metadata: {
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        source: lead.source,
      },
    });

    await Lead.findByIdAndDelete(req.params.id);

    sendSuccess(res, 'Lead deleted successfully');
  } catch (error) {
    console.error('Delete lead error:', error);
    sendBadRequest(res, 'Failed to delete lead');
  }
};

const getLeadStatsOverview = async (req, res) => {
  try {
    const baseMatch = { duplicateOf: { $exists: false }, isCompleted: { $ne: true } };
    if (req.user.role === USER_ROLES.TEAM_MEMBER) {
      baseMatch.assignedTo = req.user.id || req.user._id;
    } else if (isTeamManagerUser(req.user)) {
      const mt = req.user.teamId || req.user.team_id;
      const pipelineIds = await getActivePipelineIdsForTeam(mt);
      if (pipelineIds.length) {
        baseMatch.pipelineId = { $in: pipelineIds };
      } else {
        baseMatch._id = { $in: [] };
      }
    }

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
}

const sendEmailToLead = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.leadId);
    if (!lead) {
      return sendNotFound(res, 'Lead not found');
    }
    const { subject, message } = req.body;
    if (!subject || !message) {
      return sendBadRequest(res, 'subject and message are required');
    }
    const account = await ConnectedAccount.findOne({
      accountId: lead.accountId,
      type: 'gmail',
      isActive: true
    });
    if (!account) {
      return sendNotFound(res, 'Gmail account not found');
    }
    if (lead.gmailThreadId) {
      await replyInThread(account, {
        threadId: lead.gmailThreadId,
        toEmail: lead.email,
        replyMessage: message
      });
    } else {
      await sendEmail(account, lead.email, subject, message);
    }

    await Communication.create({
      lead: lead._id,
      senderType: 'team_member',
      senderUser: req.user.id,
      source: COMMUNICATION_SOURCES.EMAIL,
      direction: 'outbound',
      message: String(message).trim(),
      ...(lead.gmailThreadId ? { threadId: lead.gmailThreadId } : {}),
    });

    await ActivityService.logActivity({
      leadId: lead._id,
      type: ACTIVITY_TYPES.COMMUNICATION_SENT,
      description: `Email sent: ${subject}`,
      performedBy: req.user.id,
      metadata: { source: COMMUNICATION_SOURCES.EMAIL, direction: 'outbound', subject },
    });

    return sendSuccess(res, 'Email sent successfully');
  } catch (error) {
    console.error('sendEmailToLead error:', error);
    sendBadRequest(res, 'Failed to send email to lead');
  }
}

module.exports = {
  getLeads,
  getUnassignedLeads,
  getLeadById,
  getRelatedLeads,
  createOrUpdateLead,
  addLeadCommunication,
  markLeadCompletedHandler,
  deleteLead,
  getLeadStatsOverview,
  sendEmailToLead
}