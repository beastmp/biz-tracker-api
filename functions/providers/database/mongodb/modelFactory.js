/**
 * MongoDB Model Factory
 * Creates MongoDB models from generic model definitions
 */
const mongoose = require("mongoose");
const {getModelSchema} = require("./schemaGenerator");

// Cache for model instances
const modelCache = new Map();

/**
 * Get a Mongoose model from the cache or create a new one
 * @param {string} modelName - Name of the model
 * @param {string} collectionPrefix - Optional collection prefix
 * @return {mongoose.Model} Mongoose model
 */
const createModel = (modelName, collectionPrefix = "") => {
  const cacheKey = `${collectionPrefix}${modelName}`;

  // Return cached model if available
  if (modelCache.has(cacheKey)) {
    return modelCache.get(cacheKey);
  }

  try {
    // Try to get existing model first
    try {
      const existingModelName = `${collectionPrefix}${modelName}`;
      const existingModel = mongoose.model(existingModelName);
      modelCache.set(cacheKey, existingModel);
      return existingModel;
    } catch (err) {
      // Model doesn't exist yet, create it
      const schema = getModelSchema(modelName, collectionPrefix);
      const modelFullName = `${collectionPrefix}${modelName}`;
      const model = mongoose.model(modelFullName, schema);

      // Cache the model
      modelCache.set(cacheKey, model);

      return model;
    }
  } catch (error) {
    console.error(`Error creating model ${modelName}:`, error);
    throw error;
  }
};

module.exports = {
  createModel,
  getModelSchema,
};
