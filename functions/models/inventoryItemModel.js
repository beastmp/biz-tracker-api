/**
 * Inventory Item Model
 * Defines specialized model for items tracked in inventory
 */
const { 
  FieldTypes, 
  defineModel 
} = require("./baseModel");

const { 
  MEASUREMENT_TYPES, 
  MEASUREMENT_UNITS, 
  ITEM_TYPES,
  BaseItem,
  baseItemModel
} = require("./baseItemModel");

/**
 * Inventory valuation methods
 * @type {string[]}
 */
const VALUATION_METHODS = ["fifo", "lifo", "weighted-average", "specific-identification"];

/**
 * Create the inventory item model definition by extending the base item model
 */
const inventoryItemModel = defineModel("InventoryItem", {
  ...baseItemModel.fields,
  
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
      // Inventory value tracking
      averageCost: {
        type: FieldTypes.NUMBER,
        default: 0,
      },
      valuationMethod: {
        type: FieldTypes.ENUM,
        values: VALUATION_METHODS,
        default: "weighted-average",
      },
      lastUpdated: {
        type: FieldTypes.DATE,
        default: () => new Date(),
      },
      // Cost history for FIFO/LIFO costing
      costLayers: {
        type: FieldTypes.ARRAY,
        items: {
          type: FieldTypes.OBJECT,
          properties: {
            date: {
              type: FieldTypes.DATE,
              default: () => new Date(),
            },
            quantity: {
              type: FieldTypes.NUMBER,
              default: 0,
            },
            unitCost: {
              type: FieldTypes.NUMBER,
              default: 0,
            },
            source: {
              type: FieldTypes.STRING,
              default: "",
            },
            remaining: {
              type: FieldTypes.NUMBER,
              default: 0,
            },
          },
        },
        default: [],
      },
      minimumLevel: {
        type: FieldTypes.NUMBER,
        default: 0,
      },
      reorderPoint: {
        type: FieldTypes.NUMBER,
        default: 0,
      },
      maximumLevel: {
        type: FieldTypes.NUMBER,
        default: 0,
      },
      locationInfo: {
        type: FieldTypes.STRING,
        default: "",
      },
    },
  },
  
  // Sales pricing configuration
  pricing: {
    type: FieldTypes.OBJECT,
    properties: {
      salePrice: {
        type: FieldTypes.NUMBER,
        default: 0,
      },
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
      margin: {
        type: FieldTypes.NUMBER,
        default: 0,
      },
      markup: {
        type: FieldTypes.NUMBER,
        default: 0,
      },
      priceLastUpdated: {
        type: FieldTypes.DATE,
        default: () => new Date(),
      },
      priceTiers: {
        type: FieldTypes.ARRAY,
        items: {
          type: FieldTypes.OBJECT,
          properties: {
            name: {
              type: FieldTypes.STRING,
              required: true,
            },
            quantityThreshold: {
              type: FieldTypes.NUMBER,
              default: 0,
            },
            price: {
              type: FieldTypes.NUMBER,
              required: true,
            },
          },
        },
        default: [],
      },
    },
    default: {},
  },
}, {
  timestamps: true,
  indexes: [
    ...baseItemModel.indexes,
  ]
});

/**
 * InventoryItem class for specialized inventory item business logic
 */
class InventoryItem extends BaseItem {
  /**
   * Creates a new InventoryItem instance
   * @param {Object} data - InventoryItem data
   */
  constructor(data = {}) {
    super(data);

    // Initialize tracking measurement with enhanced inventory tracking
    this.tracking = {
      measurement: data.tracking?.measurement || "quantity",
      amount: data.tracking?.amount || 0,
      unit: data.tracking?.unit || "",
      // Add inventory value tracking
      averageCost: data.tracking?.averageCost || 0,
      valuationMethod: data.tracking?.valuationMethod || "weighted-average",
      lastUpdated: data.tracking?.lastUpdated || new Date(),
      costLayers: data.tracking?.costLayers || [],
      minimumLevel: data.tracking?.minimumLevel || 0,
      reorderPoint: data.tracking?.reorderPoint || 0,
      maximumLevel: data.tracking?.maximumLevel || 0,
      locationInfo: data.tracking?.locationInfo || "",
    };
    
    // Initialize pricing info
    this.pricing = {
      salePrice: data.pricing?.salePrice || 0,
      measurement: data.pricing?.measurement || this.tracking.measurement,
      unit: data.pricing?.unit || this.tracking.unit,
      margin: data.pricing?.margin || 0,
      markup: data.pricing?.markup || 0,
      priceLastUpdated: data.pricing?.priceLastUpdated || new Date(),
      priceTiers: data.pricing?.priceTiers || [],
    };
  }

