const Lead = require('../models/lead');
const Task = require('../models/Task');
const User = require('../models/User');
const { sendSuccess, sendBadRequest, sendNotFound, sendForbidden } = require('../utils/responseHandler');
const { validateTaskData } = require('../utils/validators');

const TASK_TYPES = {
  CALL: 'call',
  MEETING: 'meeting',
  FOLLOW_UP: 'follow_up',
  EMAIL: 'email',
  DEMO: 'demo',
  WHATSAPP: 'whatsapp',
  VISIT: 'visit',
  CUSTOM: 'custom'
};

const TASK_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  OVERDUE: 'overdue'
};

const TASK_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent'
};

const isAdminUser = (user) => user?.role === 'admin';
const isTeamUser = (user) => user?.role === 'team_member' || user?.role === 'team_manager';
const canViewTask = (task, user) => {
  if (isAdminUser(user)) return true;
  if (task.assigned_to?.toString() === user.id) return true;
  if (task.created_by?.toString() === user.id) return true;
  if (task.team_id && user.team_id?.toString() === task.team_id.toString()) return true;
  return false;
};

const getTasks = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      task_type,
      priority,
      assigned_to,
      lead_id,
      team_id,
      search,
      due_date,
      start_date,
      end_date,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    // Status filter
    if (status) query.status = status;

    // Task type filter
    if (task_type) query.task_type = task_type;

    // Priority filter
    if (priority) query.priority = priority;

    // Lead filter
    if (lead_id) query.lead_id = lead_id;

    // Team filter
    if (team_id) query.team_id = team_id;

    // Admins see all tasks; everyone else only tasks they created
    if (!isAdminUser(req.user)) {
      query.created_by = req.user.id;
    }

    // Date range filters
    if (due_date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      if (due_date === 'today') {
        query.due_date = { $gte: today, $lt: tomorrow };
      } else if (due_date === 'overdue') {
        query.due_date = { $lt: today };
        query.status = { $in: ['pending', 'in_progress'] };
      } else if (due_date === 'upcoming') {
        query.due_date = { $gte: today };
        query.status = { $in: ['pending', 'in_progress'] };
      }
    }

    // Custom date range
    if (start_date || end_date) {
      query.due_date = {};
      if (start_date) query.due_date.$gte = new Date(start_date);
      if (end_date) query.due_date.$lte = new Date(end_date);
    }

    // Search filter
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Assigned to filter (admins may filter by any assignee)
    if (assigned_to) {
      query.assigned_to = assigned_to;
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const tasks = await Task.find(query)
      .populate('lead_id', 'name email phone')
      .populate('assigned_to', 'name email')
      .populate('created_by', 'name email')
      .populate('team_id', 'name')
      .populate('notes.created_by', 'name email')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Task.countDocuments(query);

    sendSuccess(res, 'Tasks retrieved successfully', {
      tasks,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    sendBadRequest(res, 'Failed to retrieve tasks');
  }
};

const getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('lead_id', 'name email phone')
      .populate('assigned_to', 'name email')
      .populate('created_by', 'name email')
      .populate('team_id', 'name')
      .populate('notes.created_by', 'name email');

    if (!task) {
      return sendNotFound(res, 'Task not found');
    }

    if (!canViewTask(task, req.user)) {
      return sendForbidden(res, 'You do not have permission to view this task');
    }

    sendSuccess(res, 'Task retrieved successfully', task);
  } catch (error) {
    console.error('Get task error:', error);
    sendBadRequest(res, 'Failed to retrieve task');
  }
};

