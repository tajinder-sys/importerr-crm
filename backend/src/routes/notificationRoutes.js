const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const {
  listNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  getNotificationPolicies,
  updateNotificationPolicies,
  resetNotificationPolicies,
} = require('../controllers/notificationController');

router.get('/', auth, listNotifications);
router.get('/unread-count', auth, getUnreadCount);
router.get('/policies', auth, getNotificationPolicies);
router.put('/policies', auth, authorize(['admin']), updateNotificationPolicies);
router.post('/policies/reset', auth, authorize(['admin']), resetNotificationPolicies);
router.patch('/read-all', auth, markAllNotificationsRead);
router.patch('/:id/read', auth, markNotificationRead);

module.exports = router;
