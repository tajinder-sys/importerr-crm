const { USER_ROLES } = require('../utils/constants');

const isAdminUser = (user) => user?.role === 'admin';

/**
 * Mongo match fragment restricting which tasks a user may list/count.
 * Returns null for admin (no extra restriction).
 */
const taskVisibilityMatch = (user, queryParams = {}) => {
  if (!user) return { _id: null };
  if (isAdminUser(user)) return null;

  const userId = user.id || user._id;
  const myTeamId = user.teamId || user.team_id;

  if (user.role === USER_ROLES.TEAM_MANAGER) {
    const scope = String(queryParams.scope || '').toLowerCase();
    if (scope === 'mine') {
      return { $or: [{ assigned_to: userId }, { created_by: userId }] };
    }
    if (scope === 'team' && myTeamId) {
      return { team_id: myTeamId };
    }
    if (myTeamId) {
      return {
        $or: [{ assigned_to: userId }, { created_by: userId }, { team_id: myTeamId }],
      };
    }
    return { $or: [{ assigned_to: userId }, { created_by: userId }] };
  }

  // team_member (and any other non-admin role)
  return { $or: [{ assigned_to: userId }, { created_by: userId }] };
};

module.exports = { taskVisibilityMatch, isAdminUser };
