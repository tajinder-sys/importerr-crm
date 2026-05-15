const mongoose = require('mongoose');
const Lead = require('../models/lead');
const User = require('../models/User');
const Pipeline = require('../models/Pipeline');
const Stage = require('../models/Stage');
const Task = require('../models/Task');
const { sendSuccess, sendBadRequest, sendForbidden } = require('../utils/responseHandler');
const { USER_ROLES, LEAD_SOURCES } = require('../utils/constants');
const {
  lookupTerminalStageForLead,
  lookupCurrentStageForLead,
  unwindCurrentStage,
  addTerminalStageDocField,
  addDashboardConversionFields,
  addPipelineMetricHitField,
  percent,
} = require('../utils/dashboardConversion');

const asOid = (id) => {
  if (!id) return null;
  const s = String(id);
  if (!mongoose.Types.ObjectId.isValid(s) || s.length !== 24) return null;
  return new mongoose.Types.ObjectId(s);
};

async function activePipelineIdsForTeam(teamId) {
  if (!teamId) return [];
  const rows = await Pipeline.find({ teamId, isActive: true }).select('_id').lean();
  return rows.map((r) => r._id);
}

async function pipelineBelongsToTeam(pipelineIdStr, teamId) {
  if (!pipelineIdStr || !teamId) return false;
  const pl = await Pipeline.findById(pipelineIdStr).select('teamId').lean();
  return Boolean(pl?.teamId && String(pl.teamId) === String(teamId));
}

function parseDays(raw) {
  if (raw === undefined || raw === null || raw === '' || String(raw).toLowerCase() === 'all') return null;
  const n = parseInt(String(raw), 10);
  if (!Number.isFinite(n) || n < 1) return 30;
  return Math.min(366, n);
}

/** Base match for dashboard leads (no status-based logic). */
async function buildLeadMatch(req, query, options = {}) {
  const { ignoreQueryPipeline = false } = options;
  const { source, pipelineId, userId } = query;
  const match = { duplicateOf: { $in: [null, undefined] } };
  const days = parseDays(query.days);

  if (days) {
    match.createdAt = { $gte: new Date(Date.now() - days * 86400000) };
  }

  if (source && String(source).trim() && String(source).toLowerCase() !== 'all') {
    match.source = String(source).trim();
  }

  const pid =
    !ignoreQueryPipeline && pipelineId && String(pipelineId).toLowerCase() !== 'all'
      ? asOid(pipelineId)
      : null;
  const uid = userId && String(userId).toLowerCase() !== 'all' ? asOid(userId) : null;

  const role = req.user.role;
  const myId = req.user.id || req.user._id;
  const myTeam = req.user.teamId || req.user.team_id;

  if (role === USER_ROLES.TEAM_MEMBER) {
    match.assignedTo = asOid(myId);
    if (pid) {
      const ok = await pipelineBelongsToTeam(pid, myTeam);
      if (!ok) return { error: 'forbidden', message: 'Invalid pipeline for your account' };
      match.pipelineId = pid;
    } else if (myTeam) {
      const ids = await activePipelineIdsForTeam(myTeam);
      if (!ids.length) match._id = { $in: [] };
      else match.pipelineId = { $in: ids };
    }
  } else if (role === USER_ROLES.TEAM_MANAGER) {
    if (!myTeam) {
      match._id = { $in: [] };
    } else if (pid) {
      const ok = await pipelineBelongsToTeam(pid, myTeam);
      if (!ok) return { error: 'forbidden', message: 'You can only view your team pipelines' };
      match.pipelineId = pid;
    } else {
      const ids = await activePipelineIdsForTeam(myTeam);
      if (!ids.length) match._id = { $in: [] };
      else match.pipelineId = { $in: ids };
    }
    if (uid) {
      const assignee = await User.findById(uid).select('team_id isActive').lean();
      if (!assignee?.isActive || String(assignee.team_id) !== String(myTeam)) {
        return { error: 'forbidden', message: 'You can only filter by members of your team' };
      }
      match.assignedTo = uid;
    }
  } else if (role === USER_ROLES.ADMIN) {
    if (pid) match.pipelineId = pid;
    if (uid) match.assignedTo = uid;
  } else {
    match._id = { $in: [] };
  }

  match.pipelineId = match.pipelineId || { $exists: true, $ne: null };
  match.stageId = { $exists: true, $ne: null };
  console.log("match", match);
  return { match };
}

