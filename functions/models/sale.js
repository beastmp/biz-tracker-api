const mongoose = require("mongoose");

const SaleItemSchema = new mongoose.Schema({
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Item",
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    min: 0,
    default: 0,
  },
  weight: {
    type: Number,
    min: 0,
    default: 0,
  },
  weightUnit: {
    type: String,
    enum: ["oz", "lb", "g", "kg"],
    default: "lb",
  },
  // Add new measurement fields
  length: {
    type: Number,
    default: 0,
  },
  lengthUnit: {
    type: String,
    enum: ["mm", "cm", "m", "in", "ft", "yd"],
    default: "in",
  },
  area: {
    type: Number,
    default: 0,
  },
  areaUnit: {
    type: String,
    enum: ["sqft", "sqm", "sqyd", "acre", "ha"],
    default: "sqft",
  },
  volume: {
    type: Number,
    default: 0,
  },
  volumeUnit: {
    type: String,
    enum: ["ml", "l", "gal", "floz", "cu_ft", "cu_m"],
    default: "l",
  },
  priceAtSale: {
    type: Number,
    required: true,
  },
  // Add this field to track what measurement is used for this sale
  soldBy: {
    type: String,
    enum: ["quantity", "weight", "length", "area", "volume"],
    default: "quantity",
  },
});

const SaleSchema = new mongoose.Schema({
  customerName: {
    type: String,
    trim: true,
  },
  customerEmail: {
    type: String,
    trim: true,
  },
  customerPhone: {
    type: String,
    trim: true,
  },
  items: [SaleItemSchema],
  subtotal: {
    type: Number,
    required: true,
  },
  taxRate: {
    type: Number,
    default: 0,
  },
  taxAmount: {
    type: Number,
    default: 0,
  },
  discountAmount: {
    type: Number,
    default: 0,
  },
  total: {
    type: Number,
    required: true,
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ["cash", "credit", "debit", "check", "other"],
    default: "cash",
  },
  notes: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    required: true,
    enum: ["completed", "refunded", "partially_refunded"],
    default: "completed",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update timestamp on save
SaleSchema.pre("save", function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Sale", SaleSchema);
