const mongoose = require('mongoose');

const pipelineSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for better query performance
pipelineSchema.index({ teamId: 1 });
pipelineSchema.index({ name: 1, teamId: 1 }, { unique: true });

// Ensure only one default pipeline per team
pipelineSchema.pre('save', async function save() {
  if (!this.isDefault) {
    return;
  }

  // Unset other default pipelines for this team
  await this.constructor.updateMany(
    { teamId: this.teamId, _id: { $ne: this._id } },
    { isDefault: false }
  );
});

pipelineSchema.methods.toJSON = function() {
  const pipeline = this.toObject();
  return pipeline;
};

module.exports = mongoose.model('Pipeline', pipelineSchema);
