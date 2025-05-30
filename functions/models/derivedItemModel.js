/**
 * Derived Item Model
 * Defines specialized model for items derived from source items through processing
 */
const { FieldTypes, defineModel } = require("./baseModel");
const { 
  MEASUREMENT_TYPES, 
  MEASUREMENT_UNITS, 
  createMeasurementConfig,
  validateMeasurementUnit,
  BaseItem 
} = require("./baseItemModel");

/**
 * Create the derived item model definition by extending the base item model
 */
const derivedItemModel = defineModel("DerivedItem", {
  // Source items this item is derived from
  sources: {
    type: FieldTypes.ARRAY,
    items: {
      type: FieldTypes.OBJECT,
      properties: {
        itemId: {
          type: FieldTypes.REFERENCE,
          ref: "BaseItem",
          required: true,
        },
        conversionRatio: {
          type: FieldTypes.NUMBER,
          default: 1.0,
        },
        measurement: {
          type: FieldTypes.ENUM,
          values: MEASUREMENT_TYPES,
          default: "quantity",
        },
        quantity: {
          type: FieldTypes.NUMBER,
          default: 1,
        },
        weight: {
          type: FieldTypes.NUMBER,
          default: 0,
        },
        weightUnit: {
          type: FieldTypes.STRING,
          default: "lb",
        },
        length: {
          type: FieldTypes.NUMBER,
          default: 0,
        },
        lengthUnit: {
          type: FieldTypes.STRING,
          default: "in",
        },
        area: {
          type: FieldTypes.NUMBER,
          default: 0,
        },
        areaUnit: {
          type: FieldTypes.STRING,
          default: "sqft",
        },
        volume: {
          type: FieldTypes.NUMBER,
          default: 0,
        },
        volumeUnit: {
          type: FieldTypes.STRING,
          default: "l",
        },
        notes: {
          type: FieldTypes.STRING,
        },
      },
    },
    default: [],
  },
  
  // Processing information
  processing: {
    type: FieldTypes.OBJECT,
    properties: {
      processingTime: {
        type: FieldTypes.NUMBER,
        default: 0,
      },
      processingTimeUnit: {
        type: FieldTypes.STRING,
        default: "minutes",
      },
      laborCost: {
        type: FieldTypes.NUMBER,
        default: 0,
      },
      overheadCost: {
        type: FieldTypes.NUMBER,
        default: 0,
      },
      batchSize: {
        type: FieldTypes.NUMBER,
        default: 1,
      },
      yieldPercentage: {
        type: FieldTypes.NUMBER,
        default: 100,
      },
      instructions: {
        type: FieldTypes.STRING,
      },
    },
    default: {},
  },
});

/**
 * DerivedItem class for specialized derived item business logic
 */
class DerivedItem extends BaseItem {
  /**
   * Creates a new DerivedItem instance
   * @param {Object} data - DerivedItem data
   */
  constructor(data = {}) {
    super(data);

    // Set the appropriate type for a derived item
    this.type = "material";
    
    // Initialize source relationships
    this.sources = data.sources || [];
    
    // Initialize processing info
    this.processing = {
      processingTime: data.processing?.processingTime || 0,
      processingTimeUnit: data.processing?.processingTimeUnit || "minutes",
      laborCost: data.processing?.laborCost || 0,
      overheadCost: data.processing?.overheadCost || 0,
      batchSize: data.processing?.batchSize || 1,
      yieldPercentage: data.processing?.yieldPercentage || 100,
      instructions: data.processing?.instructions || "",
    };
  }

  /**
   * Validate the derived item
   * @return {boolean} True if valid, throws error if invalid
   */
  validate() {
    super.validate();
    
    // Validate yield percentage
    if (this.processing.yieldPercentage <= 0 || this.processing.yieldPercentage > 100) {
      throw new Error(`Invalid yield percentage: ${this.processing.yieldPercentage}. Must be between 0 and 100.`);
    }
    
    // Validate sources if present
    if (this.sources && this.sources.length > 0) {
      this.sources.forEach((source, index) => {
        if (!source.itemId) {
          throw new Error(`Source at index ${index} is missing an item ID`);
        }
        
        if (source.quantity <= 0) {
          throw new Error(`Source at index ${index} has an invalid quantity: ${source.quantity}`);
        }
        
        if (source.conversionRatio <= 0) {
          throw new Error(`Source at index ${index} has an invalid conversion ratio: ${source.conversionRatio}`);
        }
        
        // Validate measurement units if present
        if (source.measurement === "weight" && source.weight > 0) {
          validateMeasurementUnit(source.weightUnit, "weight");
        } else if (source.measurement === "length" && source.length > 0) {
          validateMeasurementUnit(source.lengthUnit, "length");
        } else if (source.measurement === "area" && source.area > 0) {
          validateMeasurementUnit(source.areaUnit, "area");
        } else if (source.measurement === "volume" && source.volume > 0) {
          validateMeasurementUnit(source.volumeUnit, "volume");
        }
      });
    }

    return true;
  }

