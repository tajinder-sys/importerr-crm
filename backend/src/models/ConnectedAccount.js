const mongoose = require('mongoose');
const crypto = require('crypto');

const connectedAccountSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  type: { type: String, enum: ['whatsapp', 'gmail'], required: true },
  accountId: { type: String, unique: true, sparse: true },
  isActive: { type: Boolean, default: true },
  gmailEmail: { type: String, default: null },
  accessToken: { type: String, default: null },
  refreshToken: { type: String, default: null },
  tokenExpiry: { type: Date, default: null },
  historyId: { type: String, default: null },
  googleClientId: { type: String, default: null },
  googleClientSecret: { type: String, default: null },
  googleRedirectUri: { type: String, default: null },
  pubsubTopic: { type: String, default: null },
  waPhoneNumberId: { type: String, default: null },
  waAccessToken: { type: String, default: null },
  waVerifyToken: { type: String, default: null }
}, { timestamps: true });

module.exports = mongoose.model('ConnectedAccount', connectedAccountSchema);
