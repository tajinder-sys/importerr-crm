const OpenAI = require('openai');
const Pipeline = require('../models/Pipeline');
const Stage = require('../models/Stage');
const User = require('../models/User');
const Lead = require('../models/lead');
const ConnectedAccount = require('../models/ConnectedAccount');
const SellerAssignment = require('../models/SellerAssignment');
const EmailService = require('./EmailService');
const ActivityService = require('./ActivityService');
const AiLog = require('../models/AiLog');
const logger = require('../utils/logger');
const leadStageProgressService = require('./leadStageProgressService');
const NotificationService = require('./NotificationService');
const { ACTIVITY_TYPES, TASK_PRIORITY_LEVELS } = require('../utils/constants');
const {
  getAssignmentStrategyOrder,
  STRATEGY_IDS,
} = require('../utils/leadAssignmentStrategySettings');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─────────────────────────────────────────────────────────────────
// Pipeline + Stage helpers
// ─────────────────────────────────────────────────────────────────

const getFirstStage = (pipelineId) =>
  Stage.findOne({ pipelineId, isActive: true }).sort({ order: 1 }).lean();

const getDefaultPipeline = () =>
  Pipeline.findOne({ isDefault: true, isActive: true }).lean() ||
  Pipeline.findOne({ isActive: true }).sort({ createdAt: 1 }).lean();

const getDefaultPipelineForTeam = (teamId) => {
  if (!teamId) return null;
  return (
    Pipeline.findOne({ teamId, isDefault: true, isActive: true }).lean() ||
    Pipeline.findOne({ teamId, isActive: true }).sort({ createdAt: 1 }).lean()
  );
};

// ─────────────────────────────────────────────────────────────────
// AI helpers — pipeline matching and priority scoring
// ─────────────────────────────────────────────────────────────────

const callOpenAI = async (lead, callType, prompt, maxTokens) => {
  const t0 = Date.now();
  let response, parsed, logEntry;
  try {
    response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
      temperature: 0,
      response_format: { type: 'json_object' },
    });
    parsed = JSON.parse(response.choices[0]?.message?.content || '{}');
    logEntry = {
      leadId: lead._id,
      callType,
      prompt,
      rawResponse: response.choices[0]?.message?.content,
      parsedResult: parsed,
      tokensUsed: {
        prompt: response.usage?.prompt_tokens,
        completion: response.usage?.completion_tokens,
        total: response.usage?.total_tokens,
      },
      latencyMs: Date.now() - t0,
      success: true,
    };
  } catch (err) {
    logEntry = { leadId: lead._id, callType, prompt, error: err.message, latencyMs: Date.now() - t0, success: false };
    AiLog.create(logEntry).catch(() => {});
    throw err;
  }
  AiLog.create(logEntry).catch(() => {});
  return parsed;
};

const leadContext = (lead) =>
  `- Name: ${lead.name}
- Source: ${lead.source}
- Message: ${lead.message || 'N/A'}
- Product SKU: ${lead.productSku || 'N/A'}
- Total Quantity: ${lead.totalQuantity || 0}`;

const matchPipelineWithAI = async (lead, pipelines) => {
  const pipelineList = pipelines
    .map((p) => `ID: ${p._id} | Name: ${p.name} | Description: ${p.description || 'N/A'}`)
    .join('\n');

  const prompt = `You are a CRM lead routing assistant. Analyze the lead and pick the best matching pipeline.
Also determine lead priority: high, medium, or low based on urgency and intent.

Lead:
${leadContext(lead)}

Pipelines:
${pipelineList}

Reply in this exact JSON format only, no explanation:
{"pipelineId": "<id or null>", "priority": "<high|medium|low>"}`;

  const parsed = await callOpenAI(lead, 'matchPipeline', prompt, 60);
  return {
    pipelineId: parsed.pipelineId && parsed.pipelineId !== 'null' ? parsed.pipelineId : null,
    priority: ['high', 'medium', 'low'].includes(parsed.priority) ? parsed.priority : 'medium',
  };
};

