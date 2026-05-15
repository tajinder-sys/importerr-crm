const mongoose = require('mongoose');
const User = require('../models/User');
const Pipeline = require('../models/Pipeline');
const Lead = require('../models/lead');
const Stage = require('../models/Stage');
const ActivityService = require('../services/ActivityService');
const { ACTIVITY_TYPES } = require('../utils/constants');
const {
  getLeadStageTimerDoc,
  overrideLeadStageSLA,
  getAssignedUserDueLeads,
  getOverdueLeadsForTeam,
  runMoveLeadToStageTransaction,
  getLeadStageHistoryForLead,
} = require('../services/leadStageProgressService');
const { sendSuccess, sendBadRequest, sendNotFound, sendForbidden } = require('../utils/responseHandler');
const { USER_ROLES } = require('../utils/constants');

const isAdminUser = (user) => user?.role === USER_ROLES.ADMIN;
const isTeamManagerUser = (user) => user?.role === USER_ROLES.TEAM_MANAGER;

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

async function assertLeadTimerAccess(req, leadId) {
  const lead = await Lead.findById(leadId).select('assignedTo pipelineId').lean();
  if (!lead) {
    return { ok: false, status: 404, message: 'Lead not found' };
  }
  if (isAdminUser(req.user)) return { ok: true, lead };

  const myUserId = String(req.user.id || req.user._id);
  const assignedUserId = lead?.assignedTo ? String(lead.assignedTo) : null;

  if (req.user.role === USER_ROLES.TEAM_MEMBER) {
    if (assignedUserId !== myUserId) return { ok: false, status: 403, message: 'You can only view timers for your assigned leads' };
    return { ok: true, lead };
  }

  if (isTeamManagerUser(req.user)) {
    const mt = req.user.teamId || req.user.team_id;
    let ok = await leadPipelineBelongsToTeam(lead, mt);
    if (!ok && assignedUserId) {
      const assignee = await User.findById(assignedUserId).select('team_id').lean();
      ok = Boolean(assignee && String(assignee.team_id) === String(mt));
    }
    if (!ok) return { ok: false, status: 403, message: 'You can only view leads for your team' };
    return { ok: true, lead };
  }

  return { ok: false, status: 403, message: 'Insufficient permissions' };
}

async function getLeadStageTimer(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendBadRequest(res, 'Invalid lead id');
    }
    const gate = await assertLeadTimerAccess(req, id);
    if (!gate.ok) {
      if (gate.status === 404) return sendNotFound(res, gate.message);
      return sendForbidden(res, gate.message);
    }

    const data = await getLeadStageTimerDoc(id, { createIfMissing: true });
    return sendSuccess(res, 'Stage timer retrieved', data);
  } catch (err) {
    if (err.statusCode === 400) return sendBadRequest(res, err.message);
    console.error('getLeadStageTimer error:', err);
    return sendBadRequest(res, 'Failed to load stage timer');
  }
}

async function overrideLeadStageSLAHandler(req, res) {
  try {
    if (!isAdminUser(req.user)) {
      return sendForbidden(res, 'Admin only');
    }
    const { leadId, stageId } = req.params;
    const { allowedSeconds, overrideReason } = req.body || {};
    if (!mongoose.Types.ObjectId.isValid(leadId) || !mongoose.Types.ObjectId.isValid(stageId)) {
      return sendBadRequest(res, 'Invalid lead or stage id');
    }
    const data = await overrideLeadStageSLA(
      leadId,
      stageId,
      allowedSeconds,
      req.user.id || req.user._id,
      overrideReason
    );
    return sendSuccess(res, 'SLA updated', data);
  } catch (err) {
    if (err.statusCode === 400) return sendBadRequest(res, err.message);
    if (err.statusCode === 404) return sendNotFound(res, err.message);
    console.error('overrideLeadStageSLAHandler error:', err);
    return sendBadRequest(res, 'Failed to override SLA');
  }
}

async function getAssignedUserDueLeadsHandler(req, res) {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return sendBadRequest(res, 'Invalid user id');
    }
    const myUserId = String(req.user.id || req.user._id);
    const target = String(userId);

    if (!isAdminUser(req.user) && !isTeamManagerUser(req.user) && myUserId !== target) {
      return sendForbidden(res, 'You can only view your own due leads');
    }

    if (isTeamManagerUser(req.user) && myUserId !== target) {
      const assignee = await User.findById(userId).select('team_id isActive').lean();
      const mt = req.user.teamId || req.user.team_id;
      if (!assignee?.isActive || String(assignee.team_id) !== String(mt)) {
        return sendForbidden(res, 'You can only view due leads for members of your team');
      }
    }

    const withinRaw = req.query.withinSeconds;
    const withinSeconds =
      withinRaw !== undefined && withinRaw !== ''
        ? Math.min(30 * 86400, Math.max(0, parseInt(String(withinRaw), 10) || 86400))
        : 86400;

    const rows = await getAssignedUserDueLeads(userId, { withinSeconds });
    return sendSuccess(res, 'Due leads retrieved', { leads: rows, withinSeconds });
  } catch (err) {
    console.error('getAssignedUserDueLeadsHandler error:', err);
    return sendBadRequest(res, 'Failed to load due leads');
  }
}

async function getOverdueLeadsHandler(req, res) {
  try {
    const { teamId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(teamId)) {
      return sendBadRequest(res, 'Invalid team id');
    }

    if (isAdminUser(req.user)) {
      const rows = await getOverdueLeadsForTeam(teamId);
      return sendSuccess(res, 'Overdue leads retrieved', { leads: rows });
    }

    if (isTeamManagerUser(req.user)) {
      const mt = req.user.teamId || req.user.team_id;
      if (String(mt) !== String(teamId)) {
        return sendForbidden(res, 'You can only view overdue leads for your team');
      }
      const rows = await getOverdueLeadsForTeam(teamId);
      return sendSuccess(res, 'Overdue leads retrieved', { leads: rows });
    }

    return sendForbidden(res, 'Insufficient permissions');
  } catch (err) {
    console.error('getOverdueLeadsHandler error:', err);
    return sendBadRequest(res, 'Failed to load overdue leads');
  }
}

async function moveLeadToStageHandler(req, res) {
  try {
    const { id } = req.params;
    const { stageId } = req.body;
    if (!stageId) {
      return sendBadRequest(res, 'stageId is required');
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendBadRequest(res, 'Invalid lead id');
    }

    const lead = await Lead.findById(id);
    if (!lead) {
      return sendNotFound(res, 'Lead not found');
    }

    if (isTeamManagerUser(req.user)) {
      const mt = req.user.teamId || req.user.team_id;
      let ok = await leadPipelineBelongsToTeam(lead, mt);
      if (!ok && lead?.assignedTo) {
        const assignee = await User.findById(lead.assignedTo).select('team_id').lean();
        ok = Boolean(assignee && String(assignee.team_id) === String(mt));
      }
      if (!ok) {
        return sendForbidden(res, 'You can only update leads for your team');
      }
    }

    if (String(lead.stageId || '') === String(stageId)) {
      const populated = await Lead.findById(id)
        .populate('stageId', 'name color order followUpDays probabilityPercent')
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
    if (lead.pipelineId && String(newStage.pipelineId) !== String(lead.pipelineId)) {
      return sendBadRequest(res, "Stage does not belong to the lead's pipeline");
    }

    const oldStageId = lead.stageId?.toString() || null;
    const oldPipelineId = lead.pipelineId?.toString() || null;
    const oldStageName = oldStageId ? await Stage.findById(oldStageId).select('name').lean() : null;
    const oldPipelineName = oldPipelineId ? await Pipeline.findById(oldPipelineId).select('name').lean() : null;
    const newPipelineName = await Pipeline.findById(newStage.pipelineId).select('name').lean();

    const { lead: updatedLead, unchanged } = await runMoveLeadToStageTransaction(id, stageId);
    if (unchanged) {
      return sendSuccess(res, 'Lead is already in this stage', updatedLead);
    }

    await ActivityService.createActivity({
      leadId: lead._id,
      type: ACTIVITY_TYPES.STAGE_CHANGED,
      description: `Stage changed from "${oldStageName?.name || 'none'}" to "${newStage?.name || 'none'}"`,
      performedBy: req.user.id,
      metadata: {
        oldStageName: oldStageName?.name || 'none',
        newStageId: newStage._id.toString(),
        newStageName: newStage?.name || 'none',
        oldPipelineName: oldPipelineName?.name || 'none',
        newPipelineName: newPipelineName?.name || 'none',
      },
    });

    return sendSuccess(
      res,
      `Lead ${updatedLead.name || ''} moved to ${newStage?.name || 'none'}`,
      updatedLead
    );
  } catch (err) {
    if (err.statusCode === 404) return sendNotFound(res, err.message);
    if (err.statusCode === 400) return sendBadRequest(res, err.message);
    console.error('moveLeadToStageHandler error:', err);
    return sendBadRequest(res, 'Failed to update lead stage');
  }
}

async function getLeadStageHistory(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendBadRequest(res, 'Invalid lead id');
    }
    const gate = await assertLeadTimerAccess(req, id);
    if (!gate.ok) {
      if (gate.status === 404) return sendNotFound(res, gate.message);
      return sendForbidden(res, gate.message);
    }

    const history = await getLeadStageHistoryForLead(id, {
      currentStageId: gate.lead?.stageId,
    });
    return sendSuccess(res, 'Stage history retrieved', { stages: history });
  } catch (err) {
    console.error('getLeadStageHistory error:', err);
    return sendBadRequest(res, 'Failed to load stage history');
  }
}

module.exports = {
  getLeadStageTimer,
  getLeadStageHistory,
  overrideLeadStageSLAHandler,
  getAssignedUserDueLeadsHandler,
  getOverdueLeadsHandler,
  moveLeadToStageHandler,
};
