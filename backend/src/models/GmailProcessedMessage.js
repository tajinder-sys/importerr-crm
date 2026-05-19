const mongoose = require('mongoose');

const gmailProcessedMessageSchema = new mongoose.Schema(
  {
    accountId: { type: String, required: true, index: true },
    messageId: { type: String, required: true },
    processedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

gmailProcessedMessageSchema.index({ accountId: 1, messageId: 1 }, { unique: true });

module.exports = mongoose.model('GmailProcessedMessage', gmailProcessedMessageSchema);
