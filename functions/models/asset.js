const mongoose = require("mongoose");

const MaintenanceHistorySchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  cost: {
    type: Number,
    required: true,
  },
  performedBy: {
    type: String,
    required: true,
  },
}, {_id: true, timestamps: true});

const MaintenanceScheduleSchema = new mongoose.Schema({
  frequency: {
    type: String,
    enum: ["daily", "weekly", "monthly", "quarterly", "yearly"],
    required: true,
  },
  lastMaintenance: {
    type: Date,
  },
  nextMaintenance: {
    type: Date,
  },
}, {_id: false});

const AssetSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  assetTag: {
    type: String,
    trim: true,
    unique: true,
    sparse: true, // allows null/undefined values
  },
  category: {
    type: String,
    required: true,
    trim: true,
  },
  purchaseDate: {
    type: Date,
  },
  purchaseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Purchase",
  },
  initialCost: {
    type: Number,
    required: true,
    default: 0,
  },
  currentValue: {
    type: Number,
    required: true,
    default: 0,
  },
  location: {
    type: String,
    trim: true,
  },
  assignedTo: {
    type: String,
    trim: true,
  },
  manufacturer: {
    type: String,
    trim: true,
  },
  model: {
    type: String,
    trim: true,
  },
  serialNumber: {
    type: String,
    trim: true,
  },
  notes: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ["active", "maintenance", "retired", "lost"],
    default: "active",
  },
  maintenanceSchedule: MaintenanceScheduleSchema,
  maintenanceHistory: [MaintenanceHistorySchema],
  imageUrl: {
    type: String,
  },
  tags: [{
    type: String,
    trim: true,
  }],
  isInventoryItem: {
    type: Boolean,
    default: false,
  },
}, {timestamps: true});

module.exports = mongoose.model("Asset", AssetSchema);
