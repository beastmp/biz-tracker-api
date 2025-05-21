/**
 * Item Model
 * Defines the domain model for inventory items
 */
const {FieldTypes, defineModel, BaseModel} = require("./baseModel");

/**
 * Measurement type enum values
 * @type {string[]}
 */
const MEASUREMENT_TYPES = ["quantity", "weight", "length", "area", "volume"];

/**
 * Units for each measurement type
 * @type {Object.<string, string[]>}
 */
const MEASUREMENT_UNITS = {
  "quantity": ["ea", "dozen", "case", "pallet", "box"],
  "weight": ["mg", "g", "kg", "oz", "lb", "ton"],
  "length": ["mm", "cm", "m", "in", "ft", "yd"],
  "area": ["sq.mm", "sq.cm", "sq.m", "sq.in", "sq.ft", "acre", "hectare"],
  "volume": ["ml", "l", "gal", "fl.oz", "cu.in", "cu.ft", "cu.m"]
};

/**
 * Item types enum values
 * @type {string[]}
 */
const ITEM_TYPES = ["material", "product", "both"];

/**
 * Creates a measurement configuration object
 * @typedef {Object} MeasurementConfig
 * @property {string} measurement - Type of measurement (from MEASUREMENT_TYPES)
 * @property {number} amount - Quantity amount
 * @property {string} unit - Unit of measurement
 *
 * @param {Object} data - Source measurement data
 * @param {string} [defaultMeasurement="quantity"] - Default measurement type if not specified
 * @return {MeasurementConfig} Configured measurement object
 */
const createMeasurementConfig = (data = {}, defaultMeasurement = "quantity") => ({
  measurement: data?.measurement || defaultMeasurement,
  amount: data?.amount || 0,
  unit: data?.unit || ""
});

/**
 * Validates if a unit is appropriate for a measurement type
 * 
 * @param {string} unit - Unit to validate
 * @param {string} measurementType - Type of measurement
 * @return {boolean} True if valid
 * @throws {Error} If validation fails
 */
