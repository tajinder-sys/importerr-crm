const mongoose = require('mongoose');
const { LEAD_SOURCES, LEAD_STATUSES } = require('../utils/constants');
const noteSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }

}, {
  timestamps: true
});
const leadSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: false,
    index: true,
    trim: true
  },
  email: {
    type: String,
    index: true,
    lowercase: true,
    trim: true
  },
  source: {
    type: String,
    required: true,
    enum: Object.values(LEAD_SOURCES)
  },
  message: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: Object.values(LEAD_STATUSES),
    default: LEAD_STATUSES.NEW
  },
  pipelineId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pipeline'
  },
  stageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stage'
  },
  leadType: {
    type: String,
    enum: ['guest', 'registered'],
    default: 'guest'
  },
  userId: {
    type: String,
    trim: true,
    default: null
  },
  productId: {
    type: String,
    trim: true,
    default: null
  },
  productSku: {
    type: String,
    trim: true,
    default: null
  },
  variants: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  totalQuantity: {
    type: Number,
    default: 0
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  duplicateOf: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead'
  },
  notes: [noteSchema],
  accountId: { type: String, default: null, index: true }
}, { timestamps: true });

leadSchema.index({ phone: 1, email: 1 });
leadSchema.index({ assignedTo: 1, status: 1 });
leadSchema.index({ userId: 1 });
leadSchema.index({ productId: 1 });
leadSchema.index({ productSku: 1 });

module.exports = mongoose.models.Lead || mongoose.model('Lead', leadSchema);