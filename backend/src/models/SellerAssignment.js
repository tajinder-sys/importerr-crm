const mongoose = require('mongoose');

const sellerAssignmentSchema = new mongoose.Schema(
  {
    importerrUserId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 64,
    },
    assignedCrmUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    status: {
      type: String,
      enum: ['active', 'paused'],
      default: 'active',
    },
  },
  { timestamps: true }
);

sellerAssignmentSchema.index({ importerrUserId: 1 }, { unique: true });
sellerAssignmentSchema.index({ assignedCrmUserId: 1 });

module.exports = mongoose.model('SellerAssignment', sellerAssignmentSchema);
