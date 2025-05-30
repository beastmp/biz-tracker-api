/**
 * Sale Item Model
 * Defines the model for sale line items, extending BaseItem
 */
const { FieldTypes, defineModel } = require("./baseModel");
const { BaseItem, createMeasurementConfig, MEASUREMENT_TYPES, validateMeasurementUnit } = require("./baseItemModel");

/**
 * Create the sale item model definition
 */
const saleItemModel = defineModel("SaleItem", {
  // Core relationship fields
  saleId: {
    type: FieldTypes.REFERENCE,
    ref: "Sale",
    required: true,
  },
  itemId: {
    type: FieldTypes.REFERENCE,
    ref: "Item",
    required: true,
  },
  // Sale-specific fields
  quantity: {
    type: FieldTypes.NUMBER,
    required: true,
    default: 1,
  },
  // Unit measurement information
  unitAmount: {
    type: FieldTypes.NUMBER,
    default: 0,
  },
  unitMeasurement: {
    type: FieldTypes.ENUM,
    values: MEASUREMENT_TYPES,
    default: "quantity",
  },
  unitType: {
    type: FieldTypes.STRING,
    default: "ea",
  },
  // Pricing
  unitPrice: {
    type: FieldTypes.NUMBER,
    required: true,
    default: 0,
  },
  discount: {
    type: FieldTypes.NUMBER,
    default: 0,
  },
}, {
  timestamps: true,
  indexes: [
    { fields: { saleId: 1 } },
    { fields: { itemId: 1 } },
    { fields: { "saleId": 1, "itemId": 1 }, options: { unique: true } },
  ]
});

/**
 * SaleItem class for sale line items
 */
class SaleItem extends BaseItem {
  /**
   * Creates a new SaleItem instance
   * @param {Object} data - SaleItem data
   */
  constructor(data = {}) {
    super(data);

    // Core relationship fields
    this.saleId = data.saleId || null;
    this.itemId = data.itemId || null;
    
    // Sale-specific fields
    this.quantity = data.quantity || 1;
    
    // Unit measurement information
    this.unitAmount = data.unitAmount || 0;
    this.unitMeasurement = data.unitMeasurement || "quantity";
    this.unitType = data.unitType || "ea";
    
    // Pricing
    this.unitPrice = data.unitPrice || 0;
    this.discount = data.discount || 0;
  }

  /**
   * Validate the sale item
   * @return {boolean} True if valid, throws error if invalid
   */
  validate() {
    super.validate();

    if (!this.saleId) {
      throw new Error("Sale ID is required");
    }

    if (!this.itemId) {
      throw new Error("Item ID is required");
    }

    if (this.quantity <= 0) {
      throw new Error("Quantity must be greater than zero");
    }

    if (this.unitPrice < 0) {
      throw new Error("Unit price cannot be negative");
    }

    if (this.discount < 0 || this.discount > 100) {
      throw new Error("Discount must be between 0 and 100");
    }

    validateMeasurementUnit(this.unitType, this.unitMeasurement);

    return true;
  }

  /**
   * Calculate the line total amount
   * @return {number} Total amount for this sale item
   */
  calculateTotal() {
    const discountMultiplier = 1 - (this.discount / 100);
    return this.quantity * this.unitPrice * discountMultiplier;
  }

  /**
   * Get the plain object representation of the sale item
   * @return {Object} Plain object representation
   */
  toObject() {
    return {
      ...super.toObject(),
      saleId: this.saleId,
      itemId: this.itemId,
      quantity: this.quantity,
      unitAmount: this.unitAmount,
      unitMeasurement: this.unitMeasurement,
      unitType: this.unitType,
      unitPrice: this.unitPrice,
      discount: this.discount,
      lineTotal: this.calculateTotal(),
    };
  }

  /**
   * Get the name of this model
   * @return {string} Model name
   */
  static getModelName() {
    return "SaleItem";
  }
}

// Export a structure compatible with the schema generator
module.exports = {
  fields: saleItemModel.fields,
  name: saleItemModel.name,
  timestamps: saleItemModel.timestamps,
  indexes: saleItemModel.indexes,
  virtuals: saleItemModel.virtuals,
  methods: saleItemModel.methods,
  statics: saleItemModel.statics,
  saleItemModel,
  SaleItem,
};