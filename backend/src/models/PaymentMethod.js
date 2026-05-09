const mongoose = require('mongoose');

const paymentMethodSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  key: {
    type: String,
    unique: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Pre-save hook to auto-generate key from name
paymentMethodSchema.pre('save', async function save() {
  if (this.isModified('name') || this.isNew) {
    // Generate key from name: lowercase, replace spaces and special chars with underscores
    this.key = this.name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters except spaces
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/_+/g, '_') // Replace multiple underscores with single
      .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
    
    // Ensure key is not empty
    if (!this.key) {
      this.key = 'payment_method';
    }
    
    console.log('Generated key:', this.key, 'for name:', this.name);
  }
});

// Pre-validate hook to ensure key is set before validation
paymentMethodSchema.pre('validate', function preValidate() {
  if (this.isNew && !this.key) {
    // Generate key from name: lowercase, replace spaces and special chars with underscores
    this.key = this.name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters except spaces
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/_+/g, '_') // Replace multiple underscores with single
      .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
    
    // Ensure key is not empty
    if (!this.key) {
      this.key = 'payment_method';
    }
    
    console.log('Generated key in pre-validate:', this.key, 'for name:', this.name);
  }
});

// Index for better query performance
paymentMethodSchema.index({ key: 1, isActive: 1 });
paymentMethodSchema.index({ createdAt: -1 });

module.exports = mongoose.model('PaymentMethod', paymentMethodSchema);
