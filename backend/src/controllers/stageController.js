const Stage = require('../models/Stage');
const Pipeline = require('../models/Pipeline');
const {
  sendSuccess,
  sendBadRequest,
  sendNotFound
} = require('../utils/responseHandler');

// =========================
// Get All Stages
// =========================
const getStages = async (req, res) => {
  try {
    const {
      search,
      pipelineId,
      isActive,
      page = 1,
      limit = 10
    } = req.query;

    const query = {};

    if (pipelineId) {
      query.pipelineId = pipelineId;
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } }
      ];
    }

    const stages = await Stage.find(query)
      .populate('pipelineId', 'name teamId')
      .sort({ order: 1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Stage.countDocuments(query);

    sendSuccess(res, 'Stages fetched successfully', {
      stages,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get stages error:', error);
    sendBadRequest(res, 'Failed to fetch stages');
  }
};

// =========================
// Get Stage By ID
// =========================
const getStageById = async (req, res) => {
  try {
    const stage = await Stage.findById(req.params.id)
      .populate('pipelineId', 'name teamId');

    if (!stage) {
      return sendNotFound(res, 'Stage not found');
    }

    sendSuccess(res, 'Stage fetched successfully', stage);
  } catch (error) {
    console.error('Get stage error:', error);
    sendBadRequest(res, 'Failed to fetch stage');
  }
};

// =========================
// Get Stages By Pipeline
// =========================
const getStagesByPipeline = async (req, res) => {
  try {
    const {
      search,
      isActive,
      page = 1,
      limit = 10
    } = req.query;

    const query = { pipelineId: req.params.pipelineId };

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } }
      ];
    }

    const stages = await Stage.find(query)
      .populate('pipelineId', 'name teamId')
      .sort({ order: 1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Stage.countDocuments(query);

    sendSuccess(res, 'Pipeline stages fetched successfully', {
      stages,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get pipeline stages error:', error);
    sendBadRequest(res, 'Failed to fetch pipeline stages');
  }
};

// =========================
// Create Stage
// =========================
const createStage = async (req, res) => {
  try {
    const {
      name,
      pipelineId,
      order,
      color,
      isActive
    } = req.body;

    if (!name || name.trim() === '') {
      return sendBadRequest(res, 'Stage name is required');
    }

    if (!pipelineId) {
      return sendBadRequest(res, 'Pipeline ID is required');
    }

    if (order === undefined || order === null) {
      return sendBadRequest(res, 'Stage order is required');
    }

    // Check if pipeline exists
    const pipeline = await Pipeline.findById(pipelineId);
    if (!pipeline) {
      return sendNotFound(res, 'Pipeline not found');
    }

    // Check if stage with same order exists in this pipeline
    const existingStage = await Stage.findOne({ 
      pipelineId, 
      order 
    });

    if (existingStage) {
      return sendBadRequest(res, 'Stage with this order already exists in this pipeline');
    }

    const stage = new Stage({
      name: name.trim(),
      pipelineId,
      order: Number(order),
      color: color || '#6B7280',
      isActive: isActive !== undefined ? isActive : true
    });

    await stage.save();

    const populatedStage = await Stage.findById(stage._id)
      .populate('pipelineId', 'name teamId');

    sendSuccess(
      res,
      'Stage created successfully',
      populatedStage
    );
  } catch (error) {
    console.error('Create stage error:', error);
    sendBadRequest(res, 'Failed to create stage');
  }
};

// =========================
// Update Stage
// =========================
const updateStage = async (req, res) => {
  try {
    const stageId = req.params.id;
    const {
      name,
      pipelineId,
      order,
      color,
      isActive
    } = req.body;

    const stage = await Stage.findById(stageId);

    if (!stage) {
      return sendNotFound(res, 'Stage not found');
    }

    // If pipelineId is being changed, check if new pipeline exists
    if (pipelineId && pipelineId !== stage.pipelineId.toString()) {
      const pipeline = await Pipeline.findById(pipelineId);
      if (!pipeline) {
        return sendNotFound(res, 'Pipeline not found');
      }
    }

    // Check duplicate order if order is being changed
    if (order !== undefined && order !== stage.order) {
      const existingStage = await Stage.findOne({
        pipelineId: pipelineId || stage.pipelineId,
        order: Number(order),
        _id: { $ne: stageId }
      });

      if (existingStage) {
        return sendBadRequest(res, 'Stage with this order already exists in this pipeline');
      }
    }

    if (name && name.trim() !== stage.name) {
      stage.name = name.trim();
    }

    if (pipelineId) {
      stage.pipelineId = pipelineId;
    }

    if (order !== undefined) {
      stage.order = Number(order);
    }

    if (color) {
      stage.color = color;
    }

    if (isActive !== undefined) {
      stage.isActive = isActive;
    }

    await stage.save();

    const populatedStage = await Stage.findById(stage._id)
      .populate('pipelineId', 'name teamId');

    sendSuccess(
      res,
      'Stage updated successfully',
      populatedStage
    );
  } catch (error) {
    console.error('Update stage error:', error);
    sendBadRequest(res, 'Failed to update stage');
  }
};

// =========================
// Delete Stage
// =========================
const deleteStage = async (req, res) => {
  try {
    const stage = await Stage.findById(req.params.id);

    if (!stage) {
      return sendNotFound(res, 'Stage not found');
    }

    await Stage.findByIdAndDelete(req.params.id);

    sendSuccess(res, 'Stage deleted successfully');
  } catch (error) {
    console.error('Delete stage error:', error);
    sendBadRequest(res, 'Failed to delete stage');
  }
};

// =========================
// Toggle Stage Status
// =========================
const toggleStageStatus = async (req, res) => {
  try {
    const stage = await Stage.findById(req.params.id);

    if (!stage) {
      return sendNotFound(res, 'Stage not found');
    }

    stage.isActive = !stage.isActive;
    await stage.save();

    const populatedStage = await Stage.findById(stage._id)
      .populate('pipelineId', 'name teamId');

    sendSuccess(
      res,
      'Stage status updated successfully',
      populatedStage
    );
  } catch (error) {
    console.error('Toggle stage status error:', error);
    sendBadRequest(res, 'Failed to toggle stage status');
  }
};

module.exports = {
  getStages,
  getStageById,
  getStagesByPipeline,
  createStage,
  updateStage,
  deleteStage,
  toggleStageStatus
};
