const Pipeline = require('../models/Pipeline');
const Stage = require('../models/Stage');
const Lead = require('../models/lead');
const mongoose = require('mongoose');
const {
  sendSuccess,
  sendBadRequest,
  sendNotFound
} = require('../utils/responseHandler');

/** Normalize request booleans (string "false" is truthy in JS). */
const parseBool = (val, fallback) => {
  if (val === undefined || val === null) return fallback;
  if (typeof val === 'boolean') return val;
  if (val === 'true' || val === 1 || val === '1') return true;
  if (val === 'false' || val === 0 || val === '0') return false;
  return fallback;
};

const asObjectId = (id) => {
  if (!id) return id;
  if (id instanceof mongoose.Types.ObjectId) return id;
  if (mongoose.Types.ObjectId.isValid(id)) return new mongoose.Types.ObjectId(String(id));
  return id;
};

/** Clear isDefault on every other pipeline in the team (call before save when this doc is default). */
const unsetOtherDefaults = async (teamId, keepPipelineId) => {
  const tid = asObjectId(teamId);
  const keep = asObjectId(keepPipelineId);
  await Pipeline.updateMany(
    {  _id: { $ne: keep } },
    { $set: { isDefault: false } }
  );
};

/** If multiple defaults exist (e.g. race), keep the most recently updated one. */
const dedupeDefaultsForTeam = async (teamId) => {
  const tid = asObjectId(teamId);
  const rows = await Pipeline.find({isDefault: true })
    .sort({ updatedAt: -1 })
    .select('_id')
    .lean();
  if (rows.length <= 1) return;
  const keep = rows[0]._id;
  await Pipeline.updateMany(
    {_id: { $ne: keep } },
    { $set: { isDefault: false } }
  );
};

// =========================
// Get All Pipelines
// =========================
const getPipelines = async (req, res) => {
  try {
    const {
      search,
      teamId,
      isDefault,
      isActive,
      page = 1,
      limit = 10
    } = req.query;

    const query = {};

    if (teamId) {
      query.teamId = teamId;
    }
    const user = req.user;
    if ((user.role === 'team_member') || (user.role === 'team_manager')) {
      query.teamId = user.teamId;
    }

    if (isDefault !== undefined) {
      query.isDefault = isDefault === 'true';
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const pipelines = await Pipeline.find(query)
      .populate('teamId', 'name')
      .sort({ _id: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const pipelineIds = pipelines.map((p) => p._id);

    // Count leads per pipeline in one query
    const leadCounts = await Lead.aggregate([
      { $match: { pipelineId: { $in: pipelineIds }, duplicateOf: { $in: [null, undefined] } } },
      { $group: { _id: '$pipelineId', count: { $sum: 1 } } },
    ]);
    const leadCountMap = {};
    leadCounts.forEach((r) => { leadCountMap[String(r._id)] = r.count; });

    // Fetch stages for each pipeline
    const pipelinesWithStages = await Promise.all(
      pipelines.map(async (pipeline) => {
        const stages = await Stage.find({ pipelineId: pipeline._id })
          .sort({ order: 1 });
        return {
          ...pipeline.toObject(),
          stages,
          totalLeads: leadCountMap[String(pipeline._id)] || 0,
        };
      })
    );

    const total = await Pipeline.countDocuments(query);

    sendSuccess(res, 'Pipelines fetched successfully', {
      pipelines: pipelinesWithStages,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get pipelines error:', error);
    sendBadRequest(res, 'Failed to fetch pipelines');
  }
};

// =========================
// Get Pipeline By ID
// =========================
const getPipelineById = async (req, res) => {
  try {
    const pipeline = await Pipeline.findById(req.params.id)
      .populate('teamId', 'name');

    if (!pipeline) {
      return sendNotFound(res, 'Pipeline not found');
    }

    sendSuccess(res, 'Pipeline fetched successfully', pipeline);
  } catch (error) {
    console.error('Get pipeline error:', error);
    sendBadRequest(res, 'Failed to fetch pipeline');
  }
};

// =========================
// Get Pipelines By Team
// =========================
const getPipelinesByTeam = async (req, res) => {
  try {
    const {
      search,
      isDefault,
      isActive,
      page = 1,
      limit = 10
    } = req.query;

    const query = { teamId: req.params.teamId };

    if (isDefault !== undefined) {
      query.isDefault = isDefault === 'true';
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const pipelines = await Pipeline.find(query)
      .populate('teamId', 'name')
      .sort({ isDefault: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Pipeline.countDocuments(query);

    sendSuccess(res, 'Team pipelines fetched successfully', {
      pipelines,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get team pipelines error:', error);
    sendBadRequest(res, 'Failed to fetch team pipelines');
  }
};

// =========================
// Create Pipeline
// =========================
const createPipeline = async (req, res) => {
  try {
    const {
      name,
      teamId,
      description,
      isDefault,
      isActive
    } = req.body;

    if (!name || name.trim() === '') {
      return sendBadRequest(res, 'Pipeline name is required');
    }

    if (!teamId) {
      return sendBadRequest(res, 'Team ID is required');
    }

    // Check if pipeline name already exists for this team
    const existingPipeline = await Pipeline.findOne({ 
      name: name.trim(), 
      teamId 
    });

    if (existingPipeline) {
      return sendBadRequest(res, 'Pipeline with this name already exists for this team');
    }

    const wantsDefault = parseBool(isDefault, false);
    const wantsActive = parseBool(isActive, true);

    const pipeline = new Pipeline({
      name: name.trim(),
      teamId,
      description: description?.trim() || '',
      isDefault: wantsDefault,
      isActive: wantsActive
    });

    if (wantsDefault) {
      await unsetOtherDefaults(teamId, pipeline._id);
    }

    await pipeline.save();
    await dedupeDefaultsForTeam(teamId);

    const populatedPipeline = await Pipeline.findById(pipeline._id)
      .populate('teamId', 'name');

    sendSuccess(
      res,
      'Pipeline created successfully',
      populatedPipeline
    );
  } catch (error) {
    if (error?.code === 11000) {
      return sendBadRequest(res, 'Only one default pipeline is allowed per team');
    }
    console.error('Create pipeline error:', error);
    sendBadRequest(res, 'Failed to create pipeline');
  }
};

// =========================
// Update Pipeline
// =========================
const updatePipeline = async (req, res) => {
  try {
    const pipelineId = req.params.id;
    const {
      name,
      teamId,
      description,
      isDefault,
      isActive
    } = req.body;

    const pipeline = await Pipeline.findById(pipelineId);

    if (!pipeline) {
      return sendNotFound(res, 'Pipeline not found');
    }

    // Check duplicate name if name is being changed
    if (name && name.trim() !== pipeline.name) {
      const existingPipeline = await Pipeline.findOne({
        name: name.trim(),
        teamId: teamId || pipeline.teamId,
        _id: { $ne: pipelineId }
      });

      if (existingPipeline) {
        return sendBadRequest(res, 'Pipeline with this name already exists for this team');
      }

      pipeline.name = name.trim();
    }

    if (teamId) {
      pipeline.teamId = teamId;
    }

    if (description !== undefined) {
      pipeline.description = description?.trim() || '';
    }

    if (isDefault !== undefined) {
      pipeline.isDefault = parseBool(isDefault, false);
    }

    if (isActive !== undefined) {
      pipeline.isActive = parseBool(isActive, true);
    }

    const finalTeamId = pipeline.teamId;

    if (pipeline.isDefault) {
      await unsetOtherDefaults(finalTeamId, pipeline._id);
    }

    await pipeline.save();
    await dedupeDefaultsForTeam(finalTeamId);

    const populatedPipeline = await Pipeline.findById(pipeline._id)
      .populate('teamId', 'name');

    sendSuccess(
      res,
      'Pipeline updated successfully',
      populatedPipeline
    );
  } catch (error) {
    if (error?.code === 11000) {
      return sendBadRequest(res, 'Only one default pipeline is allowed per team');
    }
    console.error('Update pipeline error:', error);
    sendBadRequest(res, 'Failed to update pipeline');
  }
};

// =========================
// Delete Pipeline
// =========================
const deletePipeline = async (req, res) => {
  try {
    const pipeline = await Pipeline.findById(req.params.id);

    if (!pipeline) {
      return sendNotFound(res, 'Pipeline not found');
    }

    // Check if pipeline has stages
    const stageCount = await Stage.countDocuments({ pipelineId: req.params.id });
    if (stageCount > 0) {
      return sendBadRequest(res, 'Cannot delete pipeline with existing stages. Please delete all stages first.');
    }

    await Pipeline.findByIdAndDelete(req.params.id);

    sendSuccess(res, 'Pipeline deleted successfully');
  } catch (error) {
    console.error('Delete pipeline error:', error);
    sendBadRequest(res, 'Failed to delete pipeline');
  }
};

module.exports = {
  getPipelines,
  getPipelineById,
  getPipelinesByTeam,
  createPipeline,
  updatePipeline,
  deletePipeline
};
