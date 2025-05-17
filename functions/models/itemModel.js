/**
 * Item Model
 * Defines the domain model for inventory items
 */
const {FieldTypes, defineModel, BaseModel} = require("./baseModel");
/**
 * Create the item model definition
 */
const itemModel = defineModel("Item", {
  name: {
    type: FieldTypes.STRING,
    required: true,
    validation: (value) => value && value.length > 0,
  },
  sku: {
    type: FieldTypes.STRING,
    required: true,
    unique: true,
  },
  category: {
    type: FieldTypes.STRING,
    required: true,
  },
  description: {
    type: FieldTypes.STRING,
    required: false,
  },
  trackingType: {
    type: FieldTypes.ENUM,
    values: ["quantity", "weight", "length", "area", "volume"],
    default: "quantity",
  },
  itemType: {
    type: FieldTypes.ENUM,
    values: ["material", "product", "both"],
    default: "material",
  },
  // Quantity tracking
  quantity: {
    type: FieldTypes.NUMBER,
    default: 0,
  },
  // Weight tracking
  weight: {
    type: FieldTypes.NUMBER,
    default: 0,
  },
  weightUnit: {
    type: FieldTypes.ENUM,
    values: ["oz", "lb", "g", "kg"],
    default: "kg",
  },
  // Length tracking
  length: {
    type: FieldTypes.NUMBER,
    default: 0,
  },
  lengthUnit: {
    type: FieldTypes.ENUM,
    values: ["mm", "cm", "m", "in", "ft", "yd"],
    default: "m",
  },
  // Area tracking
  area: {
    type: FieldTypes.NUMBER,
    default: 0,
  },
  areaUnit: {
    type: FieldTypes.ENUM,
    values: ["sqft", "sqm", "sqyd", "acre", "ha"],
    default: "sqm",
  },
  // Volume tracking
  volume: {
    type: FieldTypes.NUMBER,
    default: 0,
  },
  volumeUnit: {
    type: FieldTypes.ENUM,
    values: ["ml", "l", "gal", "floz", "cu_ft", "cu_m"],
    default: "l",
  },
  // Pricing
  price: {
    type: FieldTypes.NUMBER,
    default: 0,
  },
  priceType: {
    type: FieldTypes.ENUM,
    values: ["each", "per_weight_unit", "per_length_unit", "per_area_unit", "per_volume_unit"],
    default: "each",
  },
  sellByMeasurement: {
    type: FieldTypes.ENUM,
    values: ["quantity", "weight", "length", "area", "volume"],
    default: "quantity",
  },
  cost: {
    type: FieldTypes.NUMBER,
    default: 0,
  },
  // Package information
  packageSize: {
    type: FieldTypes.OBJECT,
    default: null,
  },
  // Image
  imageUrl: {
    type: FieldTypes.STRING,
    required: false,
  },
  // Taxonomy
  tags: {
    type: FieldTypes.ARRAY,
    items: {type: FieldTypes.STRING},
    default: [],
  },
}, {
  timestamps: true,
  indexes: [
    {fields: {name: 1}},
    {fields: {sku: 1}, options: {unique: true}},
    {fields: {category: 1}},
    {fields: {tags: 1}},
    {fields: {name: "text", description: "text", sku: "text", tags: "text"}},
  ],
});

/**
 * Item class for business logic related to items
 */
class Item extends BaseModel {
  /**
   * Creates a new Item instance
   * @param {Object} data - Item data
   */
  constructor(data = {}) {
    super(data);

    // Required fields
    this.name = data.name || "";
    this.sku = data.sku || "";
    this.category = data.category || "";
    this.description = data.description || "";

    // Type fields
    this.trackingType = data.trackingType || "quantity";
    this.itemType = data.itemType || "material";

    // Inventory tracking fields
    this.quantity = data.quantity || 0;
    this.weight = data.weight || 0;
    this.weightUnit = data.weightUnit || "kg";
    this.length = data.length || 0;
    this.lengthUnit = data.lengthUnit || "m";
    this.area = data.area || 0;
    this.areaUnit = data.areaUnit || "sqm";
    this.volume = data.volume || 0;
    this.volumeUnit = data.volumeUnit || "l";

    // Pricing fields
    this.price = data.price || 0;
    this.priceType = data.priceType || "each";
    this.sellByMeasurement = data.sellByMeasurement || this.trackingType;
    this.cost = data.cost || 0;

    // Package information
    this.packageSize = data.packageSize || null;

    // Image
    this.imageUrl = data.imageUrl || null;

    // Taxonomy
    this.tags = data.tags || [];
  }

  /**
   * Validate the item
   * @return {boolean} True if valid, throws error if invalid
   */
  validate() {
    super.validate();

    if (!this.name || this.name.trim() === "") {
      throw new Error("Item name is required");
    }

    if (!this.sku || this.sku.trim() === "") {
      throw new Error("SKU is required");
    }

    if (!this.category || this.category.trim() === "") {
      throw new Error("Category is required");
    }

    // Validate tracking type
    const validTrackingTypes = ["quantity", "weight", "length", "area", "volume"];
    if (!validTrackingTypes.includes(this.trackingType)) {
      throw new Error(`Invalid tracking type: ${this.trackingType}`);
    }

    // Validate item type
    const validItemTypes = ["material", "product", "both"];
    if (!validItemTypes.includes(this.itemType)) {
      throw new Error(`Invalid item type: ${this.itemType}`);
    }

    return true;
  }

  /**
   * Get the plain object representation of the item
   * @return {Object} Plain object representation
   */
  toObject() {
    return {
      ...super.toObject(),
      name: this.name,
      sku: this.sku,
      category: this.category,
      description: this.description,
      trackingType: this.trackingType,
      itemType: this.itemType,
      quantity: this.quantity,
      weight: this.weight,
      weightUnit: this.weightUnit,
      length: this.length,
      lengthUnit: this.lengthUnit,
      area: this.area,
      areaUnit: this.areaUnit,
      volume: this.volume,
      volumeUnit: this.volumeUnit,
      price: this.price,
      priceType: this.priceType,
      sellByMeasurement: this.sellByMeasurement,
      cost: this.cost,
      packageSize: this.packageSize,
      imageUrl: this.imageUrl,
      tags: this.tags,
    };
  }

  /**
   * Get the current inventory value based on tracking type
   * @return {Object} Inventory value with unit
   */
  getInventoryValue() {
    switch (this.trackingType) {
      case "quantity":
        return {value: this.quantity, unit: null};
      case "weight":
        return {value: this.weight, unit: this.weightUnit};
      case "length":
        return {value: this.length, unit: this.lengthUnit};
      case "area":
        return {value: this.area, unit: this.areaUnit};
      case "volume":
        return {value: this.volume, unit: this.volumeUnit};
      default:
        return {value: this.quantity, unit: null};
    }
  }

  /**
   * Calculate the inventory value in cost
   * @return {number} Total cost of inventory
   */
  getInventoryValueCost() {
    const inventoryValue = this.getInventoryValue();
    return inventoryValue.value * this.cost;
  }

  /**
   * Get the name of this model
   * @return {string} Model name
   */
  static getModelName() {
    return "Item";
  }
}

// Export a structure compatible with the schema generator
module.exports = {
  fields: itemModel.fields,
  name: itemModel.name,
  timestamps: itemModel.timestamps,
  indexes: itemModel.indexes,
  virtuals: itemModel.virtuals,
  methods: itemModel.methods,
  statics: itemModel.statics,
  // Also export the model and class for other uses
  itemModel,
  Item,
};
