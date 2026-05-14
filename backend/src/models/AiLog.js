const mongoose = require('mongoose');

const aiLogSchema = new mongoose.Schema(
  {
    leadId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', index: true },
    callType:     { type: String, enum: ['matchPipeline', 'getPriority'], required: true },
    model:        { type: String, default: 'gpt-4o-mini' },
    prompt:       { type: String, required: true },
    rawResponse:  { type: String },
    parsedResult: { type: mongoose.Schema.Types.Mixed },
    tokensUsed:   {
      prompt:     { type: Number },
      completion: { type: Number },
      total:      { type: Number },
    },
    latencyMs:    { type: Number },
    error:        { type: String },
    success:      { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AiLog', aiLogSchema);