  /**
   * Validate the inventory item
   * @return {boolean} True if valid, throws error if invalid
   */
  validate() {
    super.validate();
    
    // Validate measurement configuration
    validateMeasurementUnit(this.tracking.unit, this.tracking.measurement);
    
    // Validate valuation method
    if (!VALUATION_METHODS.includes(this.tracking.valuationMethod)) {
      throw new Error(`Invalid valuation method: ${this.tracking.valuationMethod}`);
    }
    
    // Validate pricing configuration if specified
    if (this.pricing?.salePrice > 0) {
      validateMeasurementUnit(this.pricing.unit, this.pricing.measurement);
    }

    return true;
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
   * Calculate the total monetary inventory value
   * @return {number} Total inventory value in currency
   */
  calculateInventoryValue() {
    if (this.tracking.amount <= 0 || this.tracking.averageCost <= 0) {
      return 0;
    }

    return this.tracking.amount * this.tracking.averageCost;
  }

  /**
   * Add inventory with cost information
   * 
   * @param {number} quantity - Quantity to add
   * @param {number} unitCost - Unit cost of the added inventory
   * @param {string} source - Source of the inventory (e.g., "purchase", "adjustment")
   * @param {Date} date - Date of the addition
   * @return {Object} Updated inventory information
   */
  addInventory(quantity, unitCost, source = "manual", date = new Date()) {
    if (quantity <= 0) {
      throw new Error("Quantity must be greater than zero");
    }

    if (unitCost < 0) {
      throw new Error("Unit cost cannot be negative");
    }

    // Update the quantity
    const oldQuantity = this.tracking.amount;
    const newQuantity = oldQuantity + quantity;
    this.tracking.amount = newQuantity;

    // Add a new cost layer for FIFO/LIFO calculations
    this.tracking.costLayers.push({
      date: date,
      quantity: quantity,
      unitCost: unitCost,
      source: source,
      remaining: quantity,
    });

    // Update the average cost based on weighted average
    if (oldQuantity === 0) {
      this.tracking.averageCost = unitCost;
    } else {
      this.tracking.averageCost = 
        ((oldQuantity * this.tracking.averageCost) + (quantity * unitCost)) / newQuantity;
    }

    this.tracking.lastUpdated = date;

    return {
      newQuantity,
      averageCost: this.tracking.averageCost,
      totalValue: this.calculateInventoryValue(),
    };
  }

  /**
   * Remove inventory and update cost information based on valuation method
   * 
   * @param {number} quantity - Quantity to remove
   * @param {string} source - Source of the removal (e.g., "sale", "adjustment")
   * @param {Date} date - Date of the removal
   * @return {Object} Cost information of the removed inventory
   */
  removeInventory(quantity, source = "manual", date = new Date()) {
    if (quantity <= 0) {
      throw new Error("Quantity must be greater than zero");
    }

    if (quantity > this.tracking.amount) {
      throw new Error(`Insufficient inventory: requested ${quantity}, available ${this.tracking.amount}`);
    }

    // Update the quantity
    this.tracking.amount -= quantity;
    this.tracking.lastUpdated = date;

    let removedCost = 0;

    // Handle cost calculation based on valuation method
    switch (this.tracking.valuationMethod) {
      case "fifo":
        removedCost = this._removeFIFO(quantity, source, date);
        break;
      case "lifo":
        removedCost = this._removeLIFO(quantity, source, date);
        break;
      case "weighted-average":
      default:
        // For weighted average, we just use the current average cost
        removedCost = quantity * this.tracking.averageCost;
        break;
    }

    return {
      quantity,
      costOfGoodsSold: removedCost,
      unitCost: quantity > 0 ? removedCost / quantity : 0,
      remainingQuantity: this.tracking.amount,
      remainingValue: this.calculateInventoryValue(),
    };
  }

  /**
   * Remove inventory using FIFO (First-In, First-Out) method
   * 
   * @param {number} quantity - Quantity to remove
   * @param {string} source - Source of the removal
   * @param {Date} date - Date of the removal
   * @return {number} Total cost of removed inventory
   * @private
   */
  _removeFIFO(quantity, source, date) {
    let remainingToRemove = quantity;
    let totalCost = 0;

    // Sort cost layers by date (oldest first for FIFO)
    const sortedLayers = [...this.tracking.costLayers].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Remove from oldest layers first
    for (let i = 0; i < sortedLayers.length && remainingToRemove > 0; i++) {
      const layer = sortedLayers[i];
      
      if (layer.remaining <= 0) continue;
      
      const removeFromLayer = Math.min(remainingToRemove, layer.remaining);
      layer.remaining -= removeFromLayer;
      
      totalCost += removeFromLayer * layer.unitCost;
      remainingToRemove -= removeFromLayer;
    }

    // Update the cost layers
    this.tracking.costLayers = sortedLayers;

    return totalCost;
  }

  /**
   * Remove inventory using LIFO (Last-In, First-Out) method
   * 
   * @param {number} quantity - Quantity to remove
   * @param {string} source - Source of the removal
   * @param {Date} date - Date of the removal
   * @return {number} Total cost of removed inventory
   * @private
   */
  _removeLIFO(quantity, source, date) {
    let remainingToRemove = quantity;
    let totalCost = 0;

    // Sort cost layers by date (newest first for LIFO)
    const sortedLayers = [...this.tracking.costLayers].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Remove from newest layers first
    for (let i = 0; i < sortedLayers.length && remainingToRemove > 0; i++) {
      const layer = sortedLayers[i];
      
      if (layer.remaining <= 0) continue;
      
      const removeFromLayer = Math.min(remainingToRemove, layer.remaining);
      layer.remaining -= removeFromLayer;
      
      totalCost += removeFromLayer * layer.unitCost;
      remainingToRemove -= removeFromLayer;
    }

    // Update the cost layers
    this.tracking.costLayers = sortedLayers;

    return totalCost;
  }

  /**
   * Check if the item needs to be reordered
   * @return {boolean} True if the item needs to be reordered
   */
  needsReorder() {
    return this.tracking.amount <= this.tracking.reorderPoint;
  }

  /**
   * Check if the item is below minimum level
   * @return {boolean} True if the item is below minimum level
   */
  isBelowMinimum() {
    return this.tracking.amount < this.tracking.minimumLevel;
  }

  /**
   * Update inventory settings
   * 
   * @param {Object} settings - New inventory settings
   * @param {number} [settings.minimumLevel] - Minimum inventory level
   * @param {number} [settings.reorderPoint] - Reorder point
   * @param {number} [settings.maximumLevel] - Maximum inventory level
   * @param {string} [settings.locationInfo] - Location information
   * @param {string} [settings.valuationMethod] - Inventory valuation method
   * @return {InventoryItem} This item instance
   */
  updateInventorySettings(settings = {}) {
    if (settings.minimumLevel !== undefined) {
      this.tracking.minimumLevel = Math.max(0, settings.minimumLevel);
    }
    
    if (settings.reorderPoint !== undefined) {
      this.tracking.reorderPoint = Math.max(0, settings.reorderPoint);
    }
    
    if (settings.maximumLevel !== undefined) {
      this.tracking.maximumLevel = Math.max(this.tracking.minimumLevel, settings.maximumLevel);
    }
    
    if (settings.locationInfo !== undefined) {
      this.tracking.locationInfo = settings.locationInfo;
    }
    
    if (settings.valuationMethod !== undefined && VALUATION_METHODS.includes(settings.valuationMethod)) {
      this.tracking.valuationMethod = settings.valuationMethod;
    }
    
    return this;
  }
  
  /**
   * Update the pricing information for this item
   * 
   * @param {Object} pricing - New pricing data
   * @param {number} [pricing.salePrice] - Sale price
   * @param {string} [pricing.measurement] - Measurement type for pricing
   * @param {string} [pricing.unit] - Unit for pricing
   * @param {number} [pricing.margin] - Profit margin percentage
   * @param {number} [pricing.markup] - Markup percentage
   * @param {Array} [pricing.priceTiers] - Tiered pricing options
   * @return {InventoryItem} This item instance
   */
  updatePricing(pricing = {}) {
    if (!this.pricing) {
      this.pricing = {};
    }
    
    if (pricing.salePrice !== undefined) {
      this.pricing.salePrice = Math.max(0, pricing.salePrice);
    }
    
    if (pricing.measurement !== undefined && MEASUREMENT_TYPES.includes(pricing.measurement)) {
      this.pricing.measurement = pricing.measurement;
    }
    
    if (pricing.unit !== undefined) {
      this.pricing.unit = pricing.unit;
    }
    
    if (pricing.margin !== undefined) {
      this.pricing.margin = pricing.margin;
    }
    
    if (pricing.markup !== undefined) {
      this.pricing.markup = pricing.markup;
    }
    
    if (pricing.priceTiers !== undefined) {
      this.pricing.priceTiers = pricing.priceTiers;
    }
    
    this.pricing.priceLastUpdated = new Date();
    
    return this;
  }
  
  /**
   * Calculate sale price based on cost and margin/markup
   * 
   * @param {string} method - Calculation method ("margin" or "markup")
   * @return {number} Calculated sale price
   */
  calculateSalePrice(method = "margin") {
    if (this.tracking.averageCost <= 0) {
      return this.pricing.salePrice || 0;
    }
    
    if (method === "margin" && this.pricing.margin > 0) {
      // Margin formula: Price = Cost / (1 - Margin%)
      return this.tracking.averageCost / (1 - (this.pricing.margin / 100));
    } else if (method === "markup" && this.pricing.markup > 0) {
      // Markup formula: Price = Cost + (Cost * Markup%)
      return this.tracking.averageCost * (1 + (this.pricing.markup / 100));
    }
    
    return this.pricing.salePrice || 0;
  }
  
  /**
   * Get the appropriate price based on quantity (tiered pricing)
   * 
   * @param {number} quantity - Quantity being purchased
   * @return {number} Appropriate price for the quantity
   */
  getPriceForQuantity(quantity) {
    if (!this.pricing.priceTiers || this.pricing.priceTiers.length === 0) {
      return this.pricing.salePrice || 0;
    }
    
    // Sort tiers by quantity threshold (descending)
    const sortedTiers = [...this.pricing.priceTiers].sort((a, b) => 
      b.quantityThreshold - a.quantityThreshold
    );
    
    // Find the first tier where quantity meets or exceeds the threshold
    for (const tier of sortedTiers) {
      if (quantity >= tier.quantityThreshold) {
        return tier.price;
      }
    }
    
    // If no tier matches, use the standard price
    return this.pricing.salePrice || 0;
  }
  
  /**
   * Get the plain object representation of the inventory item
   * @return {Object} Plain object representation
   */
  toObject() {
    return {
      ...super.toObject(),
      tracking: {
        measurement: this.tracking.measurement,
        amount: this.tracking.amount,
        unit: this.tracking.unit,
        averageCost: this.tracking.averageCost,
        valuationMethod: this.tracking.valuationMethod,
        lastUpdated: this.tracking.lastUpdated,
        costLayers: this.tracking.costLayers,
        minimumLevel: this.tracking.minimumLevel,
        reorderPoint: this.tracking.reorderPoint,
        maximumLevel: this.tracking.maximumLevel,
        locationInfo: this.tracking.locationInfo,
      },
      pricing: this.pricing,
    };
  }

  /**
   * Get the name of this model
   * @return {string} Model name
   */
  static getModelName() {
    return "InventoryItem";
  }
  
  /**
   * Create a new material item with appropriate defaults
   * 
   * @param {Object} data - Item data
   * @return {InventoryItem} New material item instance
   */
  static createMaterial(data = {}) {
    return new InventoryItem({
      ...data,
      type: "material",
      // Materials typically tracked by weight, but respect provided config
      tracking: {
        ...data.tracking,
        measurement: data.tracking?.measurement || "weight"
      }
    });
  }
  
  /**
   * Create a new product item with appropriate defaults
   * 
   * @param {Object} data - Item data
   * @return {InventoryItem} New product item instance
   */
  static createProduct(data = {}) {
    return new InventoryItem({
      ...data,
      type: "product",
      // Products typically tracked by quantity, but respect provided config
      tracking: {
        ...data.tracking,
        measurement: data.tracking?.measurement || "quantity"
      }
    });
  }
}

// Missing helper function that was referenced
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

// Export a structure compatible with the schema generator
module.exports = {
  VALUATION_METHODS,
  validateMeasurementUnit,
  fields: inventoryItemModel.fields,
  name: inventoryItemModel.name,
  timestamps: inventoryItemModel.timestamps,
  indexes: inventoryItemModel.indexes,
  virtuals: inventoryItemModel.virtuals,
  methods: inventoryItemModel.methods,
  statics: inventoryItemModel.statics,
  inventoryItemModel,
  InventoryItem,
};