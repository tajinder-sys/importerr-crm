const mongoose = require('mongoose');

const TEMPLATE_TYPES = ['email', 'whatsapp'];

const templateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true
    },
    type: {
      type: String,
      required: true,
      enum: TEMPLATE_TYPES,
      index: true
    },
    subject: {
      type: String,
      trim: true,
      default: ''
    },
    body: {
      type: String,
      required: true,
      trim: true
    },
    placeholders: {
      type: [String],
      default: []
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    bodyJson: {
      type: [Object],
      default: []
    },
    aiDescription: {
      type: String,
      default: null,
      trim: true,
    }
  },
  { timestamps: true }
);

templateSchema.index({ type: 1, name: 1 }, { unique: true });
templateSchema.index({ slug: 1 }, { unique: true });

module.exports = mongoose.model('Template', templateSchema);

