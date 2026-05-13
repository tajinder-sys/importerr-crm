const OpenAI = require('openai');
const Pipeline = require('../models/Pipeline');
const Stage = require('../models/Stage');
const User = require('../models/User');
const Lead = require('../models/lead');
const SellerAssignment = require('../models/SellerAssignment');
const EmailService = require('./EmailService');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Get first active stage of a pipeline ───────────────────────
const getFirstStage = async (pipelineId) => {
  return Stage.findOne({ pipelineId, isActive: true }).sort({ order: 1 }).lean();
};

// ─── Get default pipeline (isDefault:true or first active) ──────
const getDefaultPipeline = async () => {
  return (
    (await Pipeline.findOne({ isDefault: true, isActive: true }).lean()) ||
    (await Pipeline.findOne({ isActive: true }).sort({ createdAt: 1 }).lean())
  );
};

// ─── AI: match pipeline + priority from lead message ────────────
const matchPipelineWithAI = async (lead, pipelines) => {
  const pipelineList = pipelines
    .map((p) => `ID: ${p._id} | Name: ${p.name} | Description: ${p.description || 'N/A'}`)
    .join('\n');

  const prompt = `You are a CRM lead routing assistant. Analyze the lead and pick the best matching pipeline.
Also determine lead priority: high, medium, or low based on urgency and intent.

Lead:
- Name: ${lead.name}
- Source: ${lead.source}
- Message: ${lead.message || 'N/A'}
- Product SKU: ${lead.productSku || 'N/A'}
- Total Quantity: ${lead.totalQuantity || 0}

Pipelines:
${pipelineList}

Reply in this exact JSON format only, no explanation:
{"pipelineId": "<id or null>", "priority": "<high|medium|low>"}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 60,
    temperature: 0,
    response_format: { type: 'json_object' },
  });

  const parsed = JSON.parse(response.choices[0]?.message?.content || '{}');
  return {
    pipelineId: parsed.pipelineId && parsed.pipelineId !== 'null' ? parsed.pipelineId : null,
    priority: ['high', 'medium', 'low'].includes(parsed.priority) ? parsed.priority : 'medium',
  };
};

// ─── AI: decide priority only (no pipeline matching needed) ─────
const getPriorityWithAI = async (lead) => {
  const prompt = `You are a CRM lead routing assistant. Analyze the lead and determine its priority.

Lead:
- Name: ${lead.name}
- Source: ${lead.source}
- Message: ${lead.message || 'N/A'}
- Product SKU: ${lead.productSku || 'N/A'}
- Total Quantity: ${lead.totalQuantity || 0}

Reply in this exact JSON format only, no explanation:
{"priority": "<urgent|high|medium|low>"}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 20,
    temperature: 0,
    response_format: { type: 'json_object' },
  });

  const parsed = JSON.parse(response.choices[0]?.message?.content || '{}');
  return ['urgent', 'high', 'medium', 'low'].includes(parsed.priority) ? parsed.priority : 'medium';
};

// ─── Assign team member: priority-match first, then least-loaded ─
const assignMemberFromTeam = async (teamId, leadPriority) => {
  // Fetch all active team members for this team
  const members = await User.find({
    team_id: teamId,
    isActive: true,
    role: { $in: ['team_member', 'team_manager'] },
  })
    .select('_id priority')
    .lean();

  if (!members.length) return null;

  // Step 1: Try to find members whose priority matches the lead's priority
  const priorityMatched = members.filter(
    (m) => (m.priority || 'medium') === leadPriority
  );

  const candidatePool = priorityMatched.length ? priorityMatched : members;

  // Step 2: Among candidates, pick the least-loaded (fewest assigned leads)
  const counts = await Lead.aggregate([
    { $match: { assignedTo: { $in: candidatePool.map((m) => m._id) } } },
    { $group: { _id: '$assignedTo', count: { $sum: 1 } } },
  ]);

  const countMap = new Map(counts.map((c) => [String(c._id), c.count]));

  const sorted = [...candidatePool].sort(
    (a, b) =>
      (countMap.get(String(a._id)) || 0) - (countMap.get(String(b._id)) || 0)
  );

  if (priorityMatched.length) {
    console.log(
      `Assigned via priority match (${leadPriority}): user ${sorted[0]._id}`
    );
  } else {
    console.log(
      `No priority match for "${leadPriority}", assigned via least-load: user ${sorted[0]._id}`
    );
  }

  return sorted[0]._id;
};

