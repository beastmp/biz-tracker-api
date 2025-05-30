/**
 * Base Item Model
 * Defines the foundational model for all item types
 */
const { FieldTypes, defineModel, BaseModel } = require("./baseModel");

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
 * Create the base item model definition
 */
const baseItemModel = defineModel("BaseItem", {
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
  type: {
    type: FieldTypes.ENUM,
    values: ITEM_TYPES,
    default: "material",
  },
  category: {
    type: FieldTypes.STRING,
    required: true,
  },
  description: {
    type: FieldTypes.STRING,
    required: false,
  },
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
  // Basic measurement type for reference only (no tracking)
  defaultMeasurement: {
    type: FieldTypes.OBJECT,
    properties: {
      measurement: {
        type: FieldTypes.ENUM,
        values: MEASUREMENT_TYPES,
        default: "quantity",
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
 * BaseItem class for shared business logic across all item types
 */
class BaseItem extends BaseModel {
  /**
   * Creates a new BaseItem instance
   * @param {Object} data - BaseItem data
   */
  constructor(data = {}) {
    super(data);

    // Required fields
    this.name = data.name || "";
    this.sku = data.sku || "";
    this.category = data.category || "";
    this.type = data.type || "material";

    // Optional fields
    this.description = data.description || "";

    // Initialize basic measurement configuration
    this.defaultMeasurement = {
      measurement: data.defaultMeasurement?.measurement || "quantity",
      unit: data.defaultMeasurement?.unit || "",
    };

    // Image
    this.imageUrl = data.imageUrl || null;

    // Taxonomy
    this.tags = data.tags || [];
  }

  /**
   * Validate the base item
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

    // Validate measurement configuration
    validateMeasurementUnit(this.defaultMeasurement.unit, this.defaultMeasurement.measurement);

    // Validate item type
    if (!ITEM_TYPES.includes(this.type)) {
      throw new Error(`Invalid item type: ${this.type}`);
    }

    return true;
  }

  /**
   * Get the plain object representation of the base item
   * @return {Object} Plain object representation
   */
  toObject() {
    return {
      ...super.toObject(),
      name: this.name,
      sku: this.sku,
      category: this.category,
      type: this.type,
      description: this.description,
      defaultMeasurement: this.defaultMeasurement,
      imageUrl: this.imageUrl,
      tags: this.tags,
    };
  }

  /**
   * Get the name of this model
   * @return {string} Model name
   */
  static getModelName() {
    return "BaseItem";
  }
}

// Export a structure compatible with the schema generator
module.exports = {
  MEASUREMENT_TYPES,
  MEASUREMENT_UNITS,
  ITEM_TYPES,
  createMeasurementConfig,
  validateMeasurementUnit,
  fields: baseItemModel.fields,
  name: baseItemModel.name,
  timestamps: baseItemModel.timestamps,
  indexes: baseItemModel.indexes,
  virtuals: baseItemModel.virtuals,
  methods: baseItemModel.methods,
  statics: baseItemModel.statics,
  baseItemModel,
  BaseItem,
};