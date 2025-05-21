/**
 * Migration Controller
 * 
 * Handles HTTP requests related to data migrations between model versions
 * 
 * @module migrationController
 * @requires ../utils/migrationUtils
 * @requires ../validation/errors
 */

const migrationUtils = require("../utils/migrationUtils");
const { AppError } = require("../validation/errors");

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
      console.error(`Error in migration controller (${operation}):`, error);

      // If it's already an AppError, just rethrow it
      if (error instanceof AppError) {
        throw error;
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
 * Migration controller with all methods
 */
const migrationController = {
  /**
   * Migrate a single item to use normalized measurement structure
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async migrateItem(req, res) {
    const { itemId } = req.params;
    
    if (!itemId) {
      throw new AppError("Item ID is required", 400);
    }
    
    const result = await migrationUtils.migrateItemToNormalizedStructure(itemId);
    
    res.status(200).json({
      status: "success",
      message: "Item migrated successfully",
      data: result
    });
  },
  
  /**
   * Migrate all items to use normalized measurement structure
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async migrateAllItems(req, res) {
    const results = await migrationUtils.migrateAllItemsToNormalizedStructure();
    
    res.status(200).json({
      status: "success",
      message: `Migrated ${results.successful} items successfully, ${results.failed} failed`,
      data: results
    });
  },
  
  /**
   * Migrate a single relationship to use normalized measurements
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async migrateRelationship(req, res) {
    const { relationshipId } = req.params;
    const { type } = req.query;
    
    if (!relationshipId) {
      throw new AppError("Relationship ID is required", 400);
    }
    
    let result;
    
    switch (type) {
      case "purchase_item":
        result = await migrationUtils.migratePurchaseItemRelationship(relationshipId);
        break;
      case "sale_item":
        result = await migrationUtils.migrateSaleItemRelationship(relationshipId);
        break;
      case "product_material":
        result = await migrationUtils.migrateProductMaterialRelationship(relationshipId);
        break;
      default:
        // Try to automatically determine relationship type
        const relationshipRepo = require("../providers/repositoryFactory").getRelationshipRepository();
        const relationship = await relationshipRepo.findById(relationshipId);
        
        if (!relationship) {
          throw new AppError(`Relationship with ID ${relationshipId} not found`, 404);
        }
        
        switch (relationship.relationshipType) {
          case "purchase_item":
            result = await migrationUtils.migratePurchaseItemRelationship(relationshipId);
            break;
          case "sale_item":
            result = await migrationUtils.migrateSaleItemRelationship(relationshipId);
            break;
          case "product_material":
            result = await migrationUtils.migrateProductMaterialRelationship(relationshipId);
            break;
          default:
            throw new AppError(
              `Unsupported relationship type: ${relationship.relationshipType}`, 
              400
            );
        }
    }
    
    res.status(200).json({
      status: "success",
      message: "Relationship migrated successfully",
      data: result
    });
  },
  
  /**
   * Migrate all relationships to use normalized measurements
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async migrateAllRelationships(req, res) {
    const results = await migrationUtils.migrateAllRelationshipsToNormalizedStructure();
    
    res.status(200).json({
      status: "success",
      message: `Migrated ${results.successful} relationships successfully, ${results.failed} failed`,
      data: results
    });
  },
  
  /**
   * Migrate embedded relationships from an item to the new relationship model
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async migrateItemEmbeddedRelationships(req, res) {
    const { itemId } = req.params;
    
    if (!itemId) {
      throw new AppError("Item ID is required", 400);
    }
    
    const results = await migrationUtils.migrateItemEmbeddedRelationships(itemId);
    
    res.status(200).json({
      status: "success",
      message: `Created ${results.created} relationships, ${results.errors.length} failed`,
      data: results
    });
  },
  
  /**
   * Migrate embedded relationships from a purchase to the new relationship model
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async migratePurchaseEmbeddedRelationships(req, res) {
    const { purchaseId } = req.params;
    
    if (!purchaseId) {
      throw new AppError("Purchase ID is required", 400);
    }
    
    const results = await migrationUtils.migratePurchaseEmbeddedRelationships(purchaseId);
    
    res.status(200).json({
      status: "success",
      message: `Created ${results.created} relationships, ${results.skipped} skipped, ${results.errors.length} failed`,
      data: results
    });
  },
  
  /**
   * Migrate embedded relationships from a sale to the new relationship model
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async migrateSaleEmbeddedRelationships(req, res) {
    const { saleId } = req.params;
    
    if (!saleId) {
      throw new AppError("Sale ID is required", 400);
    }
    
    const results = await migrationUtils.migrateSaleEmbeddedRelationships(saleId);
    
    res.status(200).json({
      status: "success",
      message: `Created ${results.created} relationships, ${results.skipped} skipped, ${results.errors.length} failed`,
      data: results
    });
  },
  
  /**
   * Migrate all embedded relationships to the new relationship model
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async migrateAllEmbeddedRelationships(req, res) {
    const results = await migrationUtils.migrateAllEmbeddedRelationships();
    
    res.status(200).json({
      status: "success",
      message: `Created ${results.totalRelationshipsCreated} relationships, ${results.totalErrors} errors`,
      data: results
    });
  },
  
  /**
   * Complete migration that performs all required steps
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async migrateAll(req, res) {
    // This performs all migration steps in sequence
    const includeCleanup = req.query.cleanup === "true";
    
    // Step 1: Migrate all items to use normalized structure
    const itemResults = await migrationUtils.migrateAllItemsToNormalizedStructure();
    
    // Step 2: Migrate all relationships to use normalized measurements
    const relationshipResults = await migrationUtils.migrateAllRelationshipsToNormalizedStructure();
    
    // Step 3: Migrate all embedded relationships to the new relationship model
    const embeddedResults = await migrationUtils.migrateAllEmbeddedRelationships();
    
    // Step 4 (Optional): Clean up embedded fields if requested
    let cleanupResults = null;
    if (includeCleanup) {
      cleanupResults = await migrationUtils.cleanupAllEmbeddedFieldsAllEntityTypes();
    }
    
    // Combine results
    const combinedResults = {
      items: itemResults,
      relationships: relationshipResults,
      embeddedRelationships: embeddedResults,
      cleanup: cleanupResults,
      summary: {
        itemsSuccessful: itemResults.successful,
        itemsFailed: itemResults.failed,
        relationshipsSuccessful: relationshipResults.successful,
        relationshipsFailed: relationshipResults.failed,
        embeddedRelationshipsCreated: embeddedResults.totalRelationshipsCreated,
        embeddedRelationshipsErrors: embeddedResults.totalErrors,
        cleanupPerformed: includeCleanup,
        cleanupTotalProcessed: cleanupResults ? cleanupResults.summary.totalProcessed : null,
        cleanupTotalSuccess: cleanupResults ? cleanupResults.summary.totalSuccess : null,
        cleanupTotalErrors: cleanupResults ? cleanupResults.summary.totalErrors : null,
      },
    };
    
    res.status(200).json({
      status: "success",
      message: "Complete migration finished" + (includeCleanup ? " with cleanup" : ""),
      data: combinedResults
    });
  },
  
  /**
   * Clean up embedded relationships after migration
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async cleanupEmbeddedFields(req, res) {
    const { entityType, entityId } = req.params;
    
    try {
      let results;
      
      if (entityId) {
        // Clean up specific entity
        results = await migrationUtils.cleanupEmbeddedFields(entityType, entityId);
        
        res.status(200).json({
          status: "success",
          message: `Removed embedded fields from ${entityType} ${entityId}`,
          data: results
        });
      } else {
        // Clean up all entities of a type
        results = await migrationUtils.cleanupAllEmbeddedFields(entityType);
        
        res.status(200).json({
          status: "success",
          message: `Removed embedded fields from ${results.processed} ${entityType}s`,
          data: results
        });
      }
    } catch (error) {
      throw new AppError(`Failed to clean up embedded fields: ${error.message}`, 500);
    }
  },

  /**
   * Clean up all embedded fields after complete migration
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async cleanupAllEmbeddedFields(req, res) {
    try {
      const results = await migrationUtils.cleanupAllEmbeddedFieldsAllEntityTypes();
      
      res.status(200).json({
        status: "success",
        message: "Removed all embedded relationship fields",
        data: results
      });
    } catch (error) {
      throw new AppError(`Failed to clean up embedded fields: ${error.message}`, 500);
    }
  }
};

// Create a wrapped version of the controller with error handling
const enhancedController = {};

// Wrap all methods with error handling
Object.entries(migrationController).forEach(([methodName, method]) => {
  // Convert method name to operation description (e.g., migrateAllItems -> migrate all items)
  const operation = methodName
    .replace(/([A-Z])/g, " $1")
    .toLowerCase()
    .trim();

  enhancedController[methodName] = withErrorHandling(method, operation);
});

module.exports = enhancedController;