const jwt = require('jsonwebtoken');
const { sendUnauthorized, sendForbidden } = require('../utils/responseHandler');
const { USER_ROLES } = require('../utils/constants');

const auth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return sendUnauthorized(res, 'Access token required');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return sendUnauthorized(res, 'Invalid token');
  }
};

const authorize = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendUnauthorized(res, 'Authentication required');
    }

    if (!roles.includes(req.user.role)) {
      return sendForbidden(res, 'Insufficient permissions');
    }

    next();
  };
};

const adminOnly = authorize([USER_ROLES.ADMIN]);
const adminOrTeamMember = authorize([USER_ROLES.ADMIN, USER_ROLES.TEAM_MANAGER, USER_ROLES.TEAM_MEMBER]);

module.exports = {
  auth,
  authorize,
  adminOnly,
  adminOrTeamMember
};
