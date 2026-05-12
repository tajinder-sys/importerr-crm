const SellerAssignment = require('../models/SellerAssignment');
const User = require('../models/User');
const {
  sendSuccess,
  sendBadRequest,
  sendNotFound,
} = require('../utils/responseHandler');
const { USER_ROLES } = require('../utils/constants');

const ASSIGNABLE_ROLES = [USER_ROLES.TEAM_MEMBER, USER_ROLES.TEAM_MANAGER];

const normalizeImporterrUserId = (id) => String(id || '').trim();

const listSellerAssignments = async (req, res) => {
  try {
    const rows = await SellerAssignment.find()
      .populate('assignedCrmUserId', 'name email role isActive')
      .sort({ updatedAt: -1 })
      .lean();
    sendSuccess(res, 'Seller assignments fetched successfully', { assignments: rows });
  } catch (error) {
    console.error('listSellerAssignments error:', error);
    sendBadRequest(res, 'Failed to fetch seller assignments');
  }
};

const upsertSellerAssignment = async (req, res) => {
  try {
    const importerrUserId = normalizeImporterrUserId(req.params.importerrUserId);
    if (!importerrUserId) {
      return sendBadRequest(res, 'importerrUserId is required');
    }

    const { assignedCrmUserId, status } = req.body;

    if (status !== undefined && !['active', 'paused'].includes(status)) {
      return sendBadRequest(res, 'status must be active or paused');
    }

    const setDoc = {};

    if (assignedCrmUserId !== undefined) {
      if (assignedCrmUserId === null || assignedCrmUserId === '') {
        setDoc.assignedCrmUserId = null;
      } else {
        const assigneeId = String(assignedCrmUserId).trim();
        const user = await User.findById(assigneeId).select('role isActive').lean();
        if (!user) {
          return sendNotFound(res, 'CRM user not found');
        }
        if (!user.isActive) {
          return sendBadRequest(res, 'Cannot assign to an inactive CRM user');
        }
        if (!ASSIGNABLE_ROLES.includes(user.role)) {
          return sendBadRequest(res, 'Assignee must be a team member or team manager');
        }
        setDoc.assignedCrmUserId = assigneeId;
      }
    }

    if (status !== undefined) {
      setDoc.status = status;
    }

    if (Object.keys(setDoc).length === 0) {
      return sendBadRequest(res, 'Nothing to update');
    }

    const doc = await SellerAssignment.findOneAndUpdate(
      { importerrUserId },
      {
        $set: setDoc,
        $setOnInsert: { importerrUserId },
      },
      { upsert: true, new: true, runValidators: true }
    ).populate('assignedCrmUserId', 'name email role isActive');

    sendSuccess(res, 'Seller assignment saved successfully', doc);
  } catch (error) {
    console.error('upsertSellerAssignment error:', error);
    sendBadRequest(res, error.message || 'Failed to save seller assignment');
  }
};

module.exports = {
  listSellerAssignments,
  upsertSellerAssignment,
};
