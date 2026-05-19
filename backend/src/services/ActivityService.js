const Activity = require('../models/activity');
const User = require('../models/User');
const logger = require('../utils/logger');
const { USER_ROLES } = require('../utils/constants');

class ActivityService {
  static async createActivity({ leadId, type, description, performedBy, metadata = {} }) {
    if (!leadId || !type || !description || !performedBy) {
      throw new Error('leadId, type, description and performedBy are required to create activity');
    }

    return Activity.create({
      lead: leadId,
      type,
      description,
      performedBy,
      metadata,
    });
  }

  /** Resolve a user id for system/channel actions (assigned agent, else first active CRM user). */
  static async resolveActivityActor(preferredUserId = null) {
    if (preferredUserId) return preferredUserId;
    const fallbackUser = await User.findOne({
      role: { $in: [USER_ROLES.ADMIN, USER_ROLES.TEAM_MANAGER, USER_ROLES.TEAM_MEMBER] },
      isActive: true,
    })
      .select('_id')
      .lean();
    return fallbackUser?._id || null;
  }

  /** Safe activity write — never throws; returns null if logging is skipped or fails. */
  static async logActivity({
    leadId,
    type,
    description,
    performedBy,
    preferredUserId,
    metadata = {},
  }) {
    try {
      if (!leadId || !type || !description) return null;

      const actor =
        performedBy || (await this.resolveActivityActor(preferredUserId));
      if (!actor) {
        logger.warn('[Activity] Skipped — no performer', { leadId: String(leadId), type });
        return null;
      }

      return await this.createActivity({
        leadId,
        type,
        description,
        performedBy: actor,
        metadata,
      });
    } catch (err) {
      logger.error('[Activity] Failed to log', {
        error: err.message,
        leadId: leadId ? String(leadId) : null,
        type,
      });
      return null;
    }
  }
}

module.exports = ActivityService;
