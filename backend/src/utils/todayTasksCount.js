const Task = require('../models/Task');

const OPEN_STATUSES = ['pending', 'in_progress'];

/**
 * Count tasks due today (local calendar day) for header / me API.
 * Same visibility as task stats: admins see all; others see tasks they created.
 */
async function countTodayTasksForUser(user) {
  if (!user?._id) return 0;

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const query = {
    deletedAt: { $exists: false },
    due_date: { $gte: start, $lt: end },
    status: { $in: OPEN_STATUSES },
  };

  if (user.role !== 'admin') {
    query.created_by = user._id;
  }

  return Task.countDocuments(query);
}

module.exports = { countTodayTasksForUser };