const createTask = async (req, res) => {
  try {
    const {
      title,
      description,
      lead_id,
      assigned_to,
      team_id,
      task_type,
      priority,
      start_date,
      due_date,
      reminder_at,
      is_recurring,
      repeat_type,
      repeat_interval,
      repeat_days,
      repeat_end_date
    } = req.body;

    // Validation
    if (!title || title.trim() === '') {
      return sendBadRequest(res, 'Task title is required');
    }

    if (!lead_id) {
      return sendBadRequest(res, 'Lead ID is required');
    }

    // Verify lead exists
    const lead = await Lead.findById(lead_id);
    if (!lead) {
      return sendBadRequest(res, 'Lead not found');
    }

    // Verify assigned user exists (if provided)
    if (assigned_to) {
      const assignedUser = await User.findById(assigned_to);
      if (!assignedUser) {
        return sendBadRequest(res, 'Assigned user not found');
      }
    }

    // Set team_id if not provided
    let resolvedTeamId = team_id;
    if (!resolvedTeamId && req.user.team_id) {
      resolvedTeamId = req.user.team_id;
    }

    const task = new Task({
      title: title.trim(),
      description,
      lead_id,
      assigned_to: assigned_to || null,
      created_by: req.user.id,
      team_id: resolvedTeamId,
      task_type: task_type || TASK_TYPES.FOLLOW_UP,
      priority: priority || TASK_PRIORITY.MEDIUM,
      start_date: start_date ? new Date(start_date) : null,
      due_date: due_date ? new Date(due_date) : null,
      reminder_at: reminder_at ? new Date(reminder_at) : null,
      is_recurring: is_recurring || false,
      repeat_type,
      repeat_interval: repeat_interval || 1,
      repeat_days: repeat_days || [],
      repeat_end_date: repeat_end_date ? new Date(repeat_end_date) : null
    });

    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate('lead_id', 'name email phone')
      .populate('assigned_to', 'name email')
      .populate('created_by', 'name email')
      .populate('team_id', 'name');

    sendSuccess(res, 'Task created successfully', populatedTask);
  } catch (error) {
    console.error('Create task error:', error);
    sendBadRequest(res, 'Failed to create task');
  }
};

const updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return sendNotFound(res, 'Task not found');
    }

    // Permission check
    if (!canViewTask(task, req.user)) {
      return sendForbidden(res, 'You do not have permission to update this task');
    }

    const {
      title,
      description,
      assigned_to,
      task_type,
      priority,
      status,
      start_date,
      due_date,
      reminder_at,
      is_recurring,
      repeat_type,
      repeat_interval,
      repeat_days,
      repeat_end_date
    } = req.body;

    // Validation
    if (title !== undefined && title.trim() === '') {
      return sendBadRequest(res, 'Task title cannot be empty');
    }

    // Update fields
    if (title !== undefined) task.title = title.trim();
    if (description !== undefined) task.description = description;
    if (task_type !== undefined) task.task_type = task_type;
    if (priority !== undefined) task.priority = priority;
    if (status !== undefined) task.status = status;
    if (start_date !== undefined) task.start_date = start_date ? new Date(start_date) : null;
    if (due_date !== undefined) task.due_date = due_date ? new Date(due_date) : null;
    if (reminder_at !== undefined) task.reminder_at = reminder_at ? new Date(reminder_at) : null;
    if (is_recurring !== undefined) task.is_recurring = is_recurring;
    if (repeat_type !== undefined) task.repeat_type = repeat_type;
    if (repeat_interval !== undefined) task.repeat_interval = repeat_interval;
    if (repeat_days !== undefined) task.repeat_days = repeat_days;
    if (repeat_end_date !== undefined) task.repeat_end_date = repeat_end_date ? new Date(repeat_end_date) : null;

    // Verify assigned user exists (if provided)
    if (assigned_to !== undefined && assigned_to !== task.assigned_to?.toString()) {
      if (assigned_to) {
        const assignedUser = await User.findById(assigned_to);
        if (!assignedUser) {
          return sendBadRequest(res, 'Assigned user not found');
        }
      }
      task.assigned_to = assigned_to || null;
    }

    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate('lead_id', 'name email phone')
      .populate('assigned_to', 'name email')
      .populate('created_by', 'name email')
      .populate('team_id', 'name')
      .populate('notes.created_by', 'name email');

    sendSuccess(res, 'Task updated successfully', populatedTask);
  } catch (error) {
    console.error('Update task error:', error);
    sendBadRequest(res, 'Failed to update task');
  }
};