  /**
   * Add a source item this item is derived from
   * 
   * @param {string} sourceItemId - ID of the source item
   * @param {Object} measurement - Measurement information
   * @param {number} measurement.quantity - Quantity of the source used
   * @param {number} [conversionRatio=1.0] - How much source makes one unit of derived item
   * @param {string} [notes] - Optional notes about this derivation
   * @return {DerivedItem} This item instance
   */
  addSource(sourceItemId, measurement, conversionRatio = 1.0, notes = "") {
    if (!sourceItemId) {
      throw new Error("Source item ID is required");
    }
    
    if (!measurement || typeof measurement.quantity !== "number" || measurement.quantity <= 0) {
      throw new Error("Valid measurement with positive quantity is required");
    }
    
    if (conversionRatio <= 0) {
      throw new Error("Conversion ratio must be positive");
    }
    
    // Ensure we have sources array
    if (!this.sources) {
      this.sources = [];
    }
    
    // Check if source already exists
    const existingIndex = this.sources.findIndex(s => s.itemId === sourceItemId);
    
    if (existingIndex >= 0) {
      // Update existing source
      this.sources[existingIndex] = {
        ...this.sources[existingIndex],
        ...measurement,
        conversionRatio,
        notes: notes || this.sources[existingIndex].notes,
      };
    } else {
      // Add new source
      this.sources.push({
        itemId: sourceItemId,
        ...measurement,
        conversionRatio,
        notes,
      });
    }
    
    return this;
  }
  
  /**
   * Remove a source this item is derived from
   * 
   * @param {string} sourceItemId - ID of the source to remove
   * @return {DerivedItem} This item instance
   */
  removeSource(sourceItemId) {
    if (!this.sources) {
      return this;
    }
    
    this.sources = this.sources.filter(s => s.itemId !== sourceItemId);
    return this;
  }
  
  /**
   * Calculate the material cost of this derived item based on its sources
   * 
   * @param {Object} sourceCosts - Object mapping source item IDs to their costs
   * @return {number} Total material cost
   */
  calculateMaterialCost(sourceCosts) {
    if (!this.sources || this.sources.length === 0) {
      return 0;
    }
    
    return this.sources.reduce((total, source) => {
      const sourceCost = sourceCosts[source.itemId] || 0;
      const requiredAmount = source.quantity / source.conversionRatio;
      return total + (sourceCost * requiredAmount);
    }, 0);
  }
  
  /**
   * Calculate the total processing cost including materials, labor, and overhead
   * 
   * @param {Object} sourceCosts - Object mapping source item IDs to their costs
   * @param {number} quantity - Number of units to produce
   * @return {Object} Cost breakdown and total cost
   */
  calculateProcessingCost(sourceCosts, quantity = 1) {
    // Apply yield percentage to determine raw material needed
    const effectiveQuantity = quantity * (100 / this.processing.yieldPercentage);
    
    const materialCost = this.calculateMaterialCost(sourceCosts) * effectiveQuantity;
    const laborCost = this.processing.laborCost * quantity;
    const overheadCost = this.processing.overheadCost * quantity;
    const totalCost = materialCost + laborCost + overheadCost;
    
    return {
      materialCost,
      laborCost,
      overheadCost,
      totalCost,
      unitCost: quantity > 0 ? totalCost / quantity : 0,
      effectiveQuantity,
      yieldLoss: effectiveQuantity - quantity
    };
  }
  
  /**
   * Update the processing information
   * 
   * @param {Object} processing - New processing data
   * @param {number} [processing.processingTime] - Time to process
   * @param {string} [processing.processingTimeUnit] - Unit for processing time
   * @param {number} [processing.laborCost] - Labor cost per unit
   * @param {number} [processing.overheadCost] - Overhead cost per unit
   * @param {number} [processing.batchSize] - Typical batch size
   * @param {number} [processing.yieldPercentage] - Expected yield percentage
   * @param {string} [processing.instructions] - Processing instructions
   * @return {DerivedItem} This item instance
   */
  updateProcessingInfo(processing = {}) {
    if (!this.processing) {
      this.processing = {};
    }
    
    if (processing.processingTime !== undefined) {
      this.processing.processingTime = Math.max(0, processing.processingTime);
    }
    
    if (processing.processingTimeUnit !== undefined) {
      this.processing.processingTimeUnit = processing.processingTimeUnit;
    }
    
    if (processing.laborCost !== undefined) {
      this.processing.laborCost = Math.max(0, processing.laborCost);
    }
    
    if (processing.overheadCost !== undefined) {
      this.processing.overheadCost = Math.max(0, processing.overheadCost);
    }
    
    if (processing.batchSize !== undefined) {
      this.processing.batchSize = Math.max(1, processing.batchSize);
    }
    
    if (processing.yieldPercentage !== undefined) {
      this.processing.yieldPercentage = Math.min(100, Math.max(1, processing.yieldPercentage));
    }
    
    if (processing.instructions !== undefined) {
      this.processing.instructions = processing.instructions;
    }
    
    return this;
  }
  
  /**
   * Get the plain object representation of the derived item
   * @return {Object} Plain object representation
   */
  toObject() {
    return {
      ...super.toObject(),
      sources: this.sources,
      processing: this.processing,
    };
  }

  /**
   * Get the name of this model
   * @return {string} Model name
   */
  static getModelName() {
    return "DerivedItem";
  }
}

// Export a structure compatible with the schema generator
module.exports = {
  fields: derivedItemModel.fields,
  name: derivedItemModel.name,
  timestamps: true,
  indexes: [
    {fields: {"sources.itemId": 1}},
  ],
  virtuals: derivedItemModel.virtuals,
  methods: derivedItemModel.methods,
  statics: derivedItemModel.statics,
  derivedItemModel,
  DerivedItem,
};