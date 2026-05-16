const mongoose = require('mongoose');
const { COMMUNICATION_SOURCES } = require('../utils/constants');

const communicationSchema = new mongoose.Schema(
  {
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: true
    },
    senderType: {
      type: String,
      enum: ['client', 'team_member'],
      required: true
    },
    senderUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    source: {
      type: String,
      enum: Object.values(COMMUNICATION_SOURCES),
      required: true
    },
    direction: {
      type: String,
      enum: ['inbound', 'outbound'],
      required: true
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    threadId: {
      type: String,
      default: null,
      index: true
    }
  },
  { timestamps: true }
);

communicationSchema.index({ lead: 1, createdAt: 1 });
communicationSchema.index({ lead: 1, message: 1, source: 1, direction: 1 }); // dedup index

module.exports = mongoose.model('Communication', communicationSchema);
