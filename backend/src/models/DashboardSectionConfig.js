const mongoose = require('mongoose');

const dashboardSectionConfigSchema = new mongoose.Schema(
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
    order: {
      type: Number,
      required: true,
      min: 0,
    },
    visible: {
      type: Boolean,
      default: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

dashboardSectionConfigSchema.index({ order: 1 });
dashboardSectionConfigSchema.index({ visible: 1, order: 1 });

module.exports =
  mongoose.models.DashboardSectionConfig ||
  mongoose.model('DashboardSectionConfig', dashboardSectionConfigSchema);
