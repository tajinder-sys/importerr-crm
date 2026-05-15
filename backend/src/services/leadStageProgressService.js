const mongoose = require('mongoose');
const LeadStageProgress = require('../models/LeadStageProgress');
const Lead = require('../models/lead');
const Stage = require('../models/Stage');
const Pipeline = require('../models/Pipeline');

const MS = 1000;

/** Multi-document transactions require a replica set or mongos; standalone MongoDB throws IllegalOperation. */
function isTransactionUnsupportedError(err) {
  if (!err) return false;
  const msg = String(err.message || err.errmsg || '');
  return (
    err.code === 20 ||
    err.codeName === 'IllegalOperation' ||
    /replica set|mongos|transaction numbers/i.test(msg)
  );
}

function floorSecondsFromMs(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return Math.floor(ms / MS);
}

function allowedSecondsFromStage(stage) {
  if (!stage) return 0;
  const raw = stage.followUpDays;
  const days =
    raw == null || raw === '' ? 0 : Math.min(365, Math.max(0, Math.floor(Number(raw))));
  return days * 86400;
}

function computeView(progress, now = new Date()) {
  const allowedSeconds = Number(progress.allowedSeconds) || 0;
  const consumedSeconds = Number(progress.consumedSeconds) || 0;
  let runningSeconds = 0;
  if (progress.isActive && progress.currentEnteredAt) {
    runningSeconds = floorSecondsFromMs(now.getTime() - new Date(progress.currentEnteredAt).getTime());
  }
  const remainingSeconds = allowedSeconds - consumedSeconds - runningSeconds;
  const isOverdue = remainingSeconds <= 0;
  return {
    leadId: progress.leadId,
    stageId: progress.stageId,
    allowedSeconds,
    consumedSeconds,
    runningSeconds,
    remainingSeconds,
    isOverdue,
    isActive: Boolean(progress.isActive),
  };
}

function applyPersistedOverdue(progress, view) {
  progress.isOverdue = view.isOverdue;
}

async function pauseProgressDoc(progress, now, session) {
  if (!progress || !progress.isActive) return progress;

  const enteredAt = progress.currentEnteredAt ? new Date(progress.currentEnteredAt) : null;
  const sessionSeconds = enteredAt ? floorSecondsFromMs(now.getTime() - enteredAt.getTime()) : 0;

  progress.consumedSeconds = (Number(progress.consumedSeconds) || 0) + sessionSeconds;
  progress.isActive = false;
  progress.currentEnteredAt = null;
  progress.lastPausedAt = now;
  progress.totalPauseCount = (Number(progress.totalPauseCount) || 0) + 1;

  const view = computeView(progress, now);
  applyPersistedOverdue(progress, view);
  await progress.save(session ? { session } : {});
  return progress;
}

async function resumeOrCreateProgress({ leadId, pipelineId, stage, now, session }) {
  const stageId = stage._id;
  let progress = await LeadStageProgress.findOne({ leadId, stageId }).session(session || null);

  if (!progress) {
    progress = new LeadStageProgress({
      leadId,
      pipelineId,
      stageId,
      allowedSeconds: allowedSecondsFromStage(stage),
      consumedSeconds: 0,
      isActive: false,
      isOverdue: false,
      totalPauseCount: 0,
    });
  }

  progress.pipelineId = pipelineId;
  progress.isActive = true;
  progress.currentEnteredAt = now;

  const view = computeView(progress, now);
  applyPersistedOverdue(progress, view);
  await progress.save(session ? { session } : {});
  return progress;
}

async function pauseLeadStageSession(leadId, stageId, now, session) {
  if (!leadId || !stageId) return;
  const sid = stageId instanceof mongoose.Types.ObjectId ? stageId : new mongoose.Types.ObjectId(String(stageId));
  const lid = leadId instanceof mongoose.Types.ObjectId ? leadId : new mongoose.Types.ObjectId(String(leadId));
  const progress = await LeadStageProgress.findOne({ leadId: lid, stageId: sid }).session(session || null);
  if (progress) await pauseProgressDoc(progress, now, session);
}

/**
 * Move lead to a new stage: pause old stage SLA, update lead, resume/create new stage SLA.
 * Transaction-safe when session is provided (caller runs inside withTransaction).
 */
async function moveLeadToStage(leadId, newStageId, { session, now = new Date() } = {}) {
  const lid = leadId instanceof mongoose.Types.ObjectId ? leadId : new mongoose.Types.ObjectId(String(leadId));
  const nsid =
    newStageId instanceof mongoose.Types.ObjectId
      ? newStageId
      : new mongoose.Types.ObjectId(String(newStageId));

  const lead = await Lead.findById(lid).session(session || null);
  if (!lead) {
    const err = new Error('Lead not found');
    err.statusCode = 404;
    throw err;
  }

  const newStage = await Stage.findById(nsid).session(session || null);
  if (!newStage) {
    const err = new Error('Stage not found');
    err.statusCode = 400;
    throw err;
  }
  if (!newStage.isActive) {
    const err = new Error('Cannot move lead to an inactive stage');
    err.statusCode = 400;
    throw err;
  }

  const oldStageId = lead.stageId ? String(lead.stageId) : null;
  if (oldStageId === String(nsid)) {
    const populated = await Lead.findById(lid)
      .session(session || null)
      .populate('assignedTo', 'name email')
      .populate('pipelineId', 'name')
      .populate('stageId', 'name color order followUpDays probabilityPercent');
    return { lead: populated, unchanged: true };
  }

  if (
    lead.pipelineId &&
    String(newStage.pipelineId) !== String(lead.pipelineId)
  ) {
    const err = new Error("Stage does not belong to the lead's pipeline");
    err.statusCode = 400;
    throw err;
  }

  await pauseLeadStageSession(lead._id, lead.stageId, now, session);

  lead.stageId = newStage._id;
  lead.pipelineId = newStage.pipelineId;
  lead.lastInteraction = now;
  await lead.save(session ? { session } : {});

  await resumeOrCreateProgress({
    leadId: lead._id,
    pipelineId: newStage.pipelineId,
    stage: newStage,
    now,
    session,
  });

  const populated = await Lead.findById(lead._id)
    .session(session || null)
    .populate('assignedTo', 'name email')
    .populate('pipelineId', 'name')
    .populate('stageId', 'name color order followUpDays probabilityPercent');

  return { lead: populated, unchanged: false };
}

async function runMoveLeadToStageTransaction(leadId, newStageId) {
  const session = await mongoose.startSession();
  try {
    let out;
    await session.withTransaction(async () => {
      out = await moveLeadToStage(leadId, newStageId, { session, now: new Date() });
    });
    return out;
  } catch (err) {
    if (isTransactionUnsupportedError(err)) {
      return moveLeadToStage(leadId, newStageId, { session: null, now: new Date() });
    }
    throw err;
  } finally {
    await session.endSession();
  }
}

/**
 * When pipeline+stage change via lead update (possibly new pipeline): pause old pair, then apply new stage.
 * newStageId must belong to newPipelineId (validated by caller).
 */
async function syncLeadStageProgressOnLeadPatch(leadId, oldStageId, oldPipelineId, newPipelineId, newStageId) {
  if (!newStageId || !newPipelineId) return;

  const now = new Date();
  const execSync = async (session) => {
    await pauseLeadStageSession(leadId, oldStageId, now, session);
    const stage = await Stage.findById(newStageId).session(session || null);
    if (!stage) return;
    const lid = leadId instanceof mongoose.Types.ObjectId ? leadId : new mongoose.Types.ObjectId(String(leadId));
    await resumeOrCreateProgress({
      leadId: lid,
      pipelineId: newPipelineId || stage.pipelineId,
      stage,
      now,
      session,
    });
  };

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await execSync(session);
    });
  } catch (err) {
    if (isTransactionUnsupportedError(err)) {
      await execSync(null);
    } else {
      throw err;
    }
  } finally {
    await session.endSession();
  }
}

async function getLeadStageTimerDoc(leadId, { createIfMissing = false } = {}) {
  const lid = leadId instanceof mongoose.Types.ObjectId ? leadId : new mongoose.Types.ObjectId(String(leadId));
  const lead = await Lead.findById(lid).select('stageId pipelineId').lean();
  if (!lead || !lead.stageId) {
    const err = new Error('Lead has no active stage');
    err.statusCode = 400;
    throw err;
  }

  const stageId = lead.stageId;
  let progress = await LeadStageProgress.findOne({ leadId: lid, stageId });

  if (!progress && createIfMissing) {
    const stage = await Stage.findById(stageId);
    const pipelineId = lead.pipelineId || stage?.pipelineId;
    if (!stage || !pipelineId) {
      const err = new Error('Cannot resolve stage or pipeline for SLA');
      err.statusCode = 400;
      throw err;
    }
    progress = await resumeOrCreateProgress({
      leadId: lid,
      pipelineId,
      stage,
      now: new Date(),
      session: null,
    });
  }

  if (!progress) {
    const stage = await Stage.findById(stageId).lean();
    const allowedSeconds = allowedSecondsFromStage(stage);
    return {
      leadId: lid,
      stageId,
      allowedSeconds,
      consumedSeconds: 0,
      runningSeconds: 0,
      remainingSeconds: allowedSeconds,
      isOverdue: false,
      isActive: false,
    };
  }

  const view = computeView(progress, new Date());
  if (progress.isOverdue !== view.isOverdue) {
    progress.isOverdue = view.isOverdue;
    await progress.save();
  }

  return {
    leadId: lid,
    stageId: progress.stageId,
    ...view,
  };
}

async function overrideLeadStageSLA(leadId, stageId, allowedSeconds, adminUserId, overrideReason) {
  const allowed = Math.max(0, Math.floor(Number(allowedSeconds)));
  if (!Number.isFinite(allowed)) {
    const err = new Error('allowedSeconds must be a non-negative number');
    err.statusCode = 400;
    throw err;
  }
  const reason = overrideReason != null ? String(overrideReason).trim() : '';
  if (!reason) {
    const err = new Error('overrideReason is required');
    err.statusCode = 400;
    throw err;
  }

  const lid = leadId instanceof mongoose.Types.ObjectId ? leadId : new mongoose.Types.ObjectId(String(leadId));
  const sid = stageId instanceof mongoose.Types.ObjectId ? stageId : new mongoose.Types.ObjectId(String(stageId));

  const progress = await LeadStageProgress.findOne({ leadId: lid, stageId: sid });
  if (!progress) {
    const err = new Error('No SLA progress found for this lead and stage');
    err.statusCode = 404;
    throw err;
  }

  progress.allowedSeconds = allowed;
  progress.overriddenByAdmin = true;
  progress.overriddenBy = adminUserId;
  progress.overrideReason = reason;

  const view = computeView(progress, new Date());
  applyPersistedOverdue(progress, view);
  await progress.save();
  return {
    leadId: lid,
    stageId: sid,
    ...view,
  };
}

async function getAssignedUserDueLeads(userId, { withinSeconds = 86400 } = {}) {
  const uid =
    userId instanceof mongoose.Types.ObjectId ? userId : new mongoose.Types.ObjectId(String(userId));
  const leads = await Lead.find({
    assignedTo: uid,
    stageId: { $exists: true, $ne: null },
    duplicateOf: { $in: [null, undefined] },
  })
    .select('_id stageId name email pipelineId')
    .lean();

  if (!leads.length) return [];

  const leadIds = leads.map((l) => l._id);
  const progresses = await LeadStageProgress.find({
    leadId: { $in: leadIds },
    isActive: true,
  }).lean();

  const byLeadStage = new Map(
    progresses.map((p) => [`${p.leadId}_${p.stageId}`, p])
  );

  const now = new Date();
  const out = [];
  for (const l of leads) {
    const key = `${l._id}_${l.stageId}`;
    const p = byLeadStage.get(key);
    if (!p) continue;
    const view = computeView(
      {
        ...p,
        leadId: p.leadId,
        stageId: p.stageId,
        allowedSeconds: p.allowedSeconds,
        consumedSeconds: p.consumedSeconds,
        isActive: p.isActive,
        currentEnteredAt: p.currentEnteredAt,
      },
      now
    );
    if (view.isOverdue || (view.remainingSeconds > 0 && view.remainingSeconds <= withinSeconds)) {
      out.push({
        lead: l,
        timer: view,
      });
    }
  }

  out.sort((a, b) => a.timer.remainingSeconds - b.timer.remainingSeconds);
  return out;
}

function provisionalStageTimerFromLead(lead, now = new Date()) {
  const stage = lead.stageId && typeof lead.stageId === 'object' ? lead.stageId : null;
  const sid = stage?._id ?? lead.stageId;
  if (!sid) return null;
  const allowedSeconds = allowedSecondsFromStage(stage);
  const progressLike = {
    leadId: lead._id,
    stageId: sid,
    allowedSeconds,
    consumedSeconds: 0,
    isActive: false,
    currentEnteredAt: null,
  };
  return { ...computeView(progressLike, now), fetchedAt: now.toISOString() };
}

/**
 * Adds `stageTimer` to each lead (same shape as getLeadStageTimer) for list/kanban views.
 * Uses one batched query; does not create LeadStageProgress rows (provisional timer if missing).
 */
async function attachStageTimersToLeads(leads, { now = new Date() } = {}) {
  if (!Array.isArray(leads) || leads.length === 0) return leads;

  const pairKeys = new Set();
  const orPairs = [];

  for (const lead of leads) {
    const sid = lead.stageId && typeof lead.stageId === 'object' ? lead.stageId._id : lead.stageId;
    if (!sid || !lead._id) continue;
    const k = `${String(lead._id)}_${String(sid)}`;
    if (pairKeys.has(k)) continue;
    pairKeys.add(k);
    orPairs.push({ leadId: lead._id, stageId: sid });
  }

  if (orPairs.length === 0) {
    return leads.map((l) => ({ ...l, stageTimer: null }));
  }

  const progresses = await LeadStageProgress.find({ $or: orPairs }).lean();
  const pmap = new Map(
    progresses.map((p) => [`${String(p.leadId)}_${String(p.stageId)}`, p])
  );

  return leads.map((lead) => {
    const sid = lead.stageId && typeof lead.stageId === 'object' ? lead.stageId._id : lead.stageId;
    if (!sid || !lead._id) return { ...lead, stageTimer: null };
    const k = `${String(lead._id)}_${String(sid)}`;
    const p = pmap.get(k);
    if (p) {
      const view = computeView(p, now);
      return { ...lead, stageTimer: { ...view, fetchedAt: now.toISOString() } };
    }
    return { ...lead, stageTimer: provisionalStageTimerFromLead(lead, now) };
  });
}

async function getOverdueLeadsForTeam(teamId) {
  const tid = teamId instanceof mongoose.Types.ObjectId ? teamId : new mongoose.Types.ObjectId(String(teamId));
  const pipelineIds = await Pipeline.find({ teamId: tid, isActive: true }).distinct('_id');
  if (!pipelineIds.length) return [];

  const progresses = await LeadStageProgress.find({
    pipelineId: { $in: pipelineIds },
    isActive: true,
  })
    .populate('leadId', 'name email assignedTo stageId pipelineId')
    .lean();

  const now = new Date();
  const overdue = [];
  for (const p of progresses) {
    const leadDoc = p.leadId && typeof p.leadId === 'object' && p.leadId._id ? p.leadId : null;
    const view = computeView(
      {
        allowedSeconds: p.allowedSeconds,
        consumedSeconds: p.consumedSeconds,
        isActive: p.isActive,
        currentEnteredAt: p.currentEnteredAt,
        leadId: leadDoc?._id || p.leadId,
        stageId: p.stageId,
      },
      now
    );
    if (!view.isOverdue) continue;
    overdue.push({
      progressId: p._id,
      lead: leadDoc || p.leadId,
      stageId: p.stageId,
      timer: view,
    });
  }

  overdue.sort((a, b) => a.timer.remainingSeconds - b.timer.remainingSeconds);
  return overdue;
}

module.exports = {
  allowedSecondsFromStage,
  computeView,
  moveLeadToStage,
  runMoveLeadToStageTransaction,
  syncLeadStageProgressOnLeadPatch,
  pauseLeadStageSession,
  resumeOrCreateProgress,
  getLeadStageTimerDoc,
  overrideLeadStageSLA,
  getAssignedUserDueLeads,
  getOverdueLeadsForTeam,
  attachStageTimersToLeads,
};
