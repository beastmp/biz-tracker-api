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
    enum: ["quantity", "weight", "length", "area", "volume"],
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
  sellByMeasurement: {
    type: String,
    enum: ["quantity", "weight", "length", "area", "volume"],
    default: null,
  },
  packageSize: {
    value: {
      type: Number,
      default: 0,
    },
    unit: {
      type: String,
      default: null,
    },
    quantityPerPackage: {
      type: Number,
      default: 1,
    },
  },
  price: {
    type: Number,
    required: true,
  },
  priceType: {
    type: String,
    enum: ["each", "per_weight_unit", "per_length_unit",
      "per_area_unit", "per_volume_unit"],
    default: "each",
  },
  description: {
    type: String,
    trim: true,
  },
  imageUrl: {
    type: String,
    default: null,
  },
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
  cost: {
    type: Number,
    default: 0,
  },
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
  usedInProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Item",
  }],
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
    length: Number,
    lengthUnit: {
      type: String,
      enum: ["mm", "cm", "m", "in", "ft", "yd"],
    },
    area: Number,
    areaUnit: {
      type: String,
      enum: ["sqft", "sqm", "sqyd", "acre", "ha"],
    },
    volume: Number,
    volumeUnit: {
      type: String,
      enum: ["ml", "l", "gal", "floz", "cu_ft", "cu_m"],
    },
  }],
  derivedFrom: {
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
    length: Number,
    lengthUnit: {
      type: String,
      enum: ["mm", "cm", "m", "in", "ft", "yd"],
    },
    area: Number,
    areaUnit: {
      type: String,
      enum: ["sqft", "sqm", "sqyd", "acre", "ha"],
    },
    volume: Number,
    volumeUnit: {
      type: String,
      enum: ["ml", "l", "gal", "floz", "cu_ft", "cu_m"],
    },
  },
  derivedItems: [{
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
    length: Number,
    lengthUnit: {
      type: String,
      enum: ["mm", "cm", "m", "in", "ft", "yd"],
    },
    area: Number,
    areaUnit: {
      type: String,
      enum: ["sqft", "sqm", "sqyd", "acre", "ha"],
    },
    volume: Number,
    volumeUnit: {
      type: String,
      enum: ["ml", "l", "gal", "floz", "cu_ft", "cu_m"],
    },
  }],
});

module.exports = mongoose.model("Item", ItemSchema);
