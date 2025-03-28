const mongoose = require("mongoose");

const PurchaseItemSchema = new mongoose.Schema({
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Item",
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
  costPerUnit: {
    type: Number,
    required: true,
    min: 0,
  },
  totalCost: {
    type: Number,
    required: true,
    min: 0,
  },
  purchasedBy: {
    type: String,
    enum: ["quantity", "weight", "length", "area", "volume"],
    default: "quantity",
  },
  packageInfo: {
    isPackage: {
      type: Boolean,
      default: false,
    },
    packageSize: {
      value: Number,
      unit: String,
    },
    quantityPerPackage: {
      type: Number,
      default: 1,
    },
  },
});

const PurchaseSchema = new mongoose.Schema({
  supplier: {
    name: {
      type: String,
      trim: true,
    },
    contactName: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
  },
  items: [PurchaseItemSchema],
  invoiceNumber: {
    type: String,
    trim: true,
  },
  purchaseDate: {
    type: Date,
    default: Date.now,
  },
  subtotal: {
    type: Number,
    required: true,
  },
  discountAmount: {
    type: Number,
    default: 0,
  },
  taxRate: {
    type: Number,
    default: 0,
  },
  taxAmount: {
    type: Number,
    default: 0,
  },
  shippingCost: {
    type: Number,
    default: 0,
  },
  total: {
    type: Number,
    required: true,
  },
  notes: {
    type: String,
    trim: true,
  },
  paymentMethod: {
    type: String,
    enum: ["cash", "credit", "debit", "check", "bank_transfer", "other"],
    default: "other",
  },
  status: {
    type: String,
    required: true,
    enum: ["pending", "received", "partially_received", "cancelled"],
    default: "received",
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
PurchaseSchema.pre("save", function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Purchase", PurchaseSchema);
