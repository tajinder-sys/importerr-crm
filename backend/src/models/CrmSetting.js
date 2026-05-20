const mongoose = require('mongoose');

const SETTING_TYPES = ['string', 'number', 'boolean', 'json'];

const crmSettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true, index: true },
    value: { type: String, default: '' },
    type: { type: String, enum: SETTING_TYPES, default: 'string' },
    label: { type: String, default: '' },
    description: { type: String, default: '' },
    group: { type: String, default: 'general', index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CrmSetting', crmSettingSchema);
module.exports.SETTING_TYPES = SETTING_TYPES;
