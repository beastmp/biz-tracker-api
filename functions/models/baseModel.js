/**
 * Base model definition system
 * Provides a database-agnostic way to define models
 */

/**
 * Field types enumeration - maps to common DB field types
 */
const FieldTypes = {
  STRING: "string",
  NUMBER: "number",
  BOOLEAN: "boolean",
  DATE: "date",
  OBJECT: "object",
  ARRAY: "array",
  ID: "id",
  ENUM: "enum",
  REFERENCE: "reference",
};

/**
 * Define a field with common properties across database implementations
 * @param {Object} options - Field configuration options
 * @return {Object} - Field definition
 */
const defineField = (options) => {
  const field = {
    type: options.type,
    required: options.required || false,
    unique: options.unique || false,
    default: options.default,
    validation: options.validation || null,
  };

  // Add enum values if type is ENUM
  if (options.type === FieldTypes.ENUM) {
    field.values = options.values || [];
  }

  // Add reference info if type is REFERENCE
  if (options.type === FieldTypes.REFERENCE) {
    field.ref = options.ref || null;
  }

  // Add array item type if type is ARRAY
  if (options.type === FieldTypes.ARRAY) {
    field.items = options.items || null;
  }

  return field;
};

/**
 * Define a model with fields and metadata
 * @param {String} name - Model name
 * @param {Object} fields - Field definitions
 * @param {Object} options - Model options
 * @return {Object} - Model definition
 */
const defineModel = (name, fields, options = {}) => {
  return {
    name,
    fields,
    timestamps: options.timestamps !== false,
    indexes: options.indexes || [],
    virtuals: options.virtuals || [],
    methods: options.methods || {},
    statics: options.statics || {},
  };
};

/**
 * Base Model
 * Provides the foundation for domain models with common fields and functionality
 */
class BaseModel {
  /**
   * Creates a new BaseModel instance
   * @param {Object} data - Initial data for the model
   */
  constructor(data = {}) {
    this._id = data._id || null;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  /**
   * Get the plain object representation of the model
   * @return {Object} Plain object representation
   */
  toObject() {
    return {
      _id: this._id,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Validate the model
   * @return {boolean} True if valid, throws error if invalid
   */
  validate() {
    // Base validation - to be extended by subclasses
    return true;
  }

  /**
   * Get the name of this model
   * @return {string} Model name
   */
  static getModelName() {
    return "BaseModel";
  }
}

module.exports = {
  FieldTypes,
  defineField,
  defineModel,
  BaseModel,
};
