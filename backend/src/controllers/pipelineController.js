const Pipeline = require('../models/Pipeline');
const Stage = require('../models/Stage');
const {
  sendSuccess,
  sendBadRequest,
  sendNotFound
} = require('../utils/responseHandler');

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
    if((user.role === 'team_member') || (user.role == 'team_manager')) {
      query.teamId = user.teamId;
    }
    console.log(query, user.role);

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
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    // Fetch stages for each pipeline
    const pipelinesWithStages = await Promise.all(
      pipelines.map(async (pipeline) => {
        const stages = await Stage.find({ pipelineId: pipeline._id })
          .sort({ order: 1 });
        return {
          ...pipeline.toObject(),
          stages: stages
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

    const pipeline = new Pipeline({
      name: name.trim(),
      teamId,
      description: description?.trim() || '',
      isDefault: isDefault || false,
      isActive: isActive !== undefined ? isActive : true
    });

    await pipeline.save();

    const populatedPipeline = await Pipeline.findById(pipeline._id)
      .populate('teamId', 'name');

    sendSuccess(
      res,
      'Pipeline created successfully',
      populatedPipeline
    );
  } catch (error) {
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
      pipeline.isDefault = isDefault;
    }

    if (isActive !== undefined) {
      pipeline.isActive = isActive;
    }

    await pipeline.save();

    const populatedPipeline = await Pipeline.findById(pipeline._id)
      .populate('teamId', 'name');

    sendSuccess(
      res,
      'Pipeline updated successfully',
      populatedPipeline
    );
  } catch (error) {
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
