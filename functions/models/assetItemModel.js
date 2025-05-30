/**
 * Asset Item Model
 * Defines the model for asset items, extending BaseItem
 */
const { FieldTypes, defineModel } = require("./baseModel");
const { BaseItem, createMeasurementConfig, MEASUREMENT_TYPES } = require("./baseItemModel");

/**
 * Create the asset item model definition
 */
const assetItemModel = defineModel("AssetItem", {
  // Core relationship field
  itemId: {
    type: FieldTypes.REFERENCE,
    ref: "Item",
    required: false, // Not required if this is a standalone asset
  },
  // Asset-specific fields
  manufacturer: {
    type: FieldTypes.STRING,
    required: false,
  },
  model: {
    type: FieldTypes.STRING,
    required: false,
  },
  serialNumber: {
    type: FieldTypes.STRING,
    required: false,
    unique: true,
  },
  // Asset status and condition
  status: {
    type: FieldTypes.ENUM,
    values: ["active", "inactive", "maintenance", "retired", "sold"],
    default: "active",
  },
  condition: {
    type: FieldTypes.ENUM,
    values: ["new", "excellent", "good", "fair", "poor", "damaged"],
    default: "good",
  },
  // Depreciation
  depreciationMethod: {
    type: FieldTypes.ENUM,
    values: ["straight-line", "declining-balance", "units-of-production", "none"],
    default: "none",
  },
  depreciationPeriod: {
    type: FieldTypes.NUMBER, // In months
    default: 60, // 5 years default
  },
  depreciationStartDate: {
    type: FieldTypes.DATE,
    required: false,
  },
  // Location and assignment
  location: {
    type: FieldTypes.STRING,
    required: false,
  },
  assignedTo: {
    type: FieldTypes.STRING,
    required: false,
  },
}, {
  timestamps: true,
  indexes: [
    { fields: { itemId: 1 } },
    { fields: { serialNumber: 1 }, options: { unique: true, sparse: true } },
    { fields: { manufacturer: 1 } },
    { fields: { model: 1 } },
    { fields: { status: 1 } },
    { fields: { location: 1 } },
    { fields: { assignedTo: 1 } },
  ]
});

/**
 * AssetItem class for asset items
 */
class AssetItem extends BaseItem {
  /**
   * Creates a new AssetItem instance
   * @param {Object} data - AssetItem data
   */
  constructor(data = {}) {
    super(data);

    // Core relationship field
    this.itemId = data.itemId || null;
    
    // Asset-specific fields
    this.manufacturer = data.manufacturer || "";
    this.model = data.model || "";
    this.serialNumber = data.serialNumber || "";
    
    // Asset status and condition
    this.status = data.status || "active";
    this.condition = data.condition || "good";
    
    // Depreciation
    this.depreciationMethod = data.depreciationMethod || "none";
    this.depreciationPeriod = data.depreciationPeriod || 60; // 5 years default
    this.depreciationStartDate = data.depreciationStartDate || null;
    
    // Location and assignment
    this.location = data.location || "";
    this.assignedTo = data.assignedTo || "";
  }

  /**
   * Validate the asset item
   * @return {boolean} True if valid, throws error if invalid
   */
  validate() {
    super.validate();

    // Validate status
    const validStatuses = ["active", "inactive", "maintenance", "retired", "sold"];
    if (!validStatuses.includes(this.status)) {
      throw new Error(`Invalid status: ${this.status}`);
    }

    // Validate condition
    const validConditions = ["new", "excellent", "good", "fair", "poor", "damaged"];
    if (!validConditions.includes(this.condition)) {
      throw new Error(`Invalid condition: ${this.condition}`);
    }

    // Validate depreciation method
    const validDepreciationMethods = ["straight-line", "declining-balance", "units-of-production", "none"];
    if (!validDepreciationMethods.includes(this.depreciationMethod)) {
      throw new Error(`Invalid depreciation method: ${this.depreciationMethod}`);
    }

    // Validate depreciation period
    if (this.depreciationMethod !== "none" && this.depreciationPeriod <= 0) {
      throw new Error("Depreciation period must be greater than zero");
    }

    return true;
  }

  /**
   * Calculate the current depreciated value based on provided purchase cost
   * @param {number} purchaseCost - The original purchase cost of the asset
   * @return {number} Current value after depreciation
   */
  calculateCurrentValue(purchaseCost = 0) {
    if (this.depreciationMethod === "none" || !this.depreciationStartDate || purchaseCost <= 0) {
      return purchaseCost;
    }

    const today = new Date();
    const startDate = new Date(this.depreciationStartDate);
    
    // Calculate months since depreciation started
    const monthsDiff = 
      (today.getFullYear() - startDate.getFullYear()) * 12 + 
      (today.getMonth() - startDate.getMonth());
    
    if (monthsDiff <= 0) {
      return purchaseCost;
    }

    // Apply straight-line depreciation (most common method)
    if (this.depreciationMethod === "straight-line") {
      const monthlyDepreciation = purchaseCost / this.depreciationPeriod;
      const totalDepreciation = Math.min(monthsDiff * monthlyDepreciation, purchaseCost);
      return Math.max(purchaseCost - totalDepreciation, 0);
    }
    
    // For other depreciation methods, a more complex calculation would be implemented
    // This is a simplified approach
    return purchaseCost;
  }

  /**
   * Get the plain object representation of the asset item
   * @param {number} purchaseCost - Optional purchase cost to calculate current value
   * @return {Object} Plain object representation
   */
  toObject(purchaseCost = 0) {
    return {
      ...super.toObject(),
      itemId: this.itemId,
      manufacturer: this.manufacturer,
      model: this.model,
      serialNumber: this.serialNumber,
      status: this.status,
      condition: this.condition,
      depreciationMethod: this.depreciationMethod,
      depreciationPeriod: this.depreciationPeriod,
      depreciationStartDate: this.depreciationStartDate,
      location: this.location,
      assignedTo: this.assignedTo,
      currentValue: purchaseCost > 0 ? this.calculateCurrentValue(purchaseCost) : undefined,
    };
  }

  /**
   * Change the status of the asset
   * @param {string} newStatus - New status value
   * @param {string} notes - Notes about the status change
   * @return {AssetItem} Updated asset item
   */
  changeStatus(newStatus, notes = "") {
    const validStatuses = ["active", "inactive", "maintenance", "retired", "sold"];
    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Invalid status: ${newStatus}`);
    }
    
    this.status = newStatus;
    
    // In a real implementation, we might log the status change with notes
    return this;
  }

  /**
   * Get the name of this model
   * @return {string} Model name
   */
  static getModelName() {
    return "AssetItem";
  }
}

// Export a structure compatible with the schema generator
module.exports = {
  fields: assetItemModel.fields,
  name: assetItemModel.name,
  timestamps: assetItemModel.timestamps,
  indexes: assetItemModel.indexes,
  virtuals: assetItemModel.virtuals,
  methods: assetItemModel.methods,
  statics: assetItemModel.statics,
  assetItemModel,
  AssetItem,
};