const mongoose = require('mongoose');

const emailHistorySchema = new mongoose.Schema(
  {
    to: String,
    subject: String,
    body: String,

    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Template'
    },

    status: {
      type: String,
      enum: ['sent', 'failed'],
      default: 'sent'
    },

    error: String,

    metadata: {
      quoteId: String,
      referenceId: String,
      leadId: String
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('EmailHistory', emailHistorySchema);