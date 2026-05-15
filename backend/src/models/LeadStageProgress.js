const mongoose = require('mongoose');

const leadStageProgressSchema = new mongoose.Schema(
  {
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: true,
      index: true,
    },
    pipelineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pipeline',
      required: true,
      index: true,
    },
    stageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Stage',
      required: true,
      index: true,
    },
    allowedSeconds: {
      type: Number,
      required: true,
      min: 0,
    },
    consumedSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
    currentEnteredAt: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: false,
      index: true,
    },
    isOverdue: {
      type: Boolean,
      default: false,
      index: true,
    },
    overriddenByAdmin: {
      type: Boolean,
      default: false,
    },
    overriddenBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    overrideReason: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    completedAt: {
      type: Date,
      default: null,
    },
    lastPausedAt: {
      type: Date,
      default: null,
    },
    totalPauseCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

leadStageProgressSchema.index({ leadId: 1, stageId: 1 }, { unique: true });
leadStageProgressSchema.index({ leadId: 1, isActive: 1 });
leadStageProgressSchema.index({ pipelineId: 1, isOverdue: 1, isActive: 1 });
leadStageProgressSchema.index({ stageId: 1, isActive: 1, isOverdue: 1 });

module.exports =
  mongoose.models.LeadStageProgress || mongoose.model('LeadStageProgress', leadStageProgressSchema);
