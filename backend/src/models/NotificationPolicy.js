const mongoose = require('mongoose');
const { USER_ROLES } = require('../utils/constants');

const notificationPolicySchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 64,
    },
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 32,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    order: {
      type: Number,
      required: true,
      min: 0,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    roles: {
      [USER_ROLES.ADMIN]: { type: Boolean, default: false },
      [USER_ROLES.TEAM_MANAGER]: { type: Boolean, default: false },
      [USER_ROLES.TEAM_MEMBER]: { type: Boolean, default: false },
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

notificationPolicySchema.index({ category: 1, order: 1 });
notificationPolicySchema.index({ enabled: 1 });

module.exports =
  mongoose.models.NotificationPolicy ||
  mongoose.model('NotificationPolicy', notificationPolicySchema);
