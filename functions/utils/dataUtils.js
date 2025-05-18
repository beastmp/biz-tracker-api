/**
 * Data Utility Functions
 * 
 * Utilities for data transformation, normalization, and standardization
 * to ensure consistent data structures across different providers.
 * 
 * @module dataUtils
 */

/**
 * Checks if an object is likely a MongoDB ObjectId
 * 
 * @param {Object} obj - The object to check
 * @returns {boolean} True if the object appears to be an ObjectId
 */
const isObjectId = (obj) => {
  return obj && 
         typeof obj === "object" && 
         (obj._bsontype === "ObjectID" || // MongoDB driver format
          (obj.buffer && obj.buffer.length === 12)); // BSON format
};

/**
 * Converts a MongoDB ObjectId to its string representation
 * 
 * @param {Object} objectId - The ObjectId to convert
 * @returns {string} The string representation of the ObjectId
 */
const objectIdToString = (objectId) => {
  if (typeof objectId.toString === "function") {
    return objectId.toString();
  }
  
  // Handle buffer-style ObjectIds
  if (objectId.buffer) {
    // Convert buffer to hex string
    const hex = Array.from(objectId.buffer)
      .map(byte => byte.toString(16).padStart(2, "0"))
      .join("");
    return hex;
  }
  
  // If we can't convert it properly, return a placeholder
  return objectId._id || objectId.id || "[ObjectId]";
};

/**
 * Normalizes data from any provider to ensure a consistent structure
 * for API responses. Removes provider-specific properties and 
 * transforms structures to standardized JSON format.
 *
 * @param {Object|Array} data - The data to normalize (document or array of documents)
 * @param {Object} [options] - Normalization options
 * @param {boolean} [options.standardizeIds=true] - Whether to standardize ID fields (use only 'id')
 * @return {Object|Array} Normalized data with provider-specific structures removed
 */
const normalizeData = (data, options = { standardizeIds: true }) => {
  // Handle undefined or null
  if (data === undefined || data === null) {
    return data;
  }

  // Handle arrays of data by mapping each item
  if (Array.isArray(data)) {
    return data.map((item) => normalizeData(item, options));
  }

  // If it's not an object, return as is
  if (typeof data !== "object") {
    return data;
  }
  
  // Handle MongoDB ObjectIds (convert to string)
  if (isObjectId(data)) {
    return objectIdToString(data);
  }

  // Check if it's a Mongoose document (has toObject method)
  if (data.toObject && typeof data.toObject === "function") {
    // Convert to plain object with no getters/virtuals/etc.
    return normalizeData(data.toObject({ getters: true, virtuals: true }), options);
  }

  // For MongoDB documents that might have _doc property
  if (data._doc) {
    return normalizeData(data._doc, options);
  }

  // For regular objects, make a shallow copy to avoid modifying the original
  // and process nested objects recursively
  const result = { ...data };
  
  // Process object properties, normalizing nested objects
  Object.keys(result).forEach(key => {
    // Special handling for ID fields
    if (key === "_id") {
      const idValue = isObjectId(result[key]) ? objectIdToString(result[key]) : result[key];
      
      // If we're standardizing IDs, make sure we have a standard 'id' field
      // and remove the MongoDB-style '_id'
      if (options.standardizeIds) {
        result.id = idValue;
        delete result._id;
      } else {
        result._id = idValue;
      }
      return;
    }
    
    // Skip MongoDB or Mongoose internal fields that start with $ or _
    // but preserve standard fields that might start with _
    const preservedFields = ["_id", "_createdAt", "_updatedAt", "_deletedAt"];
    if (key.startsWith("$") || (key.startsWith("_") && !preservedFields.includes(key))) {
      delete result[key];
      return;
    }
    
    // Recursively normalize nested objects
    if (result[key] && typeof result[key] === "object") {
      result[key] = normalizeData(result[key], options);
    }
  });

  return result;
};

module.exports = {
  normalizeData,
  isObjectId,
  objectIdToString
};