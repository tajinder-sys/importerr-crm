const Task = require('../models/Task');
const { taskVisibilityMatch } = require('../services/taskQueryVisibility');

const OPEN_STATUSES = ['pending', 'in_progress'];

/**
 * Count tasks due today (local calendar day) for header / me API.
 * Visibility matches task list: admins see all; managers see team + own; members see assigned/created by self.
 */
async function countTodayTasksForUser(user) {
  if (!user?._id) return 0;

  const actor = {
    id: user._id,
    role: user.role,
    team_id: user.team_id,
    teamId: user.team_id,
  };

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const query = {
    deletedAt: { $exists: false },
    due_date: { $gte: start, $lt: end },
    status: { $in: OPEN_STATUSES },
  };

  const vis = taskVisibilityMatch(actor, {});
  if (vis) {
    query.$and = [vis];
  }

  return Task.countDocuments(query);
}

module.exports = { countTodayTasksForUser };
