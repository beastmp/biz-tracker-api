const mongoose = require("mongoose");

// Define a schema for asset info
const AssetInfoSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
  },
  category: {
    type: String,
    trim: true,
  },
  location: {
    type: String,
    trim: true,
  },
  assignedTo: {
    type: String,
    trim: true,
  },
}, {_id: false});

// Define a schema for package info
const PackageInfoSchema = new mongoose.Schema({
  isPackage: {
    type: Boolean,
    default: false,
  },
  packageSize: {
    value: {
      type: Number,
      required: function() {
        return this.isPackage;
      },
    },
    unit: {
      type: String,
      required: function() {
        return this.isPackage;
      },
    },
  },
  quantityPerPackage: {
    type: Number,
    required: function() {
      return this.isPackage;
    },
  },
}, {_id: false});

// Define a schema for purchase items
const PurchaseItemSchema = new mongoose.Schema({
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Item",
    required: true,
  },
  quantity: {
    type: Number,
    default: 0,
  },
  weight: {
    type: Number,
    default: 0,
  },
  weightUnit: {
    type: String,
    enum: ["oz", "lb", "g", "kg"],
    default: "kg",
  },
  length: {
    type: Number,
    default: 0,
  },
  lengthUnit: {
    type: String,
    enum: ["mm", "cm", "m", "in", "ft", "yd"],
    default: "m",
  },
  area: {
    type: Number,
    default: 0,
  },
  areaUnit: {
    type: String,
    enum: ["sqft", "sqm", "sqyd", "acre", "ha"],
    default: "sqm",
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
  },
  originalCost: {
    type: Number,
  },
  discountAmount: {
    type: Number,
    default: 0,
  },
  discountPercentage: {
    type: Number,
    default: 0,
  },
  totalCost: {
    type: Number,
    required: true,
  },
  purchasedBy: {
    type: String,
    enum: ["quantity", "weight", "length", "area", "volume"],
    default: "quantity",
  },
  packageInfo: PackageInfoSchema,
  // New fields for asset tracking
  isAsset: {
    type: Boolean,
    default: false,
  },
  assetInfo: AssetInfoSchema,
}, {_id: false});

// Define a schema for suppliers
const SupplierSchema = new mongoose.Schema({
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
}, {_id: false});

// Define the main purchase schema
const PurchaseSchema = new mongoose.Schema({
  supplier: SupplierSchema,
  items: [PurchaseItemSchema],
  invoiceNumber: {
    type: String,
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
  },
  paymentMethod: {
    type: String,
    enum: ["cash", "credit", "debit", "check", "bank_transfer", "other"],
    default: "cash",
  },
  status: {
    type: String,
    enum: ["pending", "received", "partially_received", "cancelled"],
    default: "pending",
  },
}, {timestamps: true});

module.exports = mongoose.model("Purchase", PurchaseSchema);
