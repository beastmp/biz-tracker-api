/**
 * Asset Model
 * Defines the domain model for business assets
 */

const {FieldTypes, defineModel, BaseModel} = require("./baseModel");

/**
 * Create the asset model definition
 */
const assetModel = defineModel("Asset", {
  name: {
    type: FieldTypes.STRING,
    required: true,
    validation: (value) => value && value.length > 0,
  },
  assetTag: {
    type: FieldTypes.STRING,
    unique: true,
  },
  category: {
    type: FieldTypes.STRING,
    required: true,
  },
  purchaseDate: {
    type: FieldTypes.DATE,
  },
  purchaseId: {
    type: FieldTypes.REFERENCE,
    ref: "Purchase",
  },
  initialCost: {
    type: FieldTypes.NUMBER,
    default: 0,
  },
  currentValue: {
    type: FieldTypes.NUMBER,
    default: 0,
  },
  location: {
    type: FieldTypes.STRING,
  },
  assignedTo: {
    type: FieldTypes.STRING,
  },
  manufacturer: {
    type: FieldTypes.STRING,
  },
  model: {
    type: FieldTypes.STRING,
  },
  serialNumber: {
    type: FieldTypes.STRING,
  },
  notes: {
    type: FieldTypes.STRING,
  },
  status: {
    type: FieldTypes.ENUM,
    values: ["active", "maintenance", "retired", "lost"],
    default: "active",
  },
  maintenanceSchedule: {
    type: FieldTypes.OBJECT,
    default: null,
  },
  maintenanceHistory: {
    type: FieldTypes.ARRAY,
    items: {type: FieldTypes.OBJECT},
    default: [],
  },
  imageUrl: {
    type: FieldTypes.STRING,
  },
  tags: {
    type: FieldTypes.ARRAY,
    items: {type: FieldTypes.STRING},
    default: [],
  },
  isInventoryItem: {
    type: FieldTypes.BOOLEAN,
    default: false,
  },
}, {
  timestamps: true,
  indexes: [
    {fields: {name: 1}},
    {fields: {assetTag: 1}, options: {unique: true, sparse: true}},
    {fields: {category: 1}},
    {fields: {status: 1}},
    {fields: {purchaseId: 1}},
    {fields: {assignedTo: 1}},
    {fields: {name: "text", description: "text", notes: "text", tags: "text"}},
  ],
});

/**
 * Asset class for business logic related to assets
 */
class Asset extends BaseModel {
  /**
   * Creates a new Asset instance
   * @param {Object} data - Asset data
   */
  constructor(data = {}) {
    super(data);

    // Required fields
    this.name = data.name || "";
    this.assetTag = data.assetTag || null;
    this.category = data.category || "";

    // Purchase information
    this.purchaseDate = data.purchaseDate || null;
    this.purchaseId = data.purchaseId || null;
    this.initialCost = data.initialCost || 0;
    this.currentValue = data.currentValue || 0;

    // Location and assignment
    this.location = data.location || "";
    this.assignedTo = data.assignedTo || "";

    // Specifications
    this.manufacturer = data.manufacturer || "";
    this.model = data.model || "";
    this.serialNumber = data.serialNumber || "";

    // Additional information
    this.notes = data.notes || "";
    this.status = data.status || "active";

    // Maintenance
    this.maintenanceSchedule = data.maintenanceSchedule || null;
    this.maintenanceHistory = data.maintenanceHistory || [];

    // Image and tags
    this.imageUrl = data.imageUrl || null;
    this.tags = data.tags || [];

    // Flag to distinguish from inventory items
    this.isInventoryItem = false;
  }

  /**
   * Validate the asset
   * @return {boolean} True if valid, throws error if invalid
   */
  validate() {
    super.validate();

    if (!this.name || this.name.trim() === "") {
      throw new Error("Asset name is required");
    }

    if (!this.category || this.category.trim() === "") {
      throw new Error("Category is required");
    }

    // Validate status
    const validStatuses = ["active", "maintenance", "retired", "lost"];
    if (!validStatuses.includes(this.status)) {
      throw new Error(`Invalid status: ${this.status}`);
    }

    return true;
  }

