const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema(
  {
    firstName: String,
    lastName: String,
    phone: String,
    address1: String,
    address2: String,
    city: String,
    state: String,
    pincode: String,
  },
  { _id: false }
);

const leadItemSchema = new mongoose.Schema(
  {
    productId: { type: String, default: '' },
    sku: { type: String, default: '' },
    specId: { type: String, default: '' },
    quantity: { type: Number, default: 1 },
    pricingMode: { type: String, default: 'dropshipping' },
  },
  { _id: false }
);

const crmAbandonedLeadSchema = new mongoose.Schema(
  {
    importerrLeadId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, index: true },
    name: { type: String, default: '' },
    email: { type: String, default: '', index: true },
    phone: { type: String, default: '' },
    stage: { type: String, enum: ['cart', 'payment'], required: true, index: true },
    status: {
      type: String,
      enum: ['open', 'converted', 'cancelled', 'processed'],
      default: 'open',
      index: true,
    },
    crmLeadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', default: null, index: true },
    processedAt: { type: Date },
    processError: { type: String, default: '' },
    cartValue: { type: Number, default: 0 },
    cartValueExcludesShipping: { type: Boolean },
    totalLMDCharges: { type: Number, default: 0 },
    gstOnLMD: { type: Number, default: 0 },
    shippingAddress: addressSchema,
    billingAddress: addressSchema,
    leadItems: [leadItemSchema],
    itemSignature: { type: String, default: '', index: true },
    importerrOrderId: { type: String, default: '' },
    convertedAt: { type: Date },
    lastSyncedAt: { type: Date },
    /** CRM abandoned-reminder cron: last send time */
    lastCrmReminderSentAt: { type: Date },
    /** Count of reminder emails sent from CRM for this queue row */
    crmReminderCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

crmAbandonedLeadSchema.index({ stage: 1, status: 1, updatedAt: -1 });
crmAbandonedLeadSchema.index({ userId: 1, stage: 1, status: 1 });

module.exports = mongoose.model('CrmAbandonedLead', crmAbandonedLeadSchema);
