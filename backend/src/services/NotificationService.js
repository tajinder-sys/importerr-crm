const Notification = require('../models/Notification');
const { getCatalogEntry } = require('../utils/notificationCatalog');
const { getPolicyForType } = require('./notificationPolicyService');
const { resolveCandidateUsers, filterByPolicy } = require('./notificationResolver');
const logger = require('../utils/logger');

/**
 * Global notification dispatcher.
 *
 * Usage anywhere in the codebase:
 *   await NotificationService.dispatch({
 *     type: 'lead_assigned',
 *     title: 'Lead assigned to you',
 *     body: 'Acme Traders',
 *     assigneeUserId: userId,
 *     leadId,
 *     actionUrl: `/leads/${leadId}`,
 *   });
 *
 * New types: add to notificationCatalog.js + optional hook — no schema change.
 */
class NotificationService {
  static async dispatch(payload = {}) {
    try {
      const { type } = payload;
      if (!type) return [];

      const catalogEntry = getCatalogEntry(type);
      if (!catalogEntry) {
        logger.warn(`NotificationService: unknown type "${type}"`);
        return [];
      }

      const policy = await getPolicyForType(type);
      if (!policy?.enabled) return [];

      const candidates = await resolveCandidateUsers(type, payload);
      const recipients = filterByPolicy(candidates, policy);
      if (!recipients.length) return [];

      const priority = payload.priority || catalogEntry.priority || 'medium';
      const title = payload.title || catalogEntry.label;
      const body = payload.body || catalogEntry.description || '';

      const created = [];
      for (const user of recipients) {
        const doc = await NotificationService._createOne({
          recipient: user._id,
          type,
          title,
          body,
          priority,
          leadId: payload.leadId || null,
          taskId: payload.taskId || null,
          teamId: payload.teamId || null,
          actionUrl: payload.actionUrl || '',
          metadata: payload.metadata || {},
          dedupeKey: payload.dedupeKey || null,
        });
        if (doc) created.push(doc);
      }

      return created;
    } catch (err) {
      logger.error('NotificationService.dispatch failed', { error: err.message, type: payload?.type });
      return [];
    }
  }

  static async _createOne(fields) {
    try {
      return await Notification.create(fields);
    } catch (err) {
      if (err?.code === 11000) return null;
      throw err;
    }
  }

  static async listForUser(userId, { limit = 30, unreadOnly = false } = {}) {
    const query = { recipient: userId };
    if (unreadOnly) query.read = false;

    const rows = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(Math.min(Math.max(limit, 1), 100))
      .lean();

    return rows.map((r) => ({
      id: r._id,
      type: r.type,
      title: r.title,
      body: r.body,
      priority: r.priority,
      read: Boolean(r.read),
      readAt: r.readAt,
      leadId: r.leadId,
      taskId: r.taskId,
      actionUrl: r.actionUrl,
      metadata: r.metadata || {},
      createdAt: r.createdAt,
    }));
  }

  static async unreadCount(userId) {
    return Notification.countDocuments({ recipient: userId, read: false });
  }

  static async markRead(notificationId, userId) {
    const row = await Notification.findOneAndUpdate(
      { _id: notificationId, recipient: userId },
      { $set: { read: true, readAt: new Date() } },
      { new: true }
    ).lean();
    return Boolean(row);
  }

  static async markAllRead(userId) {
    const result = await Notification.updateMany(
      { recipient: userId, read: false },
      { $set: { read: true, readAt: new Date() } }
    );
    return result.modifiedCount || 0;
  }
}

module.exports = NotificationService;
