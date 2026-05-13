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

// List pipelines by team (sorted lists)
pipelineSchema.index({ teamId: 1, createdAt: -1 });
pipelineSchema.index({ name: 1, teamId: 1 }, { unique: true });

// At most one default pipeline per team (DB-enforced)
pipelineSchema.index(
  { teamId: 1 },
  {
    unique: true,
    partialFilterExpression: { isDefault: true },
    name: 'uniq_default_pipeline_per_team',
  }
);

// Before saving a default pipeline, clear default on all other pipelines for this team.
pipelineSchema.pre('save', async function enforceSingleDefault() {
  if (!this.isDefault) {
    return;
  }

  const Model = this.constructor;
  const teamId = this.teamId;
  const id = this._id;

  await Model.updateMany(
    { teamId, _id: { $ne: id } },
    { $set: { isDefault: false } }
  );
});

pipelineSchema.methods.toJSON = function() {
  const pipeline = this.toObject();
  return pipeline;
};

module.exports = mongoose.model('Pipeline', pipelineSchema);