  /**
   * Calculate asset depreciation
   * @param {number} years - Number of years to depreciate over
   * @param {number} salvageValue - Value at end of depreciation period
   * @param {string} method - Depreciation method ("linear" or "accelerated")
   * @return {number} Current value after depreciation
   */
  calculateDepreciation(years = 5, salvageValue = 0, method = "linear") {
    if (!this.purchaseDate || !this.initialCost) {
      return this.initialCost || 0;
    }

    const purchaseDate = new Date(this.purchaseDate);
    const currentDate = new Date();

    // Get years since purchase (including partial years)
    const yearsSincePurchase =
      (currentDate - purchaseDate) / (365.25 * 24 * 60 * 60 * 1000);

    if (yearsSincePurchase <= 0) {
      return this.initialCost;
    }

    // Calculate depreciation
    let currentValue;

    switch (method) {
      case "linear": {
        // Linear depreciation: equal amount each year
        const annualDepreciation =
          (this.initialCost - salvageValue) / years;
        currentValue = Math.max(
            salvageValue,
            this.initialCost - (annualDepreciation * yearsSincePurchase),
        );
        break;
      }
      case "accelerated": {
        // Double declining balance method
        const depreciationRate = 2 / years; // Double the straight-line rate
        currentValue = this.initialCost *
          Math.pow((1 - depreciationRate), yearsSincePurchase);
        // Ensure we don't depreciate below salvage value
        currentValue = Math.max(salvageValue, currentValue);
        break;
      }
      default:
        currentValue = this.initialCost;
    }

    return currentValue;
  }

  /**
   * Check if maintenance is due
   * @return {boolean} True if maintenance is due
   */
  isMaintenanceDue() {
    if (!this.maintenanceSchedule || !this.maintenanceSchedule.nextMaintenance) {
      return false;
    }

    const nextMaintenance = new Date(this.maintenanceSchedule.nextMaintenance);
    const currentDate = new Date();

    return nextMaintenance <= currentDate;
  }

  /**
   * Add a maintenance record and update next maintenance date
   * @param {Object} maintenanceData - Maintenance record data
   */
  addMaintenanceRecord(maintenanceData) {
    if (!this.maintenanceHistory) {
      this.maintenanceHistory = [];
    }

    // Add maintenance record
    this.maintenanceHistory.push({
      ...maintenanceData,
      date: maintenanceData.date || new Date(),
    });

    // Update maintenance schedule if it exists
    if (this.maintenanceSchedule) {
      this.maintenanceSchedule.lastMaintenance = maintenanceData.date ||
        new Date();

      // Calculate next maintenance date based on frequency
      if (this.maintenanceSchedule.frequency) {
        const nextDate = new Date(maintenanceData.date || new Date());

        switch (this.maintenanceSchedule.frequency) {
          case "daily":
            nextDate.setDate(nextDate.getDate() + 1);
            break;
          case "weekly":
            nextDate.setDate(nextDate.getDate() + 7);
            break;
          case "monthly":
            nextDate.setMonth(nextDate.getMonth() + 1);
            break;
          case "quarterly":
            nextDate.setMonth(nextDate.getMonth() + 3);
            break;
          case "yearly":
            nextDate.setFullYear(nextDate.getFullYear() + 1);
            break;
        }

        this.maintenanceSchedule.nextMaintenance = nextDate;
      }
    }
  }

  /**
   * Get the plain object representation of the asset
   * @return {Object} Plain object representation
   */
  toObject() {
    return {
      ...super.toObject(),
      name: this.name,
      assetTag: this.assetTag,
      category: this.category,
      purchaseDate: this.purchaseDate,
      purchaseId: this.purchaseId,
      initialCost: this.initialCost,
      currentValue: this.currentValue,
      location: this.location,
      assignedTo: this.assignedTo,
      manufacturer: this.manufacturer,
      model: this.model,
      serialNumber: this.serialNumber,
      notes: this.notes,
      status: this.status,
      maintenanceSchedule: this.maintenanceSchedule,
      maintenanceHistory: this.maintenanceHistory,
      imageUrl: this.imageUrl,
      tags: this.tags,
      isInventoryItem: this.isInventoryItem,
    };
  }

  /**
   * Get the name of this model
   * @return {string} Model name
   */
  static getModelName() {
    return "Asset";
  }
}

// Export the model definition with the fields property expected by schemaGenerator
module.exports = {
  fields: assetModel.fields,
  indexes: assetModel.indexes,
  timestamps: assetModel.timestamps,
  textSearchFields: ["name", "notes", "tags", "serialNumber", "assetTag"],
  assetModel,
  Asset,
};