const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return sendNotFound(res, 'Task not found');
    }

    // Permission check
    if (!canViewTask(task, req.user)) {
      return sendForbidden(res, 'You do not have permission to delete this task');
    }

    // Soft delete
    task.deletedAt = new Date();
    await task.save();

    sendSuccess(res, 'Task deleted successfully');
  } catch (error) {
    console.error('Delete task error:', error);
    sendBadRequest(res, 'Failed to delete task');
  }
};

const addTaskNote = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return sendNotFound(res, 'Task not found');
    }

    // Permission check
    if (!canViewTask(task, req.user)) {
      return sendForbidden(res, 'You do not have permission to add notes to this task');
    }

    const { text } = req.body;

    if (!text || text.trim() === '') {
      return sendBadRequest(res, 'Note text is required');
    }

    await task.addNote(text.trim(), req.user.id);

    const populatedTask = await Task.findById(task._id)
      .populate('lead_id', 'name email phone')
      .populate('assigned_to', 'name email')
      .populate('created_by', 'name email')
      .populate('team_id', 'name')
      .populate('notes.created_by', 'name email');

    sendSuccess(res, 'Note added successfully', populatedTask);
  } catch (error) {
    console.error('Add task note error:', error);
    sendBadRequest(res, 'Failed to add note');
  }
};

const markTaskComplete = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return sendNotFound(res, 'Task not found');
    }

    // Permission check
    if (!canViewTask(task, req.user)) {
      return sendForbidden(res, 'You do not have permission to complete this task');
    }

    await task.markAsCompleted();

    const populatedTask = await Task.findById(task._id)
      .populate('lead_id', 'name email phone')
      .populate('assigned_to', 'name email')
      .populate('created_by', 'name email')
      .populate('team_id', 'name')
      .populate('notes.created_by', 'name email');

    sendSuccess(res, 'Task marked as completed', populatedTask);
  } catch (error) {
    console.error('Mark task complete error:', error);
    sendBadRequest(res, 'Failed to mark task as complete');
  }
};

const getTaskStats = async (req, res) => {
  try {
    const isAdmin = isAdminUser(req.user);

    const baseQuery = isAdmin
      ? {}
      : { created_by: req.user.id };

    const activeStatuses = [
      TASK_STATUS.PENDING,
      TASK_STATUS.IN_PROGRESS
    ];

    const [
      totalTasks,
      pendingTasks,
      inProgressTasks,
      completedTasks,
      overdueTasks,
      todayTasks,
      upcomingTasks
    ] = await Promise.all([
      Task.countDocuments(baseQuery),

      Task.countDocuments({
        ...baseQuery,
        status: TASK_STATUS.PENDING
      }),

      Task.countDocuments({
        ...baseQuery,
        status: TASK_STATUS.IN_PROGRESS
      }),

      Task.countDocuments({
        ...baseQuery,
        status: TASK_STATUS.COMPLETED
      }),

      Task.countDocuments({
        ...baseQuery,
        due_date: { $lt: new Date() },
        status: { $ne: TASK_STATUS.COMPLETED }
      }),

      Task.countDocuments({
        ...baseQuery,
        due_date: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          $lte: new Date(new Date().setHours(23, 59, 59, 999))
        }
      }),

      Task.countDocuments({
        ...baseQuery,
        due_date: { $gte: new Date() },
        status: { $in: activeStatuses }
      })
    ]);

    const tasksByType = await Task.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: '$task_type',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const tasksByPriority = await Task.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    sendSuccess(res, 'Task statistics retrieved successfully', {
      totalTasks,
      pendingTasks,
      inProgressTasks,
      completedTasks,
      overdueTasks,
      todayTasks,
      upcomingTasks,
      tasksByType,
      tasksByPriority
    });
  } catch (error) {
    console.error('Get task stats error:', error);
    sendBadRequest(res, 'Failed to retrieve task statistics');
  }
};

module.exports = {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  addTaskNote,
  markTaskComplete,
  getTaskStats
};
