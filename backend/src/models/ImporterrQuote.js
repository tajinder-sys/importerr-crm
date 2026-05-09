const mongoose = require('mongoose');

const quoteVariantSchema = new mongoose.Schema(
  {
    skuId: { type: mongoose.Schema.Types.Mixed, required: true },

    // pricing
    AP_RMB: Number,
    AP_INR: Number,
    MP: Number,
    CP: Number,
    FBP: Number,

    // dimensions
    length: Number,
    width: Number,
    height: Number,
    dw: Number,

    // weights
    volumetricWeight: Number,
    chargeableWeight: Number,
    chargeableType: String,

    // business fields
    selectedQuantity: { type: Number, required: true, min: 1 },
    totalFBP: Number,

    // keep if you still need it
    ap: { type: Number, default: 0 }
  },
  { _id: false }
);

const historyItemSchema = new mongoose.Schema(
  {
    variants: { type: [quoteVariantSchema], default: [] },

    pricing: {
      baseAlgorithmId: { type: String, default: '' },
      originalBreakDown: { type: Array, default: [] },
      updatedBreakDown: { type: Array, default: [] }
    },

    amounts: {
      initialFinalPrice: { type: Number, default: 0 },
      finalPrice: { type: Number, default: 0 },
      discountPercent: { type: Number, default: 0 },
      savedAmount: { type: Number, default: 0 }
    },

    createdAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const importerrQuoteSchema = new mongoose.Schema(
  {
    referenceId: { type: String, required: true, unique: true, index: true },

    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    offerId: { type: String, required: true, trim: true, index: true },

    variants: { type: [quoteVariantSchema], default: [] },

    pricing: {
      formula: {
        rmb_to_inr_rate: Number,
        markup_percent: Number,
        customs_duty_default: Number,
        customs_duty_surcharge: Number,
        international_freight_per_kg: Number,
        weight_buffer_percent: Number,
        default_chargeable_weight: Number,
        last_mile_base: Number,
        last_mile_extra_per_500g: Number,
        platform_fee_percent: Number,
        gst_default: Number,
        gst_freight: Number,
        gst_platform_fee: Number,
        local_shipping_rmb: Number
      },
      category: { type: mongoose.Schema.Types.Mixed, default: null },
      baseAlgorithmId: { type: String, default: '' },
      originalBreakDown: { type: Array, default: [] },
      updatedBreakDown: { type: Array, default: [] }
    },

    amounts: {
      initialFinalPrice: { type: Number, default: 0 },
      finalPrice: { type: Number, default: 0 },
      discountPercent: { type: Number, default: 0 },
      savedAmount: { type: Number, default: 0 },
      initialUnitPrice: { type: Number, default: 0 }
    },

    history: {
      type: [historyItemSchema],
      default: []
    },

    status: {
      type: String,
      default: 'draft',
      enum: ['draft', 'sent', 'accepted', 'rejected']
    },

    source: { type: String, default: 'crm' },

    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', index: true },

  },
  { timestamps: true }
);

module.exports = mongoose.model('ImporterrQuote', importerrQuoteSchema);
