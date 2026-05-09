const Team = require('../models/Team');
const {
  sendSuccess,
  sendBadRequest,
  sendNotFound
} = require('../utils/responseHandler');

// =========================
// Get All Teams
// =========================
const getTeams = async (req, res) => {
  try {
    const {
      search,
      status,
      page = 1,
      limit = 10
    } = req.query;

    const query = {};

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const teams = await Team.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Team.countDocuments(query);

    sendSuccess(res, 'Teams fetched successfully', {
      teams,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get teams error:', error);
    sendBadRequest(res, 'Failed to fetch teams');
  }
};

// =========================
// Get Team By ID
// =========================
const getTeamById = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);

    if (!team) {
      return sendNotFound(res, 'Team not found');
    }

    sendSuccess(res, 'Team fetched successfully', team);
  } catch (error) {
    console.error('Get team error:', error);
    sendBadRequest(res, 'Failed to fetch team');
  }
};

// =========================
// Create Team
// =========================
const createTeam = async (req, res) => {
  try {
    const {
      name,
      description,
      status
    } = req.body;

    if (!name || name.trim() === '') {
      return sendBadRequest(res, 'Team name is required');
    }

    // Check if team name already exists
    const existingTeam = await Team.findOne({ name: name.trim() });

    if (existingTeam) {
      return sendBadRequest(res, 'Team with this name already exists');
    }

    const team = new Team({
      name: name.trim(),
      description: description?.trim() || '',
      status
    });

    await team.save();

    sendSuccess(
      res,
      'Team created successfully',
      team
    );
  } catch (error) {
    console.error('Create team error:', error);
    sendBadRequest(res, 'Failed to create team');
  }
};

// =========================
// Update Team
// =========================
const updateTeam = async (req, res) => {
  try {
    const teamId = req.params.id;
    const {
      name,
      description,
      status
    } = req.body;

    const team = await Team.findById(teamId);

    if (!team) {
      return sendNotFound(res, 'Team not found');
    }

    // Check duplicate name if name is being changed
    if (name && name.trim() !== team.name) {
      const existingTeam = await Team.findOne({
        name: name.trim(),
        _id: { $ne: teamId }
      });

      if (existingTeam) {
        return sendBadRequest(res, 'Team with this name already exists');
      }

      team.name = name.trim();
    }

    if (description !== undefined) {
      team.description = description?.trim() || '';
    }

    if (status) {
      team.status = status;
    }

    await team.save();

    sendSuccess(
      res,
      'Team updated successfully',
      team
    );
  } catch (error) {
    console.error('Update team error:', error);
    sendBadRequest(res, 'Failed to update team');
  }
};

// =========================
// Delete Team
// =========================
const deleteTeam = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);

    if (!team) {
      return sendNotFound(res, 'Team not found');
    }

    await Team.findByIdAndDelete(req.params.id);

    sendSuccess(res, 'Team deleted successfully');
  } catch (error) {
    console.error('Delete team error:', error);
    sendBadRequest(res, 'Failed to delete team');
  }
};

module.exports = {
  getTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam
};
