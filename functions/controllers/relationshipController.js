/**
 * Relationship Controller
 * Handles HTTP requests related to entity relationships
 */

const relationshipService = require("../services/relationshipService");
const { AppError, ValidationError } = require("../validation/errors");
const { normalizeData } = require("../utils/dataUtils");

/**
 * Wrap controller methods with standard error handling
 * 
 * @param {Function} method - Method to wrap with error handling
 * @param {string} operation - Description of the operation
 * @returns {Function} Error-handled function
 */
const withErrorHandling = (method, operation) => {
  return async (...args) => {
    try {
      return await method(...args);
    } catch (error) {
      console.error(`Error in relationship controller (${operation}):`, error);

      // If it's already an AppError, just rethrow it
      if (error instanceof AppError) {
        throw error;
      }

      // For MongoDB duplicate key errors
      if (error.code === 11000) {
        throw new AppError(
          `Relationship with duplicate ${Object.keys(error.keyValue)[0]} exists`,
          409,
        );
      }

      // For validation errors
      if (error.name === "ValidationError") {
        throw new ValidationError(
          `Invalid relationship data: ${error.message}`,
          error.errors,
        );
      }

      // Default error
      throw new AppError(
        `Failed to ${operation}: ${error.message}`,
        500,
      );
    }
  };
};

/**
 * Relationship controller with all methods
 */
