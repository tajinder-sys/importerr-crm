const OpenAI = require('openai');
const Pipeline = require('../models/Pipeline');
const Stage = require('../models/Stage');
const User = require('../models/User');
const Lead = require('../models/lead');
const SellerAssignment = require('../models/SellerAssignment');
const EmailService = require('./EmailService');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Get least loaded member from a team ────────────────────────
const getLeastLoadedMember = async (teamId, priority) => {
  const members = await User.find({ team_id: teamId, isActive: true, role: 'team_member' })
    .select('_id').lean();
  if (!members.length) return null;

  const counts = await Lead.aggregate([
    { $match: { assignedTo: { $in: members.map(m => m._id) } } },
    { $group: { _id: '$assignedTo', count: { $sum: 1 } } }
  ]);
  const countMap = new Map(counts.map(c => [String(c._id), c.count]));
  const sorted = [...members].sort((a, b) => (countMap.get(String(a._id)) || 0) - (countMap.get(String(b._id)) || 0));
  return sorted[0]._id;
};

// ─── Get first active stage of a pipeline ───────────────────────
const getFirstStage = async (pipelineId) => {
  return Stage.findOne({ pipelineId, isActive: true }).sort({ order: 1 }).lean();
};

// ─── Get default pipeline (isDefault:true or first active) ──────
const getDefaultPipeline = async () => {
  return Pipeline.findOne({ isDefault: true, isActive: true }).lean()
    || Pipeline.findOne({ isActive: true }).sort({ createdAt: 1 }).lean();
};

// ─── AI: match pipeline from message ────────────────────────────
const matchPipelineWithAI = async (lead, pipelines) => {
  const pipelineList = pipelines.map(p =>
    `ID: ${p._id} | Name: ${p.name} | Description: ${p.description || 'N/A'}`
  ).join('\n');

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
    response_format: { type: 'json_object' }
  });

  const parsed = JSON.parse(response.choices[0]?.message?.content || '{}');
  return {
    pipelineId: parsed.pipelineId || null,
    priority: ['high', 'medium', 'low'].includes(parsed.priority) ? parsed.priority : 'medium'
  };
};

// ─── Main: assign lead with full logic ──────────────────────────
const assignLeadWithAI = async (lead) => {
  try {
    if (!process.env.OPENAI_API_KEY) return;

    let assignedTo = null;
    let pipelineId = null;
    let stageId = null;
    let priority = 'medium';

    // ── Check 1: If userId exists, check SellerAssignment for default CRM user ──
    if (lead.userId) {
      const sellerAssignment = await SellerAssignment.findOne({
        importerrUserId: String(lead.userId),
        status: 'active'
      }).lean();

      if (sellerAssignment?.assignedCrmUserId) {
        assignedTo = sellerAssignment.assignedCrmUserId;
        console.log(`Lead ${lead._id}: assigned via SellerAssignment → user ${assignedTo}`);
      }
    }

    // ── Check 2: If no seller assignment, check previous lead from same user/email ──
    if (!assignedTo && lead.email) {
      const prevLead = await Lead.findOne({
        email: lead.email,
        assignedTo: { $ne: null },
        _id: { $ne: lead._id }
      }).sort({ createdAt: -1 }).select('assignedTo').lean();

      if (prevLead?.assignedTo) {
        // Verify user is still active
        const user = await User.findOne({ _id: prevLead.assignedTo, isActive: true }).lean();
        if (user) {
          assignedTo = prevLead.assignedTo;
          const pipeline = await Pipeline.findOne({ teamId: user.teamId, isActive: true }).lean();
          if(pipeline){
            pipelineId = pipeline._id;
          }
          console.log(`Lead ${lead._id}: assigned via previous lead history → user ${assignedTo}`);
        }
      }
    }

    // ── Check 3: AI pipeline + priority matching ──
    const pipelines = await Pipeline.find({ isActive: true }).lean();

    if (pipelines.length && !pipelineId) {
      const aiResult = await matchPipelineWithAI(lead, pipelines);
      priority = aiResult.priority;

      const matchedPipeline = pipelines.find(p => String(p._id) === String(aiResult.pipelineId));

      if (matchedPipeline) {
        pipelineId = matchedPipeline._id;
        const firstStage = await getFirstStage(pipelineId);
        if (firstStage) stageId = firstStage._id;

        // If no user assigned yet, get least loaded from pipeline's team
        if (!assignedTo) {
          assignedTo = await getLeastLoadedMember(matchedPipeline.teamId);
          console.log(`Lead ${lead._id}: AI matched pipeline "${matchedPipeline.name}", assigned user ${assignedTo}`);
        }
      } else {
        // AI couldn't match — use default pipeline
        const defaultPipeline = await getDefaultPipeline();
        if (defaultPipeline) {
          pipelineId = defaultPipeline._id;
          const firstStage = await getFirstStage(pipelineId);
          if (firstStage) stageId = firstStage._id;
          if (!assignedTo) {
            assignedTo = await getLeastLoadedMember(defaultPipeline.teamId, priority);
          }
          console.log(`Lead ${lead._id}: no AI match, fallback to default pipeline "${defaultPipeline.name}"`);
        }
      }
    }

    // ── Apply update ──
    const update = { priority };
    if (pipelineId) update.pipelineId = pipelineId;
    if (stageId) update.stageId = stageId;
    if (assignedTo) update.assignedTo = assignedTo;

    await Lead.findByIdAndUpdate(lead._id, update);
    console.log(`Lead ${lead._id} final update:`, update);

    // ── Send email to assigned user ──
    if (assignedTo) {
      try {
        const assignedUser = await User.findById(assignedTo).select('name email').lean();
        if (assignedUser?.email) {
          await EmailService.sendTemplateEmail({
            to: assignedUser.email,
            slug: 'new-lead-submission',
            data: {
              name: assignedUser.name,
              link: `${process.env.FRONTEND_URL}/leads/${lead._id}`
            }
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
