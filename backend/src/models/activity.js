const mongoose = require('mongoose');
const { ACTIVITY_TYPES } = require('../utils/constants');

const activitySchema = new mongoose.Schema({
  lead: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: Object.values(ACTIVITY_TYPES)
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { timestamps: true });

module.exports = mongoose.models.Activity || mongoose.model('Activity', activitySchema);