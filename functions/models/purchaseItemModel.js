/**
 * Purchase Item Model
 * Defines the model for purchase line items, extending BaseItem
 */
const { FieldTypes, defineModel } = require("./baseModel");
const { BaseItem, createMeasurementConfig, MEASUREMENT_TYPES, validateMeasurementUnit } = require("./baseItemModel");

/**
 * Create the purchase item model definition
 */
const purchaseItemModel = defineModel("PurchaseItem", {
  // Core relationship fields
  purchaseId: {
    type: FieldTypes.REFERENCE,
    ref: "Purchase",
    required: true,
  },
  itemId: {
    type: FieldTypes.REFERENCE,
    ref: "Item",
    required: true,
  },
  // Purchase-specific fields
  sellerSKU: {
    type: FieldTypes.STRING,
    required: false,
  },
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
  unitCost: {
    type: FieldTypes.NUMBER,
    required: true,
    default: 0,
  },
  discount: {
    type: FieldTypes.NUMBER,
    default: 0,
  },
  // Status tracking
  receivedQuantity: {
    type: FieldTypes.NUMBER,
    default: 0,
  },
}, {
  timestamps: true,
  indexes: [
    { fields: { purchaseId: 1 } },
    { fields: { itemId: 1 } },
    { fields: { "purchaseId": 1, "itemId": 1 }, options: { unique: true } },
  ]
});

/**
 * PurchaseItem class for purchase line items
 */
class PurchaseItem extends BaseItem {
  /**
   * Creates a new PurchaseItem instance
   * @param {Object} data - PurchaseItem data
   */
  constructor(data = {}) {
    super(data);

    // Core relationship fields
    this.purchaseId = data.purchaseId || null;
    this.itemId = data.itemId || null;
    
    // Purchase-specific fields
    this.sellerSKU = data.sellerSKU || "";
    this.quantity = data.quantity || 1;
    
    // Unit measurement information
    this.unitAmount = data.unitAmount || 0;
    this.unitMeasurement = data.unitMeasurement || "quantity";
    this.unitType = data.unitType || "ea";
    
    // Pricing
    this.unitCost = data.unitCost || 0;
    this.discount = data.discount || 0;
    
    // Status tracking
    this.receivedQuantity = data.receivedQuantity || 0;
  }

  /**
   * Validate the purchase item
   * @return {boolean} True if valid, throws error if invalid
   */
  validate() {
    super.validate();

    if (!this.purchaseId) {
      throw new Error("Purchase ID is required");
    }

    if (!this.itemId) {
      throw new Error("Item ID is required");
    }

    if (this.quantity <= 0) {
      throw new Error("Quantity must be greater than zero");
    }

    if (this.unitCost < 0) {
      throw new Error("Unit cost cannot be negative");
    }

    if (this.discount < 0 || this.discount > 100) {
      throw new Error("Discount must be between 0 and 100");
    }

    validateMeasurementUnit(this.unitType, this.unitMeasurement);

    return true;
  }

  /**
   * Calculate the line total amount
   * @return {number} Total amount for this purchase item
   */
  calculateTotal() {
    const discountMultiplier = 1 - (this.discount / 100);
    return this.quantity * this.unitCost * discountMultiplier;
  }

  /**
   * Get the plain object representation of the purchase item
   * @return {Object} Plain object representation
   */
  toObject() {
    return {
      ...super.toObject(),
      purchaseId: this.purchaseId,
      itemId: this.itemId,
      sellerSKU: this.sellerSKU,
      quantity: this.quantity,
      unitAmount: this.unitAmount,
      unitMeasurement: this.unitMeasurement,
      unitType: this.unitType,
      unitCost: this.unitCost,
      discount: this.discount,
      receivedQuantity: this.receivedQuantity,
    };
  }

  /**
   * Get the name of this model
   * @return {string} Model name
   */
  static getModelName() {
    return "PurchaseItem";
  }
}

// Export a structure compatible with the schema generator
module.exports = {
  fields: purchaseItemModel.fields,
  name: purchaseItemModel.name,
  timestamps: purchaseItemModel.timestamps,
  indexes: purchaseItemModel.indexes,
  virtuals: purchaseItemModel.virtuals,
  methods: purchaseItemModel.methods,
  statics: purchaseItemModel.statics,
  purchaseItemModel,
  PurchaseItem,
};