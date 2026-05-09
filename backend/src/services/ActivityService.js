const Activity = require('../models/Activity');

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
      metadata
    });
  }
}

module.exports = ActivityService;