const getPriorityWithAI = async (lead) => {
  const prompt = `You are a CRM lead routing assistant. Analyze the lead and determine its priority.

Lead:
${leadContext(lead)}

Reply in this exact JSON format only, no explanation:
{"priority": "<urgent|high|medium|low>"}`;

  const parsed = await callOpenAI(lead, 'getPriority', prompt, 20);
  const valid = Object.values(TASK_PRIORITY_LEVELS);
  return valid.includes(parsed.priority) ? parsed.priority : TASK_PRIORITY_LEVELS.MEDIUM;
};

// ─────────────────────────────────────────────────────────────────
// User assignment helpers
// ─────────────────────────────────────────────────────────────────

// Pick the least-loaded member from a pool, optionally filtered by priority match first.
const pickLeastLoaded = async (members, matchPriority = null, accountId = null) => {
  if (!members.length) return null;

  const priorityFiltered = matchPriority
    ? members.filter((m) => (m.priority || 'medium') === matchPriority)
    : [];
  const pool = priorityFiltered.length ? priorityFiltered : members;

  const matchQuery = { assignedTo: { $in: pool.map((m) => m._id) } };
  if (accountId) matchQuery.accountId = accountId;

  const counts = await Lead.aggregate([
    { $match: matchQuery },
    { $group: { _id: '$assignedTo', count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [String(c._id), c.count]));

  return [...pool].sort((a, b) => {
    const diff = (countMap.get(String(a._id)) || 0) - (countMap.get(String(b._id)) || 0);
    // Tie-break by account creation date (oldest = most senior)
    return diff !== 0 ? diff : new Date(a.createdAt) - new Date(b.createdAt);
  })[0];
};

const assignMemberFromTeam = async (teamId, leadPriority) => {
  const members = await User.find({
    team_id: teamId,
    isActive: true,
    role: { $in: ['team_member', 'team_manager'] },
  })
    .select('_id priority createdAt')
    .lean();

  const winner = await pickLeastLoaded(members, leadPriority);
  if (winner) {
    logger.info(`[AI Assignment] Team pick (priority=${leadPriority}): user ${winner._id}`);
  }
  return winner?._id ?? null;
};

const assignMemberFromConnectedAccount = async (accountId, userIds) => {
  const members = await User.find({ _id: { $in: userIds }, isActive: true })
    .select('_id createdAt team_id')
    .lean();

  const winner = await pickLeastLoaded(members, null, accountId);
  if (winner) {
    logger.info(`[AI Assignment] Connected-account round-robin → user ${winner._id}`);
  }
  return winner ?? null;
};

// ─────────────────────────────────────────────────────────────────
// Pipeline resolution — find a pipeline + AI priority for a lead
// ─────────────────────────────────────────────────────────────────

// Returns { pipelineId, priority }. Falls back to default pipeline if AI can't match.
const resolvePipelineAndPriority = async (lead, pipelines, fallbackFn) => {
  if (!pipelines.length) {
    const fallback = await fallbackFn();
    const priority = await getPriorityWithAI(lead);
    return { pipelineId: fallback?._id ?? null, priority };
  }

  const { pipelineId: aiPipelineId, priority } = await matchPipelineWithAI(lead, pipelines);
  const matched = pipelines.find((p) => String(p._id) === String(aiPipelineId));

  if (matched) return { pipelineId: matched._id, priority };

  const fallback = await fallbackFn();
  logger.info(`[AI Assignment] No pipeline match, using default: ${fallback?.name}`);
  return { pipelineId: fallback?._id ?? null, priority };
};

// ─────────────────────────────────────────────────────────────────
// Assignment strategies — each returns { assignedTo, assignedUser, pipelineId, priority }
// or null if this strategy doesn't apply.
// ─────────────────────────────────────────────────────────────────

// Strategy 0: connected account has explicit assignedUserIds → round-robin among them
const tryConnectedAccount = async (lead, leadAccountId) => {
  if (!leadAccountId) return null;

  const account = await ConnectedAccount.findOne({ accountId: leadAccountId, isActive: true })
    .select('assignedUserIds')
    .lean();

  if (!account?.assignedUserIds?.length) return null;

  const user = await assignMemberFromConnectedAccount(leadAccountId, account.assignedUserIds);
  if (!user) return null;

  const teamId = user.team_id;
  const pipelines = teamId ? await Pipeline.find({ isActive: true, teamId }).lean() : [];
  const { pipelineId, priority } = await resolvePipelineAndPriority(
    lead,
    pipelines,
    () => getDefaultPipelineForTeam(teamId)
  );

  if (!pipelineId) {
    logger.warn(`[AI Assignment] Lead ${lead._id}: no pipeline found for team ${teamId}`);
  }

  logger.info(`[AI Assignment] Strategy 0 (connected account) → user ${user._id}, pipeline ${pipelineId}, priority=${priority}`);
  return { assignedTo: user._id, assignedUser: user, pipelineId, priority };
};

// Strategy 1: same email was assigned before → reuse that user + pipeline
const tryPreviousLeadHistory = async (lead) => {
  if (!lead.email) return null;

  const prevLead = await Lead.findOne({
    email: lead.email,
    assignedTo: { $ne: null },
    _id: { $ne: lead._id },
  })
    .sort({ createdAt: -1 })
    .select('assignedTo pipelineId')
    .lean();

  if (!prevLead?.assignedTo) return null;

  const user = await User.findOne({ _id: prevLead.assignedTo, isActive: true }).lean();
  if (!user) return null;

  const priority = await getPriorityWithAI(lead);
  logger.info(`[AI Assignment] Strategy 1 (email history) → user ${user._id}, priority=${priority}`);
  return { assignedTo: user._id, assignedUser: user, pipelineId: prevLead.pipelineId || null, priority };
};

// Strategy 2: lead has a userId mapped via SellerAssignment
const trySellerAssignment = async (lead) => {
  if (!lead.userId) return null;

  const assignment = await SellerAssignment.findOne({
    importerrUserId: String(lead.userId),
    status: 'active',
  }).lean();

  if (!assignment?.assignedCrmUserId) return null;

  const pipelines = await Pipeline.find({ isActive: true }).lean();
  const { pipelineId, priority } = await resolvePipelineAndPriority(lead, pipelines, getDefaultPipeline);

  logger.info(`[AI Assignment] Strategy 2 (seller mapping) → user ${assignment.assignedCrmUserId}, pipeline ${pipelineId}, priority=${priority}`);
  return { assignedTo: assignment.assignedCrmUserId, assignedUser: null, pipelineId, priority };
};

// Strategy 3: pure AI — pick pipeline, then pick least-loaded team member from it
const tryAIFallback = async (lead) => {
  const pipelines = await Pipeline.find({ isActive: true }).lean();
  const { pipelineId, priority } = await resolvePipelineAndPriority(lead, pipelines, getDefaultPipeline);

  if (!pipelineId) {
    logger.warn(`[AI Assignment] Strategy 3: no pipeline found, lead ${lead._id} unassigned`);
    return null;
  }

  const pipeline = pipelines.find((p) => String(p._id) === String(pipelineId));
  const assignedTo = await assignMemberFromTeam(pipeline?.teamId, priority);

  logger.info(`[AI Assignment] Strategy 3 (AI fallback) → pipeline "${pipeline?.name}", user ${assignedTo}, priority=${priority}`);
  return { assignedTo, assignedUser: null, pipelineId, priority };
};

// ─────────────────────────────────────────────────────────────────
// Post-assignment side effects
// ─────────────────────────────────────────────────────────────────

const notifyAssignedUser = async (lead, assignedTo) => {
  const user = await User.findById(assignedTo).select('name email team_id').lean();
  if (!user) return;

  if (user.email) {
    await EmailService.sendTemplateEmail({
      to: user.email,
      slug: 'new-lead-submission',
      data: {
        name: user.name,
        link: `${process.env.FRONTEND_URL}/leads/${lead._id}`,
      },
    });
  }

  NotificationService.dispatch({
    type: 'lead_assigned',
    title: 'Lead assigned to you',
    body: `Lead "${lead.name || 'New lead'}" has been assigned to you`,
    assigneeUserId: assignedTo,
    leadId: lead._id,
    teamId: user.team_id || null,
    actionUrl: `/leads/${lead._id}`,
    dedupeKey: `lead_assigned:${lead._id}:${assignedTo}`,
  }).catch(() => {});
};

// ─────────────────────────────────────────────────────────────────
// Main entry point
// ─────────────────────────────────────────────────────────────────

const assignLeadWithAI = async (lead) => {
  try {
    if (!process.env.OPENAI_API_KEY) return;

    const freshLead = await Lead.findById(lead._id)
      .select('assignedTo pipelineId stageId accountId')
      .lean();

    if (freshLead?.assignedTo) {
      logger.info(`[AI Assignment] Lead ${lead._id} already assigned, skipping`);
      return;
    }

    const leadAccountId = freshLead?.accountId || lead.accountId;
    const strategyOrder = await getAssignmentStrategyOrder();

    const strategyRunners = {
      [STRATEGY_IDS.CONNECTED_ACCOUNT]: () => tryConnectedAccount(lead, leadAccountId),
      [STRATEGY_IDS.PREVIOUS_LEAD_HISTORY]: () => tryPreviousLeadHistory(lead),
      [STRATEGY_IDS.SELLER_ASSIGNMENT]: () => trySellerAssignment(lead),
      [STRATEGY_IDS.AI_FALLBACK]: () => tryAIFallback(lead),
    };

    let result = null;
    for (const strategyId of strategyOrder) {
      const run = strategyRunners[strategyId];
      if (!run) continue;
      result = await run();
      if (result) {
        logger.info(`[AI Assignment] Lead ${lead._id}: matched strategy "${strategyId}"`);
        break;
      }
    }

    if (!result) {
      logger.warn(`[AI Assignment] Lead ${lead._id}: no assignment strategy matched`);
      return;
    }

    const { assignedTo, pipelineId, priority } = result;

    const stageId = pipelineId
      ? (await getFirstStage(pipelineId))?._id ?? null
      : null;

    const update = { priority };
    if (pipelineId) update.pipelineId = pipelineId;
    if (stageId) update.stageId = stageId;
    if (assignedTo) update.assignedTo = assignedTo;

    await Lead.findByIdAndUpdate(lead._id, update);
    logger.info(`[AI Assignment] Lead ${lead._id} updated`, update);

    if (update.pipelineId && update.stageId) {
      await leadStageProgressService
        .syncLeadStageProgressOnLeadPatch(
          lead._id,
          freshLead.stageId || null,
          freshLead.pipelineId || null,
          update.pipelineId,
          update.stageId
        )
        .catch((err) => logger.error('[AI Assignment] SLA sync failed', { error: err.message }));
    }

    if (assignedTo) {
      await ActivityService.logActivity({
        leadId: lead._id,
        type: ACTIVITY_TYPES.LEAD_ASSIGNED,
        description: 'Lead auto-assigned',
        preferredUserId: assignedTo,
        metadata: {
          newAssignedTo: String(assignedTo),
          assignmentSource: 'ai',
          pipelineId: pipelineId ? String(pipelineId) : null,
          stageId: stageId ? String(stageId) : null,
        },
      });

      if (stageId && String(freshLead.stageId || '') !== String(stageId)) {
        const [oldStage, newStage] = await Promise.all([
          freshLead.stageId ? Stage.findById(freshLead.stageId).select('name').lean() : null,
          Stage.findById(stageId).select('name').lean(),
        ]);
        await ActivityService.logActivity({
          leadId: lead._id,
          type: ACTIVITY_TYPES.STAGE_CHANGED,
          description: `Stage set to "${newStage?.name || 'none'}"`,
          preferredUserId: assignedTo,
          metadata: {
            oldStageName: oldStage?.name || 'none',
            newStageName: newStage?.name || 'none',
            assignmentSource: 'ai',
          },
        });
      }

      await notifyAssignedUser(lead, assignedTo).catch((err) =>
        logger.error('[AI Assignment] Notification failed', { error: err.message })
      );
    }
  } catch (err) {
    logger.error('[AI Assignment] Unhandled error', { error: err.message });
  }
};

module.exports = { assignLeadWithAI };