const mongoose = require('mongoose');
const Lead = require('../models/lead');
const Stage = require('../models/Stage');
const ActivityService = require('./ActivityService');
const { pauseLeadStageSession } = require('./leadStageProgressService');
const { ACTIVITY_TYPES } = require('../utils/constants');

function resolveObjectId(value) {
  if (value == null || value === '') return null;
  if (value instanceof mongoose.Types.ObjectId) return value;
  const raw =
    typeof value === 'object' && value !== null && value._id != null ? value._id : value;
  const s = String(raw).trim();
  if (!mongoose.Types.ObjectId.isValid(s) || s.length !== 24) return null;
  return new mongoose.Types.ObjectId(s);
}

function resolvePipelineId(leadOrPipelineRef) {
  if (!leadOrPipelineRef) return null;
  if (leadOrPipelineRef.pipelineId !== undefined) {
    return resolveObjectId(leadOrPipelineRef.pipelineId);
  }
  return resolveObjectId(leadOrPipelineRef);
}

function resolveStageId(leadOrStageRef) {
  if (!leadOrStageRef) return null;
  if (leadOrStageRef.stageId !== undefined) {
    return resolveObjectId(leadOrStageRef.stageId);
  }
  return resolveObjectId(leadOrStageRef);
}

async function getLastActiveStageForPipeline(pipelineId) {
  const pid = resolveObjectId(pipelineId);
  if (!pid) return null;
  return Stage.findOne({ pipelineId: pid, isActive: true }).sort({ order: -1 }).lean();
}

async function isLeadOnLastStage(lead) {
  const pid = resolvePipelineId(lead);
  const sid = resolveStageId(lead);
  if (!pid || !sid) return false;
  const last = await getLastActiveStageForPipeline(pid);
  if (!last) return false;
  return String(sid) === String(last._id);
}

async function getLeadCompletionMeta(lead) {
  const onLastStage = await isLeadOnLastStage(lead);
  const pid = resolvePipelineId(lead);
  const lastStage = onLastStage ? null : pid ? await getLastActiveStageForPipeline(pid) : null;
  return {
    isOnLastStage: onLastStage,
    canMarkCompleted: onLastStage && !lead?.isCompleted,
    lastStageName: lastStage?.name || null,
  };
}

async function markLeadCompleted(leadId, { completedNote, performedBy }) {
  const note = typeof completedNote === 'string' ? completedNote.trim() : '';
  if (!note) {
    const err = new Error('Completion note is required');
    err.statusCode = 400;
    throw err;
  }

  const lid = resolveObjectId(leadId);
  if (!lid) {
    const err = new Error('Invalid lead id');
    err.statusCode = 400;
    throw err;
  }

  const lead = await Lead.findById(lid);
  if (!lead) {
    const err = new Error('Lead not found');
    err.statusCode = 404;
    throw err;
  }
  if (lead.isCompleted) {
    const err = new Error('Lead is already marked as completed');
    err.statusCode = 400;
    throw err;
  }

  const onLast = await isLeadOnLastStage(lead);
  if (!onLast) {
    const err = new Error('Lead must be on the last stage of its pipeline to mark as completed');
    err.statusCode = 400;
    throw err;
  }

  const now = new Date();
  const stageOid = resolveStageId(lead);
  if (stageOid) {
    await pauseLeadStageSession(lead._id, stageOid, now, null);
  }

  lead.isCompleted = true;
  lead.completedNote = note;
  lead.completedAt = now;
  await lead.save();

  if (performedBy) {
    await ActivityService.logActivity({
      leadId: lead._id,
      type: ACTIVITY_TYPES.LEAD_COMPLETED,
      description: 'Lead marked as completed',
      performedBy,
      metadata: { completedNote: note, completedAt: now },
    });
  }

  const populated = await Lead.findById(lead._id)
    .populate('assignedTo', 'name email')
    .populate('pipelineId', 'name')
    .populate('stageId', 'name order color followUpDays probabilityPercent')
    .lean();

  return {
    lead: populated,
    isOnLastStage: true,
    canMarkCompleted: false,
    lastStageName: populated?.stageId?.name || null,
  };
}

module.exports = {
  resolveObjectId,
  resolvePipelineId,
  resolveStageId,
  getLastActiveStageForPipeline,
  isLeadOnLastStage,
  getLeadCompletionMeta,
  markLeadCompleted,
};
