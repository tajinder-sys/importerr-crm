const mongoose = require('mongoose');

const stageSchema = new mongoose.Schema({
  pipelineId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pipeline',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500,
    default: ''
  },
  /** Suggested interval before a follow-up while a deal sits in this stage (days). */
  followUpDays: {
    type: Number,
    default: null,
    min: 0,
    max: 365
  },
  /** Win probability when the deal is in this stage (0–100). */
  probabilityPercent: {
    type: Number,
    default: null,
    min: 0,
    max: 100
  },
  order: {
    type: Number,
    required: true,
    min: 0
  },
  color: {
    type: String,
    required: true,
    trim: true,
    match: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, // Hex color validation
    default: '#6B7280'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for better query performance
stageSchema.index({ pipelineId: 1 });
stageSchema.index({ order: 1, pipelineId: 1 }, { unique: true });

// Ensure stages are ordered correctly within a pipeline
stageSchema.pre('save', async function save() {
  if (!this.isModified('order') || this.isNew) {
    return;
  }

  // Check if another stage exists with the same order in this pipeline
  const existingStage = await this.constructor.findOne({
    pipelineId: this.pipelineId,
    order: this.order,
    _id: { $ne: this._id }
  });

  if (existingStage) {
    // Swap orders with existing stage
    await this.constructor.updateOne(
      { _id: existingStage._id },
      { order: this.getChanges().$set?.order || existingStage.order }
    );
  }
});

stageSchema.methods.toJSON = function() {
  const stage = this.toObject();
  return stage;
};

module.exports = mongoose.model('Stage', stageSchema);