const validateMeasurementUnit = (unit, measurementType) => {
  if (!unit) {
    return true;
  }
  
  if (!MEASUREMENT_TYPES.includes(measurementType)) {
    throw new Error(`Invalid measurement type: ${measurementType}`);
  }
  
  if (MEASUREMENT_UNITS[measurementType] && 
      !MEASUREMENT_UNITS[measurementType].includes(unit)) {
    throw new Error(
      `Invalid unit "${unit}" for measurement type "${measurementType}"`
    );
  }
  
  return true;
};

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
  sellerSKU: {
    type: FieldTypes.STRING,
    required: false,
  },
  category: {
    type: FieldTypes.STRING,
    required: true,
  },
  description: {
    type: FieldTypes.STRING,
    required: false,
  },
  itemType: {
    type: FieldTypes.ENUM,
    values: ITEM_TYPES,
    default: "material",
  },
  // Inventory tracking configuration
  tracking: {
    type: FieldTypes.OBJECT,
    properties: {
      measurement: {
        type: FieldTypes.ENUM,
        values: MEASUREMENT_TYPES,
        default: "quantity",
      },
      amount: {
        type: FieldTypes.NUMBER,
        default: 0,
      },
      unit: {
        type: FieldTypes.STRING,
        default: "",
        validation: (value, obj) => {
          if (!value) return true;
          return MEASUREMENT_UNITS[obj.measurement]?.includes(value);
        },
      },
    },
  },
  // Price configuration
  price: {
    type: FieldTypes.OBJECT,
    properties: {
      measurement: {
        type: FieldTypes.ENUM,
        values: MEASUREMENT_TYPES,
        default: "quantity",
      },
      amount: {
        type: FieldTypes.NUMBER,
        default: 0,
      },
      unit: {
        type: FieldTypes.STRING,
        default: "",
        validation: (value, obj) => {
          if (!value) return true;
          return MEASUREMENT_UNITS[obj.measurement]?.includes(value);
        },
      },
    },
  },
  // Cost configuration
  cost: {
    type: FieldTypes.OBJECT,
    properties: {
      measurement: {
        type: FieldTypes.ENUM,
        values: MEASUREMENT_TYPES,
        default: "quantity",
      },
      amount: {
        type: FieldTypes.NUMBER,
        default: 0,
      },
      unit: {
        type: FieldTypes.STRING,
        default: "",
        validation: (value, obj) => {
          if (!value) return true;
          return MEASUREMENT_UNITS[obj.measurement]?.includes(value);
        },
      },
    },
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
  ]
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
    this.sku = data.sku || "";
    this.category = data.category || "";
    this.itemType = data.itemType || "material";

    // Optional fields
    this.description = data.description || "";
    this.sellerSKU = data.sellerSKU || "";

    // Initialize nested objects using the shared function
    this.tracking = createMeasurementConfig(data.tracking, "quantity");
    this.price = createMeasurementConfig(data.price, this.tracking.measurement);
    this.cost = createMeasurementConfig(data.cost, this.price.measurement);

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

    // Validate measurement configurations using the shared function
    validateMeasurementUnit(this.tracking.unit, this.tracking.measurement);
    validateMeasurementUnit(this.price.unit, this.price.measurement);
    validateMeasurementUnit(this.cost.unit, this.cost.measurement);

    // Validate item type
    if (!ITEM_TYPES.includes(this.itemType)) {
      throw new Error(`Invalid item type: ${this.itemType}`);
    }

    return true;
  }

  /**
   * Get the plain object representation of the item
   * @return {Object} Plain object representation
   */
  toObject() {
    const obj = {
      ...super.toObject(),
      name: this.name,
      sku: this.sku,
      sellerSKU: this.sellerSKU,
      category: this.category,
      description: this.description,
      itemType: this.itemType,
      tracking: {
        measurement: this.tracking.measurement,
        amount: this.tracking.amount,
        unit: this.tracking.unit
      },
      price: {
        measurement: this.price.measurement,
        amount: this.price.amount,
        unit: this.price.unit
      },
      cost: {
        measurement: this.cost.measurement,
        amount: this.cost.amount,
        unit: this.cost.unit
      },
      imageUrl: this.imageUrl,
      tags: this.tags,
    };
    
    return obj;
  }

  /**
   * Get the current inventory value based on tracking measurement
   * @return {Object} Inventory value with unit
   */
  getInventoryValue() {
    return {
      value: this.tracking.amount, 
      unit: this.tracking.measurement === "quantity" ? null : this.tracking.unit
    };
  }

  /**
   * Calculate the inventory value in cost
   * @return {number} Total cost of inventory
   */
  getInventoryValueCost() {
    return this.tracking.amount * this.cost.amount;
  }

  /**
   * Create a new material item with appropriate defaults
   * 
   * @param {Object} data - Item data
   * @return {Item} New material item instance
   */
  static createMaterial(data = {}) {
    return new Item({
      ...data,
      itemType: "material",
      // Materials typically tracked by weight, but respect provided config
      tracking: createMeasurementConfig(
        data.tracking,
        data.tracking?.measurement || "weight"
      )
    });
  }

  /**
   * Create a new product item with appropriate defaults
   * 
   * @param {Object} data - Item data
   * @return {Item} New product item instance
   */
  static createProduct(data = {}) {
    return new Item({
      ...data,
      itemType: "product",
      // Products typically tracked by quantity, but respect provided config
      tracking: createMeasurementConfig(
        data.tracking,
        data.tracking?.measurement || "quantity"
      )
    });
  }

  /**
   * Create a new dual-purpose item (both material and product) with appropriate defaults
   * 
   * @param {Object} data - Item data
   * @return {Item} New dual-purpose item instance
   */
  static createDualPurposeItem(data = {}) {
    return new Item({
      ...data,
      itemType: "both"
    });
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
  itemModel,
  Item,
};
