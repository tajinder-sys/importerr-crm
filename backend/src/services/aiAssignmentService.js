const OpenAI = require('openai');
const Pipeline = require('../models/Pipeline');
const Stage = require('../models/Stage');
const User = require('../models/User');
const Lead = require('../models/lead');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Get least loaded active member from a team
const getLeastLoadedMember = async (teamId) => {
  const members = await User.find({ team_id: teamId, isActive: true, role: 'team_member' })
    .select('_id')
    .lean();

  console.log(`getLeastLoadedMember: teamId=${teamId}, found ${members.length} members`);
  if (!members.length) return null;

  const counts = await Lead.aggregate([
    { $match: { assignedTo: { $in: members.map(m => m._id) } } },
    { $group: { _id: '$assignedTo', count: { $sum: 1 } } }
  ]);

  const countMap = new Map(counts.map(c => [String(c._id), c.count]));
  const sorted = [...members].sort((a, b) => (countMap.get(String(a._id)) || 0) - (countMap.get(String(b._id)) || 0));
  return sorted[0]._id;
};

const assignLeadWithAI = async (lead) => {
  try {
    if (!process.env.OPENAI_API_KEY) return;

    // Fetch all active pipelines
    const pipelines = await Pipeline.find({ isActive: true }).lean();
    if (!pipelines.length) return;

    const pipelineList = pipelines.map(p => `- ID: ${p._id} | Name: ${p.name} | Description: ${p.description || 'N/A'}`).join('\n');

    const prompt = `You are a CRM lead routing assistant. Based on the lead details below, pick the most relevant pipeline from the list.

Lead:
- Name: ${lead.name}
- Source: ${lead.source}
- Message: ${lead.message || 'N/A'}
- Email: ${lead.email || 'N/A'}

Pipelines:
${pipelineList}

Reply with ONLY the pipeline ID that best matches this lead. If none match, reply with "none".`;

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 50,
      temperature: 0
    });

    const reply = response.choices[0]?.message?.content?.trim();
    if (!reply || reply === 'none') return;

    const matchedPipeline = pipelines.find(p => String(p._id) === reply);
    if (!matchedPipeline) return;

    // Get first active stage of matched pipeline
    const firstStage = await Stage.findOne({ pipelineId: matchedPipeline._id, isActive: true })
      .sort({ order: 1 })
      .lean();

    // Get least loaded team member
    const assignedTo = await getLeastLoadedMember(matchedPipeline.teamId);

    // Update lead
    const update = { pipelineId: matchedPipeline._id };
    if (firstStage) update.stageId = firstStage._id;
    if (assignedTo) update.assignedTo = assignedTo;

    await Lead.findByIdAndUpdate(lead._id, update);

    console.log(`AI assigned lead ${lead._id} → pipeline: ${matchedPipeline.name}, member: ${assignedTo}`);
  } catch (err) {
    console.error('AI assignment error:', err.message);
  }
};

module.exports = { assignLeadWithAI };
