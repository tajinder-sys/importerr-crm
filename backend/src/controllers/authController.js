const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendSuccess, sendBadRequest, sendUnauthorized } = require('../utils/responseHandler');

const generateToken = (user) => {
  console.log('ussssss',user)
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role, teamId:user.team_id },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

const register = async (req, res) => {
  try {
    return sendBadRequest(
      res,
      'Self registration is disabled. Please contact the administrator to create team member accounts.'
    );
  } catch (error) {
    console.error('Registration error:', error);
    sendBadRequest(res, 'Registration failed');
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendBadRequest(res, 'Email and password are required');
    }

    const user = await User.findOne({ email });
    if (!user) {
      return sendUnauthorized(res, 'Invalid credentials');
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return sendUnauthorized(res, 'Invalid credentials');
    }

    if (!user.isActive) {
      return sendUnauthorized(res, 'Account is deactivated');
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user);

    sendSuccess(res, 'Login successful', {
      user,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    sendBadRequest(res, 'Login failed');
  }
};

const me = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return sendUnauthorized(res, 'User not found');
    }

    sendSuccess(res, 'User profile retrieved', { user });
  } catch (error) {
    console.error('Profile error:', error);
    sendBadRequest(res, 'Failed to retrieve profile');
  }
};

const logout = async (req, res) => {
  sendSuccess(res, 'Logout successful');
};

module.exports = {
  register,
  login,
  me,
  logout
};
