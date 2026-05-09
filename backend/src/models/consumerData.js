const customerSchema = new mongoose.Schema({
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
  totalOrders: Number,
  totalSpent: Number,
  lastOrder: Date,
  products: [String]
});

module.exports = mongoose.model('CustomerData', customerSchema);