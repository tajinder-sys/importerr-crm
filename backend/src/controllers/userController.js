const User = require('../models/User');
const {
  sendSuccess,
  sendBadRequest,
  sendNotFound
} = require('../utils/responseHandler');
const { USER_ROLES, TASK_PRIORITY_LEVELS } = require('../utils/constants');

const {
  validateUserData,
  normalizeIndianPhone
} = require('../utils/validators');

const Team = require('../models/Team');
const Pipeline = require('../models/Pipeline');

// =========================
// Get All Users
// =========================
const getUsers = async (req, res) => {
  try {
    const {
      role,
      roles,
      search,
      includeAdmin = 'false',
      page = 1,
      limit = 10,
      team_id,
      sortKey,
      sortDirection = 'desc',
      priority
    } = req.query;

    const query = {
      isActive: true
    };

    if (priority && priority !== 'all') {
      if (!Object.values(TASK_PRIORITY_LEVELS).includes(priority)) {
        return sendBadRequest(res, 'Invalid priority filter');
      }
      query.priority = priority;
    }

    const roleList = roles
      ? String(roles)
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean)
      : [];

    if (roleList.length > 0) {
      const allowed = roleList.filter((r) => Object.values(USER_ROLES).includes(r));
      if (allowed.length !== roleList.length) {
        return sendBadRequest(res, 'Invalid role in roles filter');
      }
      query.role = allowed.length === 1 ? allowed[0] : { $in: allowed };
    } else if (role) {
      query.role = role;
    } else if (includeAdmin !== 'true') {
      query.role = { $ne: 'admin' };
    }

    if (team_id) {
      query.team_id = team_id;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const allowedSort = new Set(['name', 'email', 'phone', 'role', 'createdAt', 'priority']);
    const sk = allowedSort.has(String(sortKey || '')) ? sortKey : 'createdAt';
    const order = String(sortDirection).toLowerCase() === 'asc' ? 1 : -1;
    const sortSpec = { [sk]: order };

    const users = await User.find(query)
      .select('-password')
      .populate({
        path: 'team_id',
        select: 'name status',
        match: { status: 'active' }
      })
      .sort(sortSpec)
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const filteredUsers = users.filter(
      user => !user.team_id || user.team_id.status === 'active'
    );

    const total = await User.countDocuments(query);

    sendSuccess(res, 'Users fetched successfully', {
      users,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    sendBadRequest(res, 'Failed to fetch users');
  }
};

// =========================
// Get User By ID
// =========================
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('team_id', 'name');

    if (!user) {
      return sendNotFound(res, 'User not found');
    }

    sendSuccess(res, 'User fetched successfully', user);
  } catch (error) {
    console.error('Get user error:', error);
    sendBadRequest(res, 'Failed to fetch user');
  }
};

// =========================
// Create User
// =========================
const createUser = async (req, res) => {
  try {
    const errors = validateUserData(req.body);

    if (errors.length > 0) {
      return sendBadRequest(res, 'Validation failed', errors);
    }

    const {
      name,
      email,
      password,
      role,
      phone,
      team_id,
      priority
    } = req.body;

    // Prevent admin creation from UI
    if (role === 'admin') {
      return sendBadRequest(
        res,
        'Admin users can only be created manually'
      );
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return sendBadRequest(
        res,
        'User with this email already exists'
      );
    }

    const priorityVal =
      priority && Object.values(TASK_PRIORITY_LEVELS).includes(priority)
        ? priority
        : TASK_PRIORITY_LEVELS.MEDIUM;

    const user = new User({
      name,
      email,
      password,
      role,
      phone: phone
        ? normalizeIndianPhone(phone)
        : '',
      team_id: team_id || null,
      priority: priorityVal
    });

    await user.save();

    sendSuccess(
      res,
      'User created successfully',
      user
    );
  } catch (error) {
    console.error('Create user error:', error);
    sendBadRequest(res, 'Failed to create user');
  }
};

// =========================
// Update User
// =========================
const updateUser = async (req, res) => {
  try {
    const userId = req.params.id;

    const {
      name,
      email,
      role,
      phone,
      isActive,
      team_id,
      priority,
      password
    } = req.body;

    // User can update own profile
    // Admin can update anyone
    if (
      req.user.id !== userId &&
      req.user.role !== 'admin'
    ) {
      return sendBadRequest(
        res,
        'You can only update your own profile'
      );
    }

    const user = await User.findById(userId);

    if (!user) {
      return sendNotFound(res, 'User not found');
    }

    // Check duplicate email
    if (email && email !== user.email) {
      const existingUser = await User.findOne({
        email,
        _id: { $ne: userId }
      });

      if (existingUser) {
        return sendBadRequest(
          res,
          'User with this email already exists'
        );
      }

      user.email = email;
    }

    if (name) {
      user.name = name;
    }

    if (phone !== undefined) {
      user.phone = phone
        ? normalizeIndianPhone(phone)
        : '';
    }

    // Only admin can change role
    if (role && req.user.role === 'admin') {
      if (role === 'admin') {
        return sendBadRequest(
          res,
          'Setting admin role is not allowed'
        );
      }

      user.role = role;
    }

    if (password && req.user.role === 'admin') {
      user.password = password;
    }

    if (isActive !== undefined) {
      user.isActive = isActive;
    }

    if (team_id !== undefined) {
      // Validate team_id if provided
      if (team_id) {
        const validTeam = await Team.findById(team_id);
        if (!validTeam) {
          return sendBadRequest(res, 'Invalid team selected');
        }
      }
      user.team_id = team_id || null;
    }

    if (priority !== undefined && req.user.role === 'admin') {
      if (!Object.values(TASK_PRIORITY_LEVELS).includes(priority)) {
        return sendBadRequest(res, 'Invalid priority');
      }
      user.priority = priority;
    }

    await user.save();

    sendSuccess(
      res,
      'User updated successfully',
      user
    );
  } catch (error) {
    console.error('Update user error:', error);
    sendBadRequest(res, 'Failed to update user');
  }
};

// =========================
// Update Password
// =========================
const updateUserPassword = async (req, res) => {
  try {
    const userId = req.params.id;

    const {
      currentPassword,
      newPassword
    } = req.body;

    if (req.user.id !== userId) {
      return sendBadRequest(
        res,
        'You can only change your own password'
      );
    }

    if (!currentPassword || !newPassword) {
      return sendBadRequest(
        res,
        'Current password and new password are required'
      );
    }

    if (newPassword.length < 6) {
      return sendBadRequest(
        res,
        'Password must be at least 6 characters'
      );
    }

    const user = await User.findById(userId);

    if (!user) {
      return sendNotFound(res, 'User not found');
    }

    const isMatch = await user.comparePassword(
      currentPassword
    );

    if (!isMatch) {
      return sendBadRequest(
        res,
        'Current password is incorrect'
      );
    }

    user.password = newPassword;

    await user.save();

    sendSuccess(
      res,
      'Password updated successfully'
    );
  } catch (error) {
    console.error('Update password error:', error);
    sendBadRequest(res, 'Failed to update password');
  }
};

// =========================
// Deactivate User
// =========================
const deactivateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return sendNotFound(res, 'User not found');
    }

    user.isActive = false;

    await user.save();

    sendSuccess(
      res,
      'User deactivated successfully'
    );
  } catch (error) {
    console.error('Deactivate user error:', error);
    sendBadRequest(res, 'Failed to deactivate user');
  }
};

// =========================
// Team roster for filters / pickers (active team_member + team_manager, id + name only)
// =========================
const getTeamAssignableRoster = async (req, res) => {
  try {
    const requestedTeamId = req.query.team_id ? String(req.query.team_id).trim() : '';
    const requestedPipelineId = req.query.pipeline_id ? String(req.query.pipeline_id).trim() : '';

    if (req.user.role === USER_ROLES.TEAM_MEMBER) {
      const u = await User.findById(req.user.id).select('name').lean();
      return sendSuccess(res, 'Team roster retrieved successfully', {
        users: u ? [{ _id: u._id, name: u.name || '' }] : [],
      });
    }

    let pipelineTeamId = null;
    if (requestedPipelineId) {
      const pipeline = await Pipeline.findById(requestedPipelineId).select('teamId').lean();
      if (!pipeline?.teamId) {
        return sendSuccess(res, 'Team roster retrieved successfully', { users: [] });
      }
      pipelineTeamId = String(pipeline.teamId);
      if (req.user.role === USER_ROLES.TEAM_MANAGER) {
        const mt = req.user.teamId || req.user.team_id;
        if (!mt || pipelineTeamId !== String(mt)) {
          return sendSuccess(res, 'Team roster retrieved successfully', { users: [] });
        }
      }
    }

    const filter = {
      isActive: true,
      role: { $in: [USER_ROLES.TEAM_MEMBER, USER_ROLES.TEAM_MANAGER] },
    };

    if (req.user.role === USER_ROLES.TEAM_MANAGER) {
      const mt = req.user.teamId || req.user.team_id;
      if (!mt) {
        return sendSuccess(res, 'Team roster retrieved successfully', { users: [] });
      }
      filter.team_id = mt;
    } else if (req.user.role === USER_ROLES.ADMIN) {
      if (pipelineTeamId) {
        filter.team_id = pipelineTeamId;
      } else if (requestedTeamId) {
        filter.team_id = requestedTeamId;
      }
    }

    const users = await User.find(filter).select('name').sort({ name: 1 }).lean();

    const list = users.map((u) => ({
      _id: u._id,
      name: u.name || '',
    }));

    sendSuccess(res, 'Team roster retrieved successfully', { users: list });
  } catch (error) {
    console.error('getTeamAssignableRoster error:', error);
    sendBadRequest(res, 'Failed to load team roster');
  }
};

module.exports = {
  getUsers,
  getUserById,
  getTeamAssignableRoster,
  createUser,
  updateUser,
  updateUserPassword,
  deactivateUser
};