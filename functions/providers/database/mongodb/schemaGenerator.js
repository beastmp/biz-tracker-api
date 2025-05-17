/**
 * MongoDB Schema Generator
 * Generates Mongoose schemas from generic model definitions
 */
const mongoose = require("mongoose");

/**
 * Generate a Mongoose schema from a generic model definition
 * @param {Object} modelDef Generic model definition
 * @return {mongoose.Schema} Mongoose schema
 */
const generateMongooseSchema = (modelDef) => {
  if (!modelDef || !modelDef.fields) {
    throw new Error("Invalid model definition: missing fields");
  }

  const schemaDefinition = {};
  const schemaOptions = {
    timestamps: true,
    id: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret.__v;
        return ret;
      },
    },
  };

  // Process each field in the model definition
  Object.entries(modelDef.fields).forEach(([fieldName, fieldDef]) => {
    schemaDefinition[fieldName] = mapFieldTypeToMongoose(fieldDef);
  });

  // Add text search index if specified
  if (modelDef.textSearchFields && modelDef.textSearchFields.length > 0) {
    schemaOptions.autoIndex = true;
  }

  // Create schema
  const schema = new mongoose.Schema(schemaDefinition, schemaOptions);

  // Add text index for search if specified
  if (modelDef.textSearchFields && modelDef.textSearchFields.length > 0) {
    const textIndexFields = {};
    modelDef.textSearchFields.forEach((field) => {
      textIndexFields[field] = "text";
    });
    schema.index(textIndexFields);
  }

  // Add any hooks if specified
  if (modelDef.hooks) {
    addHooksToSchema(schema, modelDef.hooks);
  }

  return schema;
};

/**
 * Map a field definition to Mongoose schema type
 * @param {Object} fieldDef Field definition
 * @return {Object} Mongoose schema type definition
 */
const mapFieldTypeToMongoose = (fieldDef) => {
  // Handle array type
  if (fieldDef.isArray) {
    if (fieldDef.type === "object" && fieldDef.fields) {
      // Nested object array
      const nestedSchema = {};
      Object.entries(fieldDef.fields).forEach(([nestedFieldName, nestedFieldDef]) => {
        nestedSchema[nestedFieldName] = mapFieldTypeToMongoose(nestedFieldDef);
      });
      return [nestedSchema];
    } else {
      // Simple array
      return [mapSimpleTypeToMongoose(fieldDef)];
    }
  }

  // Handle object type
  if (fieldDef.type === "object" && fieldDef.fields) {
    const nestedSchema = {};
    Object.entries(fieldDef.fields).forEach(([nestedFieldName, nestedFieldDef]) => {
      nestedSchema[nestedFieldName] = mapFieldTypeToMongoose(nestedFieldDef);
    });
    return nestedSchema;
  }

  // Handle simple types
  return mapSimpleTypeToMongoose(fieldDef);
};

/**
 * Map simple field types to Mongoose schema types
 * @param {Object} fieldDef Field definition
 * @return {Object} Mongoose schema type
 */
const mapSimpleTypeToMongoose = (fieldDef) => {
  const schemaType = {
    type: getMongooseType(fieldDef.type),
    required: !!fieldDef.required,
  };

  // Add additional field properties
  if (fieldDef.default !== undefined) {
    schemaType.default = fieldDef.default;
  }

  if (fieldDef.enum) {
    schemaType.enum = fieldDef.enum;
  }

  if (fieldDef.ref) {
    schemaType.ref = fieldDef.ref;
  }

  if (fieldDef.min !== undefined) {
    schemaType.min = fieldDef.min;
  }

  if (fieldDef.max !== undefined) {
    schemaType.max = fieldDef.max;
  }

  if (fieldDef.minLength !== undefined) {
    schemaType.minLength = fieldDef.minLength;
  }

  if (fieldDef.maxLength !== undefined) {
    schemaType.maxLength = fieldDef.maxLength;
  }

  if (fieldDef.trim !== undefined && fieldDef.type === "string") {
    schemaType.trim = fieldDef.trim;
  }

  if (fieldDef.lowercase !== undefined && fieldDef.type === "string") {
    schemaType.lowercase = fieldDef.lowercase;
  }

  if (fieldDef.uppercase !== undefined && fieldDef.type === "string") {
    schemaType.uppercase = fieldDef.uppercase;
  }

  if (fieldDef.match !== undefined && fieldDef.type === "string") {
    schemaType.match = fieldDef.match;
  }

  if (fieldDef.validate) {
    schemaType.validate = fieldDef.validate;
  }

  return schemaType;
};

