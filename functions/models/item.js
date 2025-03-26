const mongoose = require("mongoose");

const ItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  sku: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  category: {
    type: String,
    required: true,
    trim: true,
  },
  trackingType: {
    type: String,
    required: true,
    enum: ["quantity", "weight"],
    default: "quantity",
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
    default: "lb",
  },
  price: {
    type: Number,
    required: true,
  },
  priceType: {
    type: String,
    enum: ["each", "per_weight_unit"],
    default: "each",
  },
  description: {
    type: String,
    trim: true,
  },
  // Add image URL field
  imageUrl: {
    type: String,
    default: null,
  },
  // Add tags array
  tags: [{
    type: String,
    trim: true,
  }],
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
  itemType: {
    type: String,
    enum: ["material", "product", "both"],
    default: "product",
  },
  // For tracking item cost separate from sale price
  cost: {
    type: Number,
    default: 0,
  },
  // For materials tracking packaging information
  packInfo: {
    isPack: {
      type: Boolean,
      default: false,
    },
    unitsPerPack: {
      type: Number,
      default: 1,
    },
    costPerUnit: {
      type: Number,
      default: 0,
    },
  },
  // For materials that can be used in products:
  usedInProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Item",
  }],
  // For products that are made from materials:
  components: [{
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
    },
    quantity: Number,
    weight: Number,
    weightUnit: {
      type: String,
      enum: ["oz", "lb", "g", "kg"],
    },
  }],
});

module.exports = mongoose.model("Item", ItemSchema);