// ─── Main: assign lead with full logic ──────────────────────────
const assignLeadWithAI = async (lead) => {
  try {
    if (!process.env.OPENAI_API_KEY) return;

    let assignedTo = null;
    let pipelineId = null;
    let stageId = null;
    let priority = 'medium';

    // ── Check 1: Previous lead from same email ──────────────────
    // assignedTo + pipelineId come from history; AI decides priority
    if (lead.email) {
      const prevLead = await Lead.findOne({
        email: lead.email,
        assignedTo: { $ne: null },
        _id: { $ne: lead._id },
      })
        .sort({ createdAt: -1 })
        .select('assignedTo pipelineId')
        .lean();

      if (prevLead?.assignedTo) {
        const user = await User.findOne({
          _id: prevLead.assignedTo,
          isActive: true,
        }).lean();

        if (user) {
          assignedTo = prevLead.assignedTo;
          pipelineId = prevLead.pipelineId || null;

          // AI decides priority only
          priority = await getPriorityWithAI(lead);

          console.log(
            `Lead ${lead._id}: assigned via previous lead history → user ${assignedTo}, priority=${priority}`
          );
        }
      }
    }

    // ── Check 2: SellerAssignment for default CRM user ──────────
    // assignedTo comes from mapping; AI decides pipelineId + priority
    if (!assignedTo && lead.userId) {
      const sellerAssignment = await SellerAssignment.findOne({
        importerrUserId: String(lead.userId),
        status: 'active',
      }).lean();

      if (sellerAssignment?.assignedCrmUserId) {
        assignedTo = sellerAssignment.assignedCrmUserId;

        // AI decides pipeline + priority
        const pipelines = await Pipeline.find({ isActive: true }).lean();
        if (pipelines.length) {
          const aiResult = await matchPipelineWithAI(lead, pipelines);
          priority = aiResult.priority;

          const matchedPipeline = pipelines.find(
            (p) => String(p._id) === String(aiResult.pipelineId)
          );

          if (matchedPipeline) {
            pipelineId = matchedPipeline._id;
          } else {
            const defaultPipeline = await getDefaultPipeline();
            if (defaultPipeline) pipelineId = defaultPipeline._id;
          }
        }

        console.log(
          `Lead ${lead._id}: assigned via SellerAssignment → user ${assignedTo}, pipeline ${pipelineId}, priority=${priority}`
        );
      }
    }

    // ── Check 3: AI decides pipeline + priority; assignedTo via team ─
    if (!assignedTo) {
      const pipelines = await Pipeline.find({ isActive: true }).lean();
      let targetPipeline = null;

      if (pipelines.length) {
        const aiResult = await matchPipelineWithAI(lead, pipelines);
        priority = aiResult.priority;

        targetPipeline =
          pipelines.find((p) => String(p._id) === String(aiResult.pipelineId)) ||
          null;

        if (!targetPipeline) {
          // AI returned null pipelineId — use default
          targetPipeline = await getDefaultPipeline();
          console.log(
            `Lead ${lead._id}: AI returned no pipeline match, falling back to default`
          );
        }
      } else {
        // No pipelines at all — still try default
        targetPipeline = await getDefaultPipeline();
        priority = await getPriorityWithAI(lead);
      }

      if (targetPipeline) {
        pipelineId = targetPipeline._id;

        // Assign member: priority-match first, then least-loaded
        assignedTo = await assignMemberFromTeam(targetPipeline.teamId, priority);

        console.log(
          `Lead ${lead._id}: AI/default pipeline "${targetPipeline.name}", assigned user ${assignedTo}, priority=${priority}`
        );
      }
    }

    // ── Resolve first stage for the final pipelineId ────────────
    if (pipelineId) {
      const firstStage = await getFirstStage(pipelineId);
      if (firstStage) stageId = firstStage._id;
    }

    // ── Apply update ─────────────────────────────────────────────
    const update = { priority };
    if (pipelineId) update.pipelineId = pipelineId;
    if (stageId) update.stageId = stageId;
    if (assignedTo) update.assignedTo = assignedTo;

    await Lead.findByIdAndUpdate(lead._id, update);
    console.log(`Lead ${lead._id} final update:`, update);

    // ── Send email to assigned user ──────────────────────────────
    if (assignedTo) {
      try {
        const assignedUser = await User.findById(assignedTo)
          .select('name email')
          .lean();
        if (assignedUser?.email) {
          await EmailService.sendTemplateEmail({
            to: assignedUser.email,
            slug: 'new-lead-submission',
            data: {
              name: assignedUser.name,
              link: `${process.env.FRONTEND_URL}/leads/${lead._id}`,
            },
          });
        }
      } catch (err) {
        console.error('Assignment email failed:', err.message);
      }
    }
  } catch (err) {
    console.error('AI assignment error:', err.message);
  }
};

module.exports = { assignLeadWithAI };