const mongoose = require('mongoose');

const SaleItemSchema = new mongoose.Schema({
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  priceAtSale: {
    type: Number,
    required: true
  }
});

const SaleSchema = new mongoose.Schema({
  customerName: {
    type: String,
    trim: true
  },
  customerEmail: {
    type: String,
    trim: true
  },
  customerPhone: {
    type: String,
    trim: true
  },
  items: [SaleItemSchema],
  subtotal: {
    type: Number,
    required: true
  },
  taxRate: {
    type: Number,
    default: 0
  },
  taxAmount: {
    type: Number,
    default: 0
  },
  discountAmount: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'credit', 'debit', 'check', 'other'],
    default: 'cash'
  },
  notes: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['completed', 'refunded', 'partially_refunded'],
    default: 'completed'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on save
SaleSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Sale', SaleSchema);