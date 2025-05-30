/**
 * Product Item Model
 * Defines specialized model for items that are assembled from components
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
 * Create the product item model definition by extending the base item model
 */
const productItemModel = defineModel("ProductItem", {
  // Components used to create this product
  components: {
    type: FieldTypes.ARRAY,
    items: {
      type: FieldTypes.OBJECT,
      properties: {
        itemId: {
          type: FieldTypes.REFERENCE,
          ref: "BaseItem",
          required: true,
        },
        quantity: {
          type: FieldTypes.NUMBER,
          default: 1,
        },
        measurement: {
          type: FieldTypes.ENUM,
          values: MEASUREMENT_TYPES,
          default: "quantity",
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
  
  // Production information 
  production: {
    type: FieldTypes.OBJECT,
    properties: {
      assemblyTime: {
        type: FieldTypes.NUMBER,
        default: 0,
      },
      assemblyTimeUnit: {
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
      instructions: {
        type: FieldTypes.STRING,
      },
    },
    default: {},
  },
});

/**
 * ProductItem class for specialized product item business logic
 */
class ProductItem extends BaseItem {
  /**
   * Creates a new ProductItem instance
   * @param {Object} data - ProductItem data
   */
  constructor(data = {}) {
    super(data);

    // Set item type to product
    this.type = "product";
    
    // Initialize component relationships
    this.components = data.components || [];
    
    // Initialize production info
    this.production = {
      assemblyTime: data.production?.assemblyTime || 0,
      assemblyTimeUnit: data.production?.assemblyTimeUnit || "minutes",
      laborCost: data.production?.laborCost || 0,
      overheadCost: data.production?.overheadCost || 0,
      batchSize: data.production?.batchSize || 1,
      instructions: data.production?.instructions || "",
    };
  }

  /**
   * Validate the product item
   * @return {boolean} True if valid, throws error if invalid
   */
  validate() {
    super.validate();
    
    // Validate components if present
    if (this.components && this.components.length > 0) {
      this.components.forEach((component, index) => {
        if (!component.itemId) {
          throw new Error(`Component at index ${index} is missing an item ID`);
        }
        
        if (component.quantity <= 0) {
          throw new Error(`Component at index ${index} has an invalid quantity: ${component.quantity}`);
        }
        
        // Validate measurement units if present
        if (component.measurement === "weight" && component.weight > 0) {
          validateMeasurementUnit(component.weightUnit, "weight");
        } else if (component.measurement === "length" && component.length > 0) {
          validateMeasurementUnit(component.lengthUnit, "length");
        } else if (component.measurement === "area" && component.area > 0) {
          validateMeasurementUnit(component.areaUnit, "area");
        } else if (component.measurement === "volume" && component.volume > 0) {
          validateMeasurementUnit(component.volumeUnit, "volume");
        }
      });
    }

    return true;
  }

  /**
   * Add a component to this product
   * 
   * @param {string} componentItemId - ID of the component item
   * @param {Object} measurement - Measurement information
   * @param {number} measurement.quantity - Quantity of the component used
   * @param {string} [notes] - Optional notes about this component
   * @return {ProductItem} This item instance
   */
  addComponent(componentItemId, measurement, notes = "") {
    if (!componentItemId) {
      throw new Error("Component item ID is required");
    }
    
    if (!measurement || typeof measurement.quantity !== "number" || measurement.quantity <= 0) {
      throw new Error("Valid measurement with positive quantity is required");
    }
    
    // Ensure we have components array
    if (!this.components) {
      this.components = [];
    }
    
    // Check if component already exists
    const existingIndex = this.components.findIndex(c => c.itemId === componentItemId);
    
    if (existingIndex >= 0) {
      // Update existing component
      this.components[existingIndex] = {
        ...this.components[existingIndex],
        ...measurement,
        notes: notes || this.components[existingIndex].notes,
      };
    } else {
      // Add new component
      this.components.push({
        itemId: componentItemId,
        ...measurement,
        notes,
      });
    }
    
    return this;
  }
  
  /**
   * Remove a component from this product
   * 
   * @param {string} componentItemId - ID of the component to remove
   * @return {ProductItem} This item instance
   */
  removeComponent(componentItemId) {
    if (!this.components) {
      return this;
    }
    
    this.components = this.components.filter(c => c.itemId !== componentItemId);
    return this;
  }
  
  /**
   * Calculate the material cost of this product based on its components
   * 
   * @param {Object} componentCosts - Object mapping component item IDs to their costs
   * @return {number} Total material cost
   */
  calculateMaterialCost(componentCosts) {
    if (!this.components || this.components.length === 0) {
      return 0;
    }
    
    return this.components.reduce((total, component) => {
      const componentCost = componentCosts[component.itemId] || 0;
      return total + (componentCost * component.quantity);
    }, 0);
  }
  
  /**
   * Calculate the total production cost including materials, labor, and overhead
   * 
   * @param {Object} componentCosts - Object mapping component item IDs to their costs
   * @param {number} quantity - Number of units to produce
   * @return {Object} Cost breakdown and total cost
   */
  calculateProductionCost(componentCosts, quantity = 1) {
    const materialCost = this.calculateMaterialCost(componentCosts) * quantity;
    const laborCost = this.production.laborCost * quantity;
    const overheadCost = this.production.overheadCost * quantity;
    const totalCost = materialCost + laborCost + overheadCost;
    
    return {
      materialCost,
      laborCost,
      overheadCost,
      totalCost,
      unitCost: quantity > 0 ? totalCost / quantity : 0,
    };
  }
  
  /**
   * Update the production information
   * 
   * @param {Object} production - New production data
   * @param {number} [production.assemblyTime] - Time to assemble
   * @param {string} [production.assemblyTimeUnit] - Unit for assembly time
   * @param {number} [production.laborCost] - Labor cost per unit
   * @param {number} [production.overheadCost] - Overhead cost per unit
   * @param {number} [production.batchSize] - Typical batch size
   * @param {string} [production.instructions] - Assembly instructions
   * @return {ProductItem} This item instance
   */
  updateProductionInfo(production = {}) {
    if (!this.production) {
      this.production = {};
    }
    
    if (production.assemblyTime !== undefined) {
      this.production.assemblyTime = Math.max(0, production.assemblyTime);
    }
    
    if (production.assemblyTimeUnit !== undefined) {
      this.production.assemblyTimeUnit = production.assemblyTimeUnit;
    }
    
    if (production.laborCost !== undefined) {
      this.production.laborCost = Math.max(0, production.laborCost);
    }
    
    if (production.overheadCost !== undefined) {
      this.production.overheadCost = Math.max(0, production.overheadCost);
    }
    
    if (production.batchSize !== undefined) {
      this.production.batchSize = Math.max(1, production.batchSize);
    }
    
    if (production.instructions !== undefined) {
      this.production.instructions = production.instructions;
    }
    
    return this;
  }
  
  /**
   * Get the plain object representation of the product item
   * @return {Object} Plain object representation
   */
  toObject() {
    return {
      ...super.toObject(),
      components: this.components,
      production: this.production,
    };
  }

  /**
   * Get the name of this model
   * @return {string} Model name
   */
  static getModelName() {
    return "ProductItem";
  }
}

// Export a structure compatible with the schema generator
module.exports = {
  fields: productItemModel.fields,
  name: productItemModel.name,
  timestamps: true,
  indexes: [
    {fields: {"components.itemId": 1}},
  ],
  virtuals: productItemModel.virtuals,
  methods: productItemModel.methods,
  statics: productItemModel.statics,
  productItemModel,
  ProductItem,
};