async function buildTaskMatch(req, query) {
  const base = { deletedAt: { $exists: false } };
  const days = parseDays(query.days);
  if (days) {
    base.createdAt = { $gte: new Date(Date.now() - days * 86400000) };
  }

  const role = req.user.role;
  const myId = req.user.id || req.user._id;
  const myTeam = req.user.teamId || req.user.team_id;

  if (role === USER_ROLES.TEAM_MEMBER) {
    return {
      match: {
        ...base,
        $or: [{ assigned_to: asOid(myId) }, { created_by: asOid(myId) }],
      },
    };
  }
  if (role === USER_ROLES.TEAM_MANAGER) {
    const leadMatch = await buildLeadMatch(req, query);
    if (leadMatch.error) return leadMatch;
    const leadIds = await Lead.find(leadMatch.match).select('_id').lean();
    const ids = leadIds.map((l) => l._id);
    if (!ids.length) return { match: { ...base, _id: { $exists: false } } };
    return { match: { ...base, lead_id: { $in: ids } } };
  }
  if (role === USER_ROLES.ADMIN) {
    return { match: base };
  }
  return { match: { ...base, _id: { $exists: false } } };
}

const getDashboardFilters = async (req, res) => {
  try {
    const role = req.user.role;
    const myTeam = req.user.teamId || req.user.team_id;
    const myId = req.user.id || req.user._id;

    let users = [];
    if (role === USER_ROLES.ADMIN) {
      users = await User.find({ isActive: true, role: { $in: [USER_ROLES.TEAM_MEMBER, USER_ROLES.TEAM_MANAGER] } })
        .select('name email role team_id')
        .sort({ name: 1 })
        .limit(500)
        .lean();
    } else if (role === USER_ROLES.TEAM_MANAGER && myTeam) {
      users = await User.find({
        isActive: true,
        team_id: myTeam,
        role: { $in: [USER_ROLES.TEAM_MEMBER, USER_ROLES.TEAM_MANAGER] },
      })
        .select('name email role team_id')
        .sort({ name: 1 })
        .lean();
    } else {
      const u = await User.findById(myId).select('name email role').lean();
      users = u ? [u] : [];
    }

    let pipelines = [];
    if (role === USER_ROLES.ADMIN) {
      pipelines = await Pipeline.find({ isActive: true })
        .select('name teamId')
        .populate('teamId', 'name')
        .sort({ name: 1 })
        .limit(300)
        .lean();
    } else if (role === USER_ROLES.TEAM_MANAGER && myTeam) {
      pipelines = await Pipeline.find({ isActive: true, teamId: myTeam })
        .select('name teamId')
        .populate('teamId', 'name')
        .sort({ name: 1 })
        .lean();
    } else if (role === USER_ROLES.TEAM_MEMBER && myTeam) {
      pipelines = await Pipeline.find({ isActive: true, teamId: myTeam })
        .select('name teamId')
        .populate('teamId', 'name')
        .sort({ name: 1 })
        .lean();
    }

    const sources = Object.values(LEAD_SOURCES).map((value) => ({ value, label: value }));

    sendSuccess(res, 'Dashboard filters loaded', { users, pipelines, sources });
  } catch (e) {
    console.error('getDashboardFilters', e);
    sendBadRequest(res, 'Failed to load dashboard filters');
  }
};

const getDashboardKpis = async (req, res) => {
  try {
    const built = await buildLeadMatch(req, req.query);
    if (built.error === 'forbidden') {
      return sendForbidden(res, built.message);
    }
    const { match } = built;

    const [row] = await Lead.aggregate([
      { $match: match },
      lookupCurrentStageForLead(),
      unwindCurrentStage(),
      lookupTerminalStageForLead(),
      addTerminalStageDocField(),
      addDashboardConversionFields(),
      {
        $group: {
          _id: null,
          totalLeads: { $sum: 1 },
          leadsWithStageDoc: { $sum: { $cond: [{ $ifNull: ['$st._id', false] }, 1, 0] } },
          convertedLeads: { $sum: { $cond: ['$isConvertedLead', 1, 0] } },
          lastStageLeads: { $sum: { $cond: ['$isOnLastStage', 1, 0] } },
          zeroProbLeads: { $sum: { $cond: [{ $eq: ['$prob', 0] }, 1, 0] } },
        },
      },
    ]);

    const totalLeads = row?.totalLeads ?? 0;
    const convertedLeads = row?.convertedLeads ?? 0;
    const lastStageLeads = row?.lastStageLeads ?? 0;

    sendSuccess(res, 'Dashboard KPIs loaded', {
      totalLeads,
      leadsWithStage: row?.leadsWithStageDoc ?? 0,
      convertedLeads,
      conversionRatePercent: percent(convertedLeads, totalLeads),
      lastStageLeads,
      lastStageSharePercent: percent(lastStageLeads, totalLeads),
      wonStageLeads: convertedLeads,
      wonStageSharePercent: percent(convertedLeads, totalLeads),
      zeroProbabilityLeads: row?.zeroProbLeads ?? 0,
    });
  } catch (e) {
    console.error('getDashboardKpis', e);
    sendBadRequest(res, 'Failed to load KPIs');
  }
};

const getDashboardStageDistribution = async (req, res) => {
  try {
    const built = await buildLeadMatch(req, req.query);
    if (built.error === 'forbidden') {
      return sendForbidden(res, built.message);
    }
    const { match } = built;

    const rows = await Lead.aggregate([
      { $match: match },
      {
        $lookup: {
          from: 'stages',
          localField: 'stageId',
          foreignField: '_id',
          as: 'st',
        },
      },
      { $unwind: { path: '$st', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$stageId',
          count: { $sum: 1 },
          name: { $first: '$st.name' },
          probabilityPercent: { $first: '$st.probabilityPercent' },
          order: { $first: '$st.order' },
          color: { $first: '$st.color' },
          pipelineId: { $first: '$st.pipelineId' },
        },
      },
      {
        $lookup: {
          from: 'pipelines',
          localField: 'pipelineId',
          foreignField: '_id',
          as: 'pl',
        },
      },
      { $unwind: { path: '$pl', preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          pipelineName: { $ifNull: ['$pl.name', 'Unknown pipeline'] },
        },
      },
      { $sort: { pipelineName: 1, order: 1 } },
    ]);

    const byPipeline = new Map();
    for (const r of rows) {
      const pid = r.pipelineId ? String(r.pipelineId) : '_none';
      const pname = r.pipelineName || 'Unknown pipeline';
      if (!byPipeline.has(pid)) {
        byPipeline.set(pid, {
          pipelineId: r.pipelineId || null,
          pipelineName: pname,
          stages: [],
        });
      }
      byPipeline.get(pid).stages.push({
        stageId: r._id,
        name: r.name,
        count: r.count,
        order: r.order,
        color: r.color,
        probabilityPercent: r.probabilityPercent,
      });
    }

    const pipelines = Array.from(byPipeline.values()).sort((a, b) =>
      String(a.pipelineName).localeCompare(String(b.pipelineName))
    );

    sendSuccess(res, 'Stage distribution loaded', { pipelines });
  } catch (e) {
    console.error('getDashboardStageDistribution', e);
    sendBadRequest(res, 'Failed to load stage distribution');
  }
};

const getDashboardSources = async (req, res) => {
  try {
    const built = await buildLeadMatch(req, req.query);
    if (built.error === 'forbidden') {
      return sendForbidden(res, built.message);
    }
    const { match } = built;

    const rows = await Lead.aggregate([
      { $match: match },
      { $group: { _id: '$source', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    sendSuccess(res, 'Sources loaded', {
      sources: rows.map((r) => ({ source: r._id, count: r.count })),
    });
  } catch (e) {
    console.error('getDashboardSources', e);
    sendBadRequest(res, 'Failed to load sources');
  }
};

const getDashboardUserPerformance = async (req, res) => {
  try {
    const built = await buildLeadMatch(req, req.query);
    if (built.error === 'forbidden') {
      return sendForbidden(res, built.message);
    }
    const { match } = built;

    const memberSelfOnly = req.user.role === USER_ROLES.TEAM_MEMBER;
    const perfMatch = memberSelfOnly
      ? { ...match, assignedTo: asOid(req.user.id || req.user._id) }
      : { ...match, assignedTo: { $exists: true, $ne: null } };

    const rows = await Lead.aggregate([
      { $match: perfMatch },
      lookupCurrentStageForLead(),
      unwindCurrentStage(),
      lookupTerminalStageForLead(),
      addTerminalStageDocField(),
      addDashboardConversionFields(),
      {
        $group: {
          _id: '$assignedTo',
          leadCount: { $sum: 1 },
          convertedLeads: { $sum: { $cond: ['$isConvertedLead', 1, 0] } },
          lastStageLeads: { $sum: { $cond: ['$isOnLastStage', 1, 0] } },
        },
      },
    ]);

    const userIds = rows.map((r) => r._id).filter(Boolean);
    const userDocs = await User.find({ _id: { $in: userIds } }).select('name email role').lean();
    const byId = new Map(userDocs.map((u) => [String(u._id), u]));

    const users = rows
      .map((r) => {
        const u = byId.get(String(r._id));
        const leadCount = r.leadCount || 0;
        const converted = r.convertedLeads || 0;
        const lastStage = r.lastStageLeads || 0;
        return {
          userId: r._id,
          name: u?.name || 'Unknown',
          email: u?.email || '',
          role: u?.role,
          leadCount,
          convertedLeads: converted,
          lastStageLeads: lastStage,
          conversionRatePercent: percent(converted, leadCount),
          lastStageSharePercent: percent(lastStage, leadCount),
          wonStageLeads: converted,
          stageWinRatePercent: percent(converted, leadCount),
        };
      })
      .sort((a, b) => b.leadCount - a.leadCount);

    sendSuccess(res, 'Performance loaded', { users });
  } catch (e) {
    console.error('getDashboardUserPerformance', e);
    sendBadRequest(res, 'Failed to load user performance');
  }
};

const getDashboardTasksSummary = async (req, res) => {
  try {
    const tm = await buildTaskMatch(req, req.query);
    if (tm.error === 'forbidden') {
      return sendForbidden(res, tm.message);
    }
    if (!tm.match) {
      return sendBadRequest(res, 'Invalid task scope');
    }
    const taskMatch = tm.match;

    const rows = await Task.aggregate([
      { $match: taskMatch },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const byStatus = {};
    rows.forEach((r) => {
      byStatus[r._id] = r.count;
    });
    const total = rows.reduce((s, r) => s + r.count, 0);

    sendSuccess(res, 'Tasks summary loaded', { total, byStatus });
  } catch (e) {
    console.error('getDashboardTasksSummary', e);
    sendBadRequest(res, 'Failed to load tasks summary');
  }
};

const getDashboardRecentLeads = async (req, res) => {
  try {
    const built = await buildLeadMatch(req, req.query);
    if (built.error === 'forbidden') {
      return sendForbidden(res, built.message);
    }
    const { match } = built;
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '10'), 10) || 10));

    const leads = await Lead.find(match)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('assignedTo', 'name email')
      .populate('pipelineId', 'name')
      .populate('stageId', 'name color order probabilityPercent')
      .lean();

    sendSuccess(res, 'Recent leads loaded', { leads });
  } catch (e) {
    console.error('getDashboardRecentLeads', e);
    sendBadRequest(res, 'Failed to load recent leads');
  }
};

const getDashboardLeadTimeline = async (req, res) => {
  try {
    const built = await buildLeadMatch(req, req.query);
    if (built.error === 'forbidden') {
      return sendForbidden(res, built.message);
    }
    const { match } = built;
    const days = parseDays(req.query.days);
    const windowDays = days == null ? 90 : Math.min(Math.max(days, 1), 366);
    const start = new Date(Date.now() - windowDays * 86400000);
    start.setHours(0, 0, 0, 0);

    const rows = await Lead.aggregate([
      { $match: { ...match, createdAt: { $gte: start } } },
      {
        $project: {
          day: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
        },
      },
      { $group: { _id: '$day', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    sendSuccess(res, 'Timeline loaded', { points: rows.map((r) => ({ date: r._id, count: r.count })) });
  } catch (e) {
    console.error('getDashboardLeadTimeline', e);
    sendBadRequest(res, 'Failed to load timeline');
  }
};

/** Per-pipeline: conversion (isConversion stage + converted status) if last stage is conversion; else completed % on last stage. */
const getDashboardPipelineWinRates = async (req, res) => {
  try {
    const built = await buildLeadMatch(req, req.query, { ignoreQueryPipeline: true });
    if (built.error === 'forbidden') {
      return sendForbidden(res, built.message);
    }
    const { match } = built;

    const role = req.user.role;
    const myTeam = req.user.teamId || req.user.team_id;

    let pipelineQuery = { isActive: true };
    if (role === USER_ROLES.TEAM_MANAGER && myTeam) {
      pipelineQuery.teamId = myTeam;
    } else if (role === USER_ROLES.TEAM_MEMBER && myTeam) {
      pipelineQuery.teamId = myTeam;
    } else if (role !== USER_ROLES.ADMIN) {
      pipelineQuery._id = { $exists: false };
    }

    const pipelines = await Pipeline.find(pipelineQuery)
      .select('name teamId')
      .populate('teamId', 'name')
      .sort({ name: 1 })
      .limit(400)
      .lean();

    const pipelineIds = pipelines.map((p) => p._id);
    if (!pipelineIds.length) {
      return sendSuccess(res, 'Pipeline win rates loaded', { pipelines: [] });
    }

    const lastStages = await Stage.aggregate([
      { $match: { pipelineId: { $in: pipelineIds }, isActive: true } },
      { $sort: { pipelineId: 1, order: -1 } },
      {
        $group: {
          _id: '$pipelineId',
          lastStageId: { $first: '$_id' },
          lastStageName: { $first: '$name' },
          lastStageIsConversion: { $first: '$isConversion' },
        },
      },
    ]);
    const lastStageByPipeline = new Map(lastStages.map((s) => [String(s._id), s]));

    const agg = await Lead.aggregate([
      { $match: { ...match, pipelineId: { $in: pipelineIds } } },
      lookupCurrentStageForLead(),
      unwindCurrentStage(),
      lookupTerminalStageForLead(),
      addTerminalStageDocField(),
      addDashboardConversionFields(),
      addPipelineMetricHitField(),
      {
        $group: {
          _id: '$pipelineId',
          leadCount: { $sum: 1 },
          metricCount: { $sum: { $cond: ['$metricHit', 1, 0] } },
          convertedLeads: { $sum: { $cond: ['$isConvertedLead', 1, 0] } },
          lastStageLeads: { $sum: { $cond: ['$isOnLastStage', 1, 0] } },
          usesConversionMetric: { $max: { $cond: ['$pipelineUsesConversionMetric', 1, 0] } },
        },
      },
    ]);

    const byPl = new Map(agg.map((r) => [String(r._id), r]));

    const pipelinesOut = pipelines.map((p) => {
      const s = byPl.get(String(p._id));
      const meta = lastStageByPipeline.get(String(p._id));
      const leadCount = s?.leadCount ?? 0;
      const usesConversion = Boolean(meta?.lastStageIsConversion);
      const metricType = usesConversion ? 'conversion' : 'completed';
      const metricCount = usesConversion ? (s?.convertedLeads ?? 0) : (s?.lastStageLeads ?? 0);
      const winRatePercent = percent(metricCount, leadCount);

      return {
        pipelineId: p._id,
        name: p.name,
        teamName: p.teamId?.name || '',
        terminalStageName: meta?.lastStageName || null,
        lastStageIsConversion: usesConversion,
        metricType,
        leadCount,
        metricCount,
        convertedLeads: s?.convertedLeads ?? 0,
        lastStageLeads: s?.lastStageLeads ?? 0,
        wonLeads: metricCount,
        winRatePercent,
      };
    });

    sendSuccess(res, 'Pipeline win rates loaded', { pipelines: pipelinesOut });
  } catch (e) {
    console.error('getDashboardPipelineWinRates', e);
    sendBadRequest(res, 'Failed to load pipeline win rates');
  }
};

module.exports = {
  getDashboardFilters,
  getDashboardKpis,
  getDashboardStageDistribution,
  getDashboardSources,
  getDashboardUserPerformance,
  getDashboardTasksSummary,
  getDashboardRecentLeads,
  getDashboardLeadTimeline,
  getDashboardPipelineWinRates,
};
