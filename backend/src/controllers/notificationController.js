const NotificationService = require('../services/NotificationService');
const {
  getPolicies,
  updatePolicies,
  resetPoliciesToDefaults,
} = require('../services/notificationPolicyService');
const { NOTIFICATION_CATALOG } = require('../utils/notificationCatalog');
const { sendSuccess, sendBadRequest, sendForbidden, sendNotFound } = require('../utils/responseHandler');
const { USER_ROLES } = require('../utils/constants');

const isAdmin = (user) => user?.role === USER_ROLES.ADMIN;

async function listNotifications(req, res) {
  try {
    const userId = req.user.id || req.user._id;
    const unreadOnly = req.query.unreadOnly === '1' || req.query.unreadOnly === 'true';
    const limit = Number(req.query.limit) || 30;

    const notifications = await NotificationService.listForUser(userId, { limit, unreadOnly });
    const unreadCount = await NotificationService.unreadCount(userId);

    return sendSuccess(res, 'Notifications retrieved', { notifications, unreadCount });
  } catch (err) {
    console.error('listNotifications error:', err);
    return sendBadRequest(res, 'Failed to load notifications');
  }
}

async function getUnreadCount(req, res) {
  try {
    const userId = req.user.id || req.user._id;
    const unreadCount = await NotificationService.unreadCount(userId);
    return sendSuccess(res, 'Unread count retrieved', { unreadCount });
  } catch (err) {
    console.error('getUnreadCount error:', err);
    return sendBadRequest(res, 'Failed to load unread count');
  }
}

async function markNotificationRead(req, res) {
  try {
    const userId = req.user.id || req.user._id;
    const ok = await NotificationService.markRead(req.params.id, userId);
    if (!ok) return sendNotFound(res, 'Notification not found');
    const unreadCount = await NotificationService.unreadCount(userId);
    return sendSuccess(res, 'Notification marked as read', { unreadCount });
  } catch (err) {
    console.error('markNotificationRead error:', err);
    return sendBadRequest(res, 'Failed to mark notification as read');
  }
}

async function markAllNotificationsRead(req, res) {
  try {
    const userId = req.user.id || req.user._id;
    await NotificationService.markAllRead(userId);
    return sendSuccess(res, 'All notifications marked as read', { unreadCount: 0 });
  } catch (err) {
    console.error('markAllNotificationsRead error:', err);
    return sendBadRequest(res, 'Failed to mark notifications as read');
  }
}

async function getNotificationPolicies(req, res) {
  try {
    const policies = await getPolicies();
    return sendSuccess(res, 'Notification policies retrieved', {
      policies,
      catalogCount: NOTIFICATION_CATALOG.length,
    });
  } catch (err) {
    console.error('getNotificationPolicies error:', err);
    return sendBadRequest(res, 'Failed to load notification policies');
  }
}

async function updateNotificationPolicies(req, res) {
  try {
    if (!isAdmin(req.user)) return sendForbidden(res, 'Admin only');
    const { policies } = req.body || {};
    const updated = await updatePolicies(policies, req.user.id || req.user._id);
    return sendSuccess(res, 'Notification policies updated', { policies: updated });
  } catch (err) {
    if (err.statusCode === 400) return sendBadRequest(res, err.message);
    console.error('updateNotificationPolicies error:', err);
    return sendBadRequest(res, 'Failed to update notification policies');
  }
}

async function resetNotificationPolicies(req, res) {
  try {
    if (!isAdmin(req.user)) return sendForbidden(res, 'Admin only');
    const updated = await resetPoliciesToDefaults(req.user.id || req.user._id);
    return sendSuccess(res, 'Notification policies reset to defaults', { policies: updated });
  } catch (err) {
    console.error('resetNotificationPolicies error:', err);
    return sendBadRequest(res, 'Failed to reset notification policies');
  }
}

module.exports = {
  listNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  getNotificationPolicies,
  updateNotificationPolicies,
  resetNotificationPolicies,
};