const relationshipController = {
  /**
   * Get all relationships
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getAllRelationships(req, res) {
    const query = req.query.filter ? JSON.parse(req.query.filter) : {};
    const options = {};
    
    // Handle pagination
    if (req.query.page && req.query.limit) {
      options.skip = (parseInt(req.query.page) - 1) * parseInt(req.query.limit);
      options.limit = parseInt(req.query.limit);
    }
    
    // Handle sorting
    if (req.query.sort) {
      options.sort = req.query.sort;
    }
    
    const relationships = await relationshipService.getAllRelationships(query, options);
    
    res.status(200).json({
      status: "success",
      results: relationships.length,
      data: normalizeData(relationships)
    });
  },
  
  /**
   * Get relationship by ID
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getRelationshipById(req, res) {
    const relationship = await relationshipService.getRelationshipById(req.params.id);
    
    if (!relationship) {
      throw new AppError(`Relationship with ID ${req.params.id} not found`, 404);
    }
    
    res.status(200).json({
      status: "success",
      data: normalizeData(relationship)
    });
  },
  
  /**
   * Find relationships by primary entity
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async findByPrimaryEntity(req, res) {
    const { primaryId, primaryType } = req.params;
    
    if (!primaryId || !primaryType) {
      throw new ValidationError(
        "Primary ID and type are required",
        ["primaryId", "primaryType"]
      );
    }
    
    const options = {};
    
    // Handle pagination
    if (req.query.page && req.query.limit) {
      options.skip = (parseInt(req.query.page) - 1) * parseInt(req.query.limit);
      options.limit = parseInt(req.query.limit);
    }
    
    const relationships = await relationshipService.findByPrimaryEntity(
      primaryId,
      primaryType,
      options
    );
    
    res.status(200).json({
      status: "success",
      results: relationships.length,
      data: normalizeData(relationships)
    });
  },
  
  /**
   * Find relationships by secondary entity
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async findBySecondaryEntity(req, res) {
    const { secondaryId, secondaryType } = req.params;
    
    if (!secondaryId || !secondaryType) {
      throw new ValidationError(
        "Secondary ID and type are required",
        ["secondaryId", "secondaryType"]
      );
    }
    
    const options = {};
    
    // Handle pagination
    if (req.query.page && req.query.limit) {
      options.skip = (parseInt(req.query.page) - 1) * parseInt(req.query.limit);
      options.limit = parseInt(req.query.limit);
    }
    
    const relationships = await relationshipService.findBySecondaryEntity(
      secondaryId,
      secondaryType,
      options
    );
    
    res.status(200).json({
      status: "success",
      results: relationships.length,
      data: normalizeData(relationships)
    });
  },
  
  /**
   * Create a new relationship
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async createRelationship(req, res) {
    const relationship = await relationshipService.createRelationship(req.body);
    
    res.status(201).json({
      status: "success",
      data: normalizeData(relationship)
    });
  },
  
  /**
   * Update a relationship
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async updateRelationship(req, res) {
    const relationship = await relationshipService.updateRelationship(
      req.params.id,
      req.body
    );
    
    if (!relationship) {
      throw new AppError(`Relationship with ID ${req.params.id} not found`, 404);
    }
    
    res.status(200).json({
      status: "success",
      data: normalizeData(relationship)
    });
  },
  
  /**
   * Delete a relationship
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async deleteRelationship(req, res) {
    const result = await relationshipService.deleteRelationship(req.params.id);
    
    if (!result) {
      throw new AppError(`Relationship with ID ${req.params.id} not found`, 404);
    }
    
    res.status(204).json({
      status: "success",
      data: null
    });
  },
  
  /**
   * Delete all relationships for an entity
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async deleteAllEntityRelationships(req, res) {
    const { entityId, entityType } = req.params;
    
    if (!entityId || !entityType) {
      throw new ValidationError(
        "Entity ID and type are required",
        ["entityId", "entityType"]
      );
    }
    
    const deletedCount = await relationshipService.deleteAllEntityRelationships(
      entityId,
      entityType
    );
    
    res.status(200).json({
      status: "success",
      data: {
        deletedCount
      }
    });
  },
  
  /**
   * Create a purchase-item relationship
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async createPurchaseItemRelationship(req, res) {
    const { purchaseId, itemId } = req.params;
    const attributes = req.body;
    
    if (!purchaseId || !itemId) {
      throw new ValidationError(
        "Purchase ID and Item ID are required",
        ["purchaseId", "itemId"]
      );
    }
    
    const relationship = await relationshipService.createPurchaseItemRelationship(
      purchaseId,
      itemId,
      attributes
    );
    
    res.status(201).json({
      status: "success",
      data: normalizeData(relationship)
    });
  },
  
  /**
   * Create a purchase-asset relationship
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async createPurchaseAssetRelationship(req, res) {
    const { purchaseId, assetId } = req.params;
    const attributes = req.body;
    
    if (!purchaseId || !assetId) {
      throw new ValidationError(
        "Purchase ID and Asset ID are required",
        ["purchaseId", "assetId"]
      );
    }
    
    const relationship = await relationshipService.createPurchaseAssetRelationship(
      purchaseId,
      assetId,
      attributes
    );
    
    res.status(201).json({
      status: "success",
      data: normalizeData(relationship)
    });
  },
  
  /**
   * Create a sale-item relationship
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async createSaleItemRelationship(req, res) {
    const { saleId, itemId } = req.params;
    const attributes = req.body;
    
    if (!saleId || !itemId) {
      throw new ValidationError(
        "Sale ID and Item ID are required",
        ["saleId", "itemId"]
      );
    }
    
    const relationship = await relationshipService.createSaleItemRelationship(
      saleId,
      itemId,
      attributes
    );
    
    res.status(201).json({
      status: "success",
      data: normalizeData(relationship)
    });
  },
  
  /**
   * Create a product-material relationship
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async createProductMaterialRelationship(req, res) {
    const { productId, materialId } = req.params;
    const attributes = req.body;
    
    if (!productId || !materialId) {
      throw new ValidationError(
        "Product ID and Material ID are required",
        ["productId", "materialId"]
      );
    }
    
    const relationship = await relationshipService.createProductMaterialRelationship(
      productId,
      materialId,
      attributes
    );
    
    res.status(201).json({
      status: "success",
      data: normalizeData(relationship)
    });
  },
  
  /**
   * Get entity types
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getEntityTypes(req, res) {
    const entityTypes = relationshipService.getEntityTypes();
    
    res.status(200).json({
      status: "success",
      data: entityTypes
    });
  },
  
  /**
   * Get relationship types
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getRelationshipTypes(req, res) {
    const relationshipTypes = relationshipService.getRelationshipTypes();
    
    res.status(200).json({
      status: "success",
      data: relationshipTypes
    });
  }
};

// Create a wrapped version of the controller with error handling
const enhancedController = {};

// Wrap all methods with error handling
Object.entries(relationshipController).forEach(([methodName, method]) => {
  // Convert method name to operation description (e.g., getAllRelationships -> get all relationships)
  const operation = methodName
    .replace(/([A-Z])/g, " $1")
    .toLowerCase()
    .trim();

  enhancedController[methodName] = withErrorHandling(method, operation);
});

module.exports = enhancedController;
