/**
 * Relationship Validator
 * Validates relationship requests and data
 *
 * @module relationshipValidator
 * @requires ../models/relationshipModel
 */
const RelationshipModel = require("../models/relationshipModel");
const {ENTITY_TYPES, RELATIONSHIP_TYPES} = RelationshipModel;

/**
 * Entity type validation
 * @param {string} entityType - The entity type to validate
 * @return {boolean} Whether the entity type is valid
 */
const isValidEntityType = (entityType) => {
  return Object.values(ENTITY_TYPES).includes(entityType);
};

/**
 * Relationship type validation
 * @param {string} relationshipType - The relationship type to validate
 * @return {boolean} Whether the relationship type is valid
 */
const isValidRelationshipType = (relationshipType) => {
  return Object.values(RELATIONSHIP_TYPES).includes(relationshipType);
};

/**
 * Validate required combination of entity types based on relationship type
 * @param {string} relationshipType - Type of relationship
 * @param {string} primaryType - Type of primary entity
 * @param {string} secondaryType - Type of secondary entity
 * @return {boolean} Whether the combination is valid
 */
const isValidEntityCombination = (
    relationshipType,
    primaryType,
    secondaryType,
) => {
  return RelationshipModel.isValidEntityCombination(relationshipType, primaryType, secondaryType);
};

/**
 * Validate relationship data
 * @param {Object} data - Relationship data to validate
 * @return {Object} Validation result with isValid and errors
 */
const validateRelationshipData = (data) => {
  const errors = [];

  // Check required fields
  if (!data.primaryId) {
    errors.push("Primary entity ID is required");
  }

  if (!data.primaryType) {
    errors.push("Primary entity type is required");
  } else if (!isValidEntityType(data.primaryType)) {
    errors.push(`Invalid primary entity type: ${data.primaryType}`);
  }

  if (!data.secondaryId) {
    errors.push("Secondary entity ID is required");
  }

  if (!data.secondaryType) {
    errors.push("Secondary entity type is required");
  } else if (!isValidEntityType(data.secondaryType)) {
    errors.push(`Invalid secondary entity type: ${data.secondaryType}`);
  }

  if (!data.relationshipType) {
    errors.push("Relationship type is required");
  } else if (!isValidRelationshipType(data.relationshipType)) {
    errors.push(`Invalid relationship type: ${data.relationshipType}`);
  }

  // Validate entity type combinations based on relationship type
  if (
    data.primaryType &&
    data.secondaryType &&
    data.relationshipType &&
    !isValidEntityCombination(
        data.relationshipType,
        data.primaryType,
        data.secondaryType,
    )
  ) {
    errors.push(
        `Invalid entity type combination for ${data.relationshipType}: ` +
      `primary=${data.primaryType}, secondary=${data.secondaryType}`,
    );
  }

  // Validate measurements for appropriate relationship types
  if (
    data.relationshipType &&
    ["purchase_item", "sale_item", "product_material", "derived"].includes(
        data.relationshipType,
    )
  ) {
    if (!data.measurements) {
      errors.push("Measurements are required for this relationship type");
    } else {
      // Add more specific measurement validation as needed
      const isMeasurementEmpty = Object.values(data.measurements)
          .every((val) => val === null || val === undefined || val === 0);

      if (isMeasurementEmpty) {
        errors.push(
            "At least one measurement value must be provided " +
          "(quantity, weight, length, area, or volume)",
        );
      }
    }
  }

  // Validate attributes for purchase and sale relationships
  if (data.relationshipType === "purchase_item" && !data.purchaseItemAttributes) {
    errors.push("purchaseItemAttributes are required for purchase_item relationships");
  }

  if (data.relationshipType === "purchase_asset" && !data.purchaseAssetAttributes) {
    errors.push("purchaseAssetAttributes are required for purchase_asset relationships");
  }

  if (data.relationshipType === "sale_item" && !data.saleItemAttributes) {
    errors.push("saleItemAttributes are required for sale_item relationships");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validate bulk creation data
 * @param {Array} relationshipsData - Array of relationship data objects
 * @return {Object} Validation result with isValid, errors and index map
 */
const validateBulkRelationshipData = (relationshipsData) => {
  if (!Array.isArray(relationshipsData)) {
    return {
      isValid: false,
      errors: ["Expected an array of relationship data objects"],
    };
  }

  const errors = [];
  const indexErrors = {};

  relationshipsData.forEach((data, index) => {
    const validation = validateRelationshipData(data);
    if (!validation.isValid) {
      indexErrors[index] = validation.errors;
      errors.push(
          `Invalid relationship at index ${index}: ${validation.errors.join(", ")}`,
      );
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    indexErrors,
  };
};

/**
 * Middleware to validate relationship creation requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const validateCreateRelationship = (req, res, next) => {
  const validation = validateRelationshipData(req.body);

  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      errors: validation.errors,
    });
  }

  next();
};

/**
 * Middleware to validate bulk relationship creation requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const validateBulkCreateRelationships = (req, res, next) => {
  const validation = validateBulkRelationshipData(req.body);

  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      errors: validation.errors,
      indexErrors: validation.indexErrors,
    });
  }

  next();
};

/**
 * Middleware to validate relationship update requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const validateUpdateRelationship = (req, res, next) => {
  // For updates, we only validate fields that are being updated
  const errors = [];

  if (req.body.primaryType && !isValidEntityType(req.body.primaryType)) {
    errors.push(`Invalid primary entity type: ${req.body.primaryType}`);
  }

  if (req.body.secondaryType && !isValidEntityType(req.body.secondaryType)) {
    errors.push(`Invalid secondary entity type: ${req.body.secondaryType}`);
  }

  if (req.body.relationshipType && !isValidRelationshipType(req.body.relationshipType)) {
    errors.push(`Invalid relationship type: ${req.body.relationshipType}`);
  }

  // If changing both entity types and relationship type, validate the combination
  if (
    req.body.relationshipType &&
    req.body.primaryType &&
    req.body.secondaryType &&
    !isValidEntityCombination(
        req.body.relationshipType,
        req.body.primaryType,
        req.body.secondaryType,
    )
  ) {
    errors.push(
        `Invalid entity type combination for ${req.body.relationshipType}: ` +
      `primary=${req.body.primaryType}, secondary=${req.body.secondaryType}`,
    );
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      errors,
    });
  }

  next();
};

/**
 * Middleware to validate relationship query parameters
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const validateQueryParams = (req, res, next) => {
  const errors = [];

  // Validate entity type parameters if present
  if (req.query.primaryType && !isValidEntityType(req.query.primaryType)) {
    errors.push(`Invalid primary entity type: ${req.query.primaryType}`);
  }

  if (req.query.secondaryType && !isValidEntityType(req.query.secondaryType)) {
    errors.push(`Invalid secondary entity type: ${req.query.secondaryType}`);
  }

  // Validate relationship type if present
  if (req.query.relationshipType && !isValidRelationshipType(req.query.relationshipType)) {
    errors.push(`Invalid relationship type: ${req.query.relationshipType}`);
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      errors,
    });
  }

  next();
};

module.exports = {
  validateCreateRelationship,
  validateBulkCreateRelationships,
  validateUpdateRelationship,
  validateQueryParams,
  validateRelationshipData,
  validateBulkRelationshipData,
  isValidEntityType,
  isValidRelationshipType,
  isValidEntityCombination,
};