/**
 * Get Mongoose type for a generic type
 * @param {string} type Generic type name
 * @return {Function} Mongoose type
 */
const getMongooseType = (type) => {
  switch (type.toLowerCase()) {
    case "string":
      return String;
    case "number":
      return Number;
    case "boolean":
      return Boolean;
    case "date":
      return Date;
    case "objectid":
      return mongoose.Schema.Types.ObjectId;
    case "mixed":
      return mongoose.Schema.Types.Mixed;
    case "decimal":
      return mongoose.Schema.Types.Decimal128;
    case "buffer":
      return Buffer;
    case "map":
      return Map;
    default:
      return String; // Default to String for unknown types
  }
};

/**
 * Add hooks to a schema from model definition
 * @param {mongoose.Schema} schema Mongoose schema
 * @param {Object} hooks Hooks object from model definition
 */
const addHooksToSchema = (schema, hooks) => {
  // Pre hooks
  if (hooks.pre) {
    Object.entries(hooks.pre).forEach(([hookName, hookFn]) => {
      schema.pre(hookName, hookFn);
    });
  }

  // Post hooks
  if (hooks.post) {
    Object.entries(hooks.post).forEach(([hookName, hookFn]) => {
      schema.post(hookName, hookFn);
    });
  }
};

/**
 * Get a Mongoose schema from a model name
 * @param {string} modelName Name of the model
 * @param {string} collectionPrefix Optional collection prefix
 * @return {mongoose.Schema} Mongoose schema
 */
const getModelSchema = (modelName, collectionPrefix = "") => {
  const modelDef = require(`../../../models/${modelName.toLowerCase()}Model`);
  const schema = generateMongooseSchema(modelDef);

  // Set collection name with optional prefix
  schema.set("collection", `${collectionPrefix}${modelName.toLowerCase()}s`);

  return schema;
};

/**
 * Convert a Mongoose document to a plain object
 * @param {mongoose.Document} doc Mongoose document
 * @return {Object} Plain object
 */
const documentToObject = (doc) => {
  if (!doc) return null;
  return doc.toObject ? doc.toObject() : doc;
};

/**
 * Convert a plain object to the format expected by Mongoose
 * @param {Object} obj Plain object
 * @return {Object} Object formatted for Mongoose
 */
const objectToDocument = (obj) => {
  if (!obj) return {};

  // Clone the object to avoid modifying the original
  const result = {...obj};

  // Handle string IDs - convert to ObjectId if needed
  if (result._id && typeof result._id === "string") {
    if (mongoose.Types.ObjectId.isValid(result._id)) {
      result._id = new mongoose.Types.ObjectId(result._id);
    }
  }

  // Handle other ObjectId references
  Object.entries(result).forEach(([key, value]) => {
    // Check if the field might be an ObjectId reference
    if (
      value &&
      typeof value === "string" &&
      mongoose.Types.ObjectId.isValid(value) &&
      key.endsWith("Id")
    ) {
      result[key] = new mongoose.Types.ObjectId(value);
    }

    // Handle arrays of ObjectIds
    if (
      Array.isArray(value) &&
      value.length > 0 &&
      key.endsWith("Ids") &&
      typeof value[0] === "string"
    ) {
      result[key] = value.map((id) =>
        mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id,
      );
    }
  });

  return result;
};

/**
 * Create a model from a schema
 * @param {string} modelName Name of the model
 * @param {string} collectionPrefix Optional collection prefix
 * @return {mongoose.Model} Mongoose model
 */
const createModel = (modelName, collectionPrefix = "") => {
  try {
    // First, try to get an already registered model
    try {
      const existingModelName = `${collectionPrefix}${modelName}`;
      return mongoose.model(existingModelName);
    } catch (error) {
      // Model doesn't exist, create a new one
      const schema = getModelSchema(modelName, collectionPrefix);
      return mongoose.model(`${collectionPrefix}${modelName}`, schema);
    }
  } catch (error) {
    console.error(`Error creating model ${modelName}:`, error);
    throw error;
  }
};

module.exports = {
  generateMongooseSchema,
  getModelSchema,
  documentToObject,
  objectToDocument,
  createModel,
};
