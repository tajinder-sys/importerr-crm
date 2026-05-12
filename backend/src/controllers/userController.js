const User = require('../models/User');
const {
  sendSuccess,
  sendBadRequest,
  sendNotFound
} = require('../utils/responseHandler');
const { USER_ROLES } = require('../utils/constants');

const {
  validateUserData,
  normalizeIndianPhone
} = require('../utils/validators');

const Team = require('../models/Team');

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
      team_id
    } = req.query;

    const query = {
      isActive: true
    };

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

    const users = await User.find(query)
      .select('-password')
      .populate({
        path: 'team_id',
        select: 'name status',
        match: { status: 'active' }
      })
      .sort({ createdAt: -1 })
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
      team_id
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

    const user = new User({
      name,
      email,
      password,
      role,
      phone: phone
        ? normalizeIndianPhone(phone)
        : '',
      team_id: team_id || null
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
      team_id
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

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  updateUserPassword,
  deactivateUser
};