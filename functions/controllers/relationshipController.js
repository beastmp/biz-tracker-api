/**
 * Generic Relationship Controller
 * Centralizes all relationship operations without backwards compatibility
 */
const {getProviderFactory} = require("../providers");
const {withTransaction} = require("../utils/transactionUtils");
const {AppError, ValidationError} = require("../validation/errors");

/**
 * Get the relationship repository instance
 * @return {Object} Relationship repository instance
 */
const getRelationshipRepo = () => {
  return getProviderFactory().getRelationshipRepository();
};

/**
 * Attributes mapping for different relationship types
 * Maps relationship types to their specific attribute fields
 */
const ATTRIBUTE_MAPPING = {
  "purchase_item": "purchaseItemAttributes",
  "purchase_asset": "purchaseAssetAttributes",
  "sale_item": "saleItemAttributes",
};

/**
 * Wrap controller methods with standard error handling
 * @param {Function} method - Method to wrap with error handling
 * @param {string} operation - Description of the operation
 * @return {Function} Error-handled function
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
 * Generic relationship controller with centralized operations
 */
const relationshipController = {
  /**
   * Create a relationship between two entities
   * @param {string} primaryId - ID of the primary entity
   * @param {string} primaryType - Type of the primary entity
   * @param {string} secondaryId - ID of the secondary entity
   * @param {string} secondaryType - Type of the secondary entity
   * @param {string} relationshipType - Type of relationship
   * @param {Object} measurements - Measurements data (quantity, weight, etc.)
   * @param {Object} attributes - Type-specific attributes for the relationship
   * @param {Object} transaction - Optional transaction for atomic operations
   * @return {Promise<Object>} The created relationship
   */
  async createRelationship(
      primaryId,
      primaryType,
      secondaryId,
      secondaryType,
      relationshipType,
      measurements = {},
      attributes = {},
      transaction = null,
  ) {
    if (!primaryId || !primaryType || !secondaryId || !secondaryType) {
      throw new ValidationError(
          "Missing required relationship data",
          ["primaryId", "primaryType", "secondaryId", "secondaryType"],
      );
    }

    const relationshipRepo = getRelationshipRepo();

    // Create relationship data
    const relationshipData = {
      primaryId,
      primaryType,
      secondaryId,
      secondaryType,
      relationshipType,
      measurements: measurements || {},
    };

    // Add appropriate attributes based on relationship type
    const attributeField = ATTRIBUTE_MAPPING[relationshipType];
    if (attributeField && attributes) {
      relationshipData[attributeField] = attributes;
    }

    // If transaction is provided, use it, otherwise create directly
    if (transaction) {
      return await relationshipRepo.create(relationshipData, transaction);
    } else {
      return await relationshipRepo.create(relationshipData);
    }
  },

  /**
   * Create a relationship with transaction support
   * Creates the relationship inside a transaction and handles rollback on error
   * @param {Object} relationshipData - Complete relationship data
   * @return {Promise<Object>} The created relationship
   */
  async createRelationshipWithTransaction(relationshipData) {
    return await withTransaction(async (transaction) => {
      const relationshipRepo = getRelationshipRepo();
      return await relationshipRepo.create(relationshipData, transaction);
    });
  },

  /**
   * Update an existing relationship
   * @param {string} relationshipId - ID of the relationship to update
   * @param {Object} updateData - Data to update
   * @param {Object} transaction - Optional transaction for atomic operations
   * @return {Promise<Object>} The updated relationship
   */
  async updateRelationship(relationshipId, updateData, transaction = null) {
    const relationshipRepo = getRelationshipRepo();

    if (transaction) {
      return await relationshipRepo.update(relationshipId, updateData, transaction);
    } else {
      return await relationshipRepo.update(relationshipId, updateData);
    }
  },

  /**
   * Delete a relationship
   * @param {string} relationshipId - ID of the relationship to delete
   * @param {Object} transaction - Optional transaction for atomic operations
   * @return {Promise<boolean>} Success status
   */
  async deleteRelationship(relationshipId, transaction = null) {
    const relationshipRepo = getRelationshipRepo();

    if (transaction) {
      return await relationshipRepo.delete(relationshipId, transaction);
    } else {
      return await relationshipRepo.delete(relationshipId);
    }
  },

  /**
   * Bulk delete relationships by filter
   * @param {Object} filter - Filter to match relationships to delete
   * @param {Object} transaction - Optional transaction for atomic operations
   * @return {Promise<number>} Number of deleted relationships
   */
  async bulkDeleteRelationships(filter, transaction = null) {
    const relationshipRepo = getRelationshipRepo();

    if (transaction) {
      return await relationshipRepo.deleteMany(filter, transaction);
    } else {
      return await relationshipRepo.deleteMany(filter);
    }
  },

  /**
   * Get a relationship by ID
   * @param {string} relationshipId - ID of the relationship
   * @return {Promise<Object>} The relationship
   */
  async getRelationshipById(relationshipId) {
    const relationshipRepo = getRelationshipRepo();
    return await relationshipRepo.findById(relationshipId);
  },

  /**
   * Find relationships by primary entity
   * @param {string} primaryId - ID of the primary entity
   * @param {string} primaryType - Type of the primary entity
   * @param {string} relationshipType - Optional relationship type filter
   * @return {Promise<Array>} Array of relationships
   */
  async findByPrimary(primaryId, primaryType, relationshipType = null) {
    const relationshipRepo = getRelationshipRepo();
    return await relationshipRepo.findByPrimary(
        primaryId,
        primaryType,
        relationshipType,
    );
  },

  /**
   * Find relationships by secondary entity
   * @param {string} secondaryId - ID of the secondary entity
   * @param {string} secondaryType - Type of the secondary entity
   * @param {string} relationshipType - Optional relationship type filter
   * @return {Promise<Array>} Array of relationships
   */
  async findBySecondary(secondaryId, secondaryType, relationshipType = null) {
    const relationshipRepo = getRelationshipRepo();
    return await relationshipRepo.findBySecondary(
        secondaryId,
        secondaryType,
        relationshipType,
    );
  },

  /**
   * Find relationships by custom filter
   * @param {Object} filter - Filter criteria
   * @return {Promise<Array>} Array of relationships
   */
  async findByFilter(filter) {
    const relationshipRepo = getRelationshipRepo();
    return await relationshipRepo.findByFilter(filter);
  },

  /**
   * Create a product-material relationship
   * @param {string} productId - The product item ID
   * @param {string} materialId - The material item ID
   * @param {Object} measurements - Quantity, weight, etc.
   * @return {Promise<Object>} The created relationship
   */
  async createProductMaterialRelationship(productId, materialId, measurements) {
    return await this.createRelationship(
        productId,
        "Item",
        materialId,
        "Item",
        "product_material",
        measurements,
    );
  },

  /**
   * Create a derived item relationship
   * @param {string} derivedItemId - The derived item ID
   * @param {string} sourceItemId - The source item ID
   * @param {Object} measurements - Quantity, weight, etc.
   * @return {Promise<Object>} The created relationship
   */
  async createDerivedItemRelationship(derivedItemId, sourceItemId, measurements) {
    return await this.createRelationship(
        derivedItemId,
        "Item",
        sourceItemId,
        "Item",
        "derived",
        measurements,
    );
  },

  /**
   * Create a purchase-item relationship
   * @param {string} purchaseId - The purchase ID
   * @param {string} itemId - The item ID
   * @param {Object} measurements - Quantity, weight, etc.
   * @param {Object} attributes - Purchase-specific attributes
   * @return {Promise<Object>} The created relationship
   */
  async createPurchaseItemRelationship(
      purchaseId,
      itemId,
      measurements,
      attributes,
  ) {
    return await this.createRelationship(
        purchaseId,
        "Purchase",
        itemId,
        "Item",
        "purchase_item",
        measurements,
        attributes,
    );
  },

  /**
   * Create a purchase-asset relationship
   * @param {string} purchaseId - The purchase ID
   * @param {string} assetId - The asset ID
   * @param {Object} attributes - Asset-specific attributes
   * @return {Promise<Object>} The created relationship
   */
  async createPurchaseAssetRelationship(purchaseId, assetId, attributes) {
    return await this.createRelationship(
        purchaseId,
        "Purchase",
        assetId,
        "Asset",
        "purchase_asset",
        {quantity: 1}, // Assets typically have quantity of 1
        attributes,
    );
  },

  /**
   * Create a sale-item relationship
   * @param {string} saleId - The sale ID
   * @param {string} itemId - The item ID
   * @param {Object} measurements - Quantity, weight, etc.
   * @param {Object} attributes - Sale-specific attributes
   * @return {Promise<Object>} The created relationship
   */
  async createSaleItemRelationship(saleId, itemId, measurements, attributes) {
    return await this.createRelationship(
        saleId,
        "Sale",
        itemId,
        "Item",
        "sale_item",
        measurements,
        attributes,
    );
  },

  /**
   * Get all components used in a product
   * @param {string} productId - The product item ID
   * @return {Promise<Array>} Array of relationships with material items
   */
  async getProductComponents(productId) {
    return await this.findByPrimary(productId, "Item", "product_material");
  },

  /**
   * Get all products using a specific material
   * @param {string} materialId - The material item ID
   * @return {Promise<Array>} Array of relationships with product items
   */
  async getProductsUsingMaterial(materialId) {
    return await this.findBySecondary(materialId, "Item", "product_material");
  },

  /**
   * Get source item for a derived item
   * @param {string} derivedItemId - The derived item ID
   * @return {Promise<Object|null>} The source relationship or null
   */
  async getSourceForDerivedItem(derivedItemId) {
    const relationships = await this.findByPrimary(
        derivedItemId,
        "Item",
        "derived",
    );
    return relationships.length > 0 ? relationships[0] : null;
  },

  /**
   * Get derived items from a source item
   * @param {string} sourceItemId - The source item ID
   * @return {Promise<Array>} Array of relationships with derived items
   */
  async getDerivedItems(sourceItemId) {
    return await this.findBySecondary(sourceItemId, "Item", "derived");
  },

  /**
   * Get items in a purchase
   * @param {string} purchaseId - The purchase ID
   * @return {Promise<Array>} Array of relationships with purchased items
   */
  async getPurchaseItems(purchaseId) {
    return await this.findByPrimary(purchaseId, "Purchase", "purchase_item");
  },

  /**
   * Get assets in a purchase
   * @param {string} purchaseId - The purchase ID
   * @return {Promise<Array>} Array of relationships with purchased assets
   */
  async getPurchaseAssets(purchaseId) {
    return await this.findByPrimary(purchaseId, "Purchase", "purchase_asset");
  },

  /**
   * Get purchase history for an item
   * @param {string} itemId - The item ID
   * @return {Promise<Array>} Array of relationships with purchases
   */
  async getItemPurchaseHistory(itemId) {
    return await this.findBySecondary(itemId, "Item", "purchase_item");
  },

  /**
   * Get items in a sale
   * @param {string} saleId - The sale ID
   * @return {Promise<Array>} Array of relationships with sold items
   */
  async getSaleItems(saleId) {
    return await this.findByPrimary(saleId, "Sale", "sale_item");
  },

  /**
   * Get sales history for an item
   * @param {string} itemId - The item ID
   * @return {Promise<Array>} Array of relationships with sales
   */
  async getItemSalesHistory(itemId) {
    return await this.findBySecondary(itemId, "Item", "sale_item");
  },

  /**
   * Add bulk relationships in a transaction
   * @param {Array} relationships - Array of relationship data objects
   * @return {Promise<Array>} Array of created relationships
   */
  async bulkCreateRelationships(relationships) {
    return await withTransaction(async (transaction) => {
      const relationshipRepo = getRelationshipRepo();
      const createdRelationships = [];

      for (const relationshipData of relationships) {
        const created = await relationshipRepo.create(
            relationshipData,
            transaction,
        );
        createdRelationships.push(created);
      }

      return createdRelationships;
    });
  },

  /**
   * Replace all relationships for an entity
   * Deletes existing relationships and creates new ones
   * @param {string} entityId - The entity ID
   * @param {string} entityType - The entity type
   * @param {string} relationshipType - The relationship type
   * @param {Array} newRelationships - Array of new relationship data
   * @param {boolean} isPrimary - Whether the entity is primary (true) or secondary (false)
   * @return {Promise<Object>} Result with deleted and created counts
   */
  async replaceRelationships(
      entityId,
      entityType,
      relationshipType,
      newRelationships,
      isPrimary = true,
  ) {
    return await withTransaction(async (transaction) => {
      const relationshipRepo = getRelationshipRepo();

      // Build filter to find existing relationships
      const filter = {
        relationshipType,
      };

      if (isPrimary) {
        filter.primaryId = entityId;
        filter.primaryType = entityType;
      } else {
        filter.secondaryId = entityId;
        filter.secondaryType = entityType;
      }

      // Delete existing relationships
      const deleteCount = await relationshipRepo.deleteMany(
          filter,
          transaction,
      );

      // Create new relationships
      const createdRelationships = [];
      for (const relationshipData of newRelationships) {
        const created = await relationshipRepo.create(
            relationshipData,
            transaction,
        );
        createdRelationships.push(created);
      }

      return {
        deleted: deleteCount,
        created: createdRelationships.length,
        relationships: createdRelationships,
      };
    });
  },

  /**
   * Process entity relationships based on entity type and data
   *
   * @async
   * @param {string} entityId - ID of the newly created entity
   * @param {string} entityType - Type of entity (Sale, Purchase, Item, etc.)
   * @param {Object} entityData - Data used to create the entity
   * @param {Object} [transaction=null] - Optional transaction for atomicity
   * @return {Promise<Array>} Array of created relationships
   */
  async processEntityRelationships(
      entityId,
      entityType,
      entityData,
      transaction = null,
  ) {
    const createdRelationships = [];

    // Process relationships based on entity type and data
    switch (entityType.toLowerCase()) {
      case "sale": {
        // Handle sale-item relationships if items are provided
        if (entityData.items && Array.isArray(entityData.items)) {
          for (const item of entityData.items) {
            if (!item.itemId) continue;

            const relationship = await this.createSaleItemRelationship(
                entityId,
                item.itemId,
                {
                  quantity: item.quantity || 1,
                  weight: item.weight,
                  dimensions: item.dimensions,
                },
                {
                  saleDate: entityData.saleDate,
                  unitPrice: item.unitPrice,
                  totalPrice: item.totalPrice,
                  discountAmount: item.discountAmount || 0,
                },
                transaction,
            );

            createdRelationships.push(relationship);

            // Update inventory if needed
            if (item.updateInventory !== false) {
              // Get itemRepository to update inventory quantity
              const providerFactory = getProviderFactory();
              const itemRepository = providerFactory.getItemRepository();
              const itemRecord = await itemRepository.findById(item.itemId);

              if (itemRecord && itemRecord.isInventoryItem !== false) {
                const currentQty = itemRecord.inventoryQuantity || 0;
                const newQty = Math.max(0, currentQty - (item.quantity || 1));

                await itemRepository.update(
                    item.itemId,
                    {
                      inventoryQuantity: newQty,
                      updatedAt: new Date(),
                    },
                    transaction,
                );
              }
            }
          }
        }
        break;
      }

      case "purchase": {
        // Handle purchase-item relationships
        if (entityData.items && Array.isArray(entityData.items)) {
          const providerFactory = getProviderFactory();
          const assetRepository = providerFactory.getAssetRepository();

          // Group items by purchase type for efficient processing
          const itemsByType = {
            asset: [],
            inventory: [],
            expense: [],
            service: [],
            untracked: [],
          };

          // First pass: create all purchase-item relationships and categorize
          for (const item of entityData.items) {
            if (!item.itemId) continue;

            // Determine the purchase type (default to inventory if not specified)
            const purchaseType = item.purchaseType || "inventory";

            // Create the purchase-item relationship
            const relationship = await this.createPurchaseItemRelationship(
                entityId,
                item.itemId,
                {
                  quantity: item.quantity || 1,
                  weight: item.weight,
                  dimensions: item.dimensions,
                },
                {
                  purchaseDate: entityData.purchaseDate,
                  unitPrice: item.unitPrice,
                  totalPrice: item.totalPrice,
                  purchaseType: purchaseType,
                  assetInfo: item.assetInfo || {},
                },
                transaction,
            );

            // Add relationship to the list of created relationships
            createdRelationships.push(relationship);

            // Add to the appropriate category for further processing
            if (itemsByType[purchaseType]) {
              itemsByType[purchaseType].push({
                item,
                relationship,
              });
            } else {
              // Default to inventory if type is not recognized
              itemsByType.inventory.push({
                item,
                relationship,
              });
            }
          }

          // Second pass: auto-create assets for items marked as asset type
          // Only process assets if the purchase is marked as received
          if (entityData.receivingStatus === "received" && itemsByType.asset.length > 0) {
            for (const {item, relationship} of itemsByType.asset) {
              const assetInfo = item.assetInfo || {};

              // Create a new asset record
              const asset = await assetRepository.create({
                name: assetInfo.name || `Asset from purchase ${entityId}`,
                category: assetInfo.category || "Equipment",
                initialCost: item.totalPrice || 0,
                currentValue: item.totalPrice || 0,
                status: "active",
                location: assetInfo.location,
                assignedTo: assetInfo.assignedTo,
                manufacturer: assetInfo.manufacturer,
                model: assetInfo.model,
                serialNumber: assetInfo.serialNumber,
                isInventoryItem: false,
                purchaseDate: entityData.purchaseDate,
                notes: assetInfo.notes || `Auto-created from purchase ${entityId}`,
              }, transaction);

              // Create relationship between purchase and the new asset
              const assetRelationship = await this.createPurchaseAssetRelationship(
                  entityId,
                  asset._id,
                  {
                    purchaseDate: entityData.purchaseDate,
                    purchasePrice: item.totalPrice || 0,
                    itemId: item.itemId, // Reference to the original item
                    quantity: item.quantity || 1,
                  },
                  transaction,
              );

              createdRelationships.push(assetRelationship);
            }
          }
        }

        // Handle explicit purchase-asset relationships (separate from auto-created ones)
        if (entityData.assets && Array.isArray(entityData.assets)) {
          for (const asset of entityData.assets) {
            if (!asset.assetId) continue;

            const relationship = await this.createPurchaseAssetRelationship(
                entityId,
                asset.assetId,
                {
                  purchaseDate: entityData.purchaseDate,
                  purchasePrice: asset.purchasePrice,
                },
                transaction,
            );

            createdRelationships.push(relationship);
          }
        }
        break;
      }

      case "item": {
        // Handle product-material relationships
        if (entityData.components && Array.isArray(entityData.components)) {
          for (const component of entityData.components) {
            if (!component.materialId) continue;

            const relationship = await this.createProductMaterialRelationship(
                entityId,
                component.materialId,
                {
                  quantity: component.quantity || 1,
                  weight: component.weight,
                },
                transaction,
            );

            createdRelationships.push(relationship);
          }
        }

        // Handle derived item relationships
        if (entityData.derivedFrom && entityData.derivedFrom.itemId) {
          const relationship = await this.createDerivedItemRelationship(
              entityId,
              entityData.derivedFrom.itemId,
              {
                quantity: entityData.derivedFrom.quantity || 1,
                conversionRatio: entityData.derivedFrom.conversionRatio,
              },
              transaction,
          );

          createdRelationships.push(relationship);
        }
        break;
      }

      default:
        // No specific relationship handling for other entity types
        break;
    }

    return createdRelationships;
  },

  /**
   * Create entity with its relationships
   *
   * @async
   * @param {string} entityType - Type of entity (Sale, Purchase, Item, etc.)
   * @param {Object} entityData - Data for creating the entity and relationships
   * @return {Promise<Object>} Created entity with its relationships
   */
  async createEntityWithRelationships(entityType, entityData) {
    return await withTransaction(async (transaction) => {
      const providerFactory = getProviderFactory();
      const repository = getRepositoryForEntityType(providerFactory, entityType);

      // Create the entity
      const entity = await repository.create(entityData, transaction);

      // Process relationships for this entity
      const createdRelationships = await this.processEntityRelationships(
          entity._id,
          entityType,
          entityData,
          transaction,
      );

      // Get all relationships for response
      const relationships = {
        asPrimary: createdRelationships.length > 0 ?
            createdRelationships :
            await this.findByPrimary(entity._id, entityType),
        asSecondary: await this.findBySecondary(entity._id, entityType),
      };

      return {
        entity,
        relationships,
      };
    });
  },

  /**
   * Update entity with its relationships
   *
   * @async
   * @param {string} entityId - ID of the entity to update
   * @param {string} entityType - Type of entity (Sale, Purchase, Item, etc.)
   * @param {Object} entityData - Data for updating the entity
   * @return {Promise<Object>} Updated entity with its relationships
   */
  async updateEntityWithRelationships(entityId, entityType, entityData) {
    return await withTransaction(async (transaction) => {
      const providerFactory = getProviderFactory();
      const repository = getRepositoryForEntityType(providerFactory, entityType);

      // Update the entity
      const entity = await repository.update(entityId, entityData, transaction);

      if (!entity) {
        throw new Error(`${entityType} with ID ${entityId} not found`);
      }

      // Get all relationships for response
      const relationships = {
        asPrimary: await this.findByPrimary(entityId, entityType),
        asSecondary: await this.findBySecondary(entityId, entityType),
      };

      return {
        entity,
        relationships,
      };
    });
  },

  /**
   * Delete entity with its relationships
   *
   * @async
   * @param {string} entityId - ID of the entity to delete
   * @param {string} entityType - Type of entity (Sale, Purchase, Item, etc.)
   * @return {Promise<boolean>} Success status
   */
  async deleteEntityWithRelationships(entityId, entityType) {
    return await withTransaction(async (transaction) => {
      const providerFactory = getProviderFactory();
      const repository = getRepositoryForEntityType(providerFactory, entityType);

      // First, verify the entity exists
      const entity = await repository.findById(entityId);
      if (!entity) {
        throw new Error(`${entityType} with ID ${entityId} not found`);
      }

      // Delete all relationships for this entity
      await this.bulkDeleteRelationships(
          {primaryId: entityId, primaryType: entityType},
          transaction,
      );

      await this.bulkDeleteRelationships(
          {secondaryId: entityId, secondaryType: entityType},
          transaction,
      );

      // Delete the entity
      await repository.delete(entityId, transaction);

      return true;
    });
  },

  /**
   * Get the appropriate repository for an entity type
   *
   * @param {Object} providerFactory - The provider factory instance
   * @param {string} entityType - Type of entity (Sale, Purchase, Item, etc.)
   * @return {Object} Repository for the entity type
   */
  getRepositoryForEntityType(providerFactory, entityType) {
    switch (entityType.toLowerCase()) {
      case "item":
        return providerFactory.getItemRepository();
      case "sale":
        return providerFactory.getSaleRepository();
      case "purchase":
        return providerFactory.getPurchaseRepository();
      case "asset":
        return providerFactory.getAssetRepository();
      case "relationship":
        return providerFactory.getRelationshipRepository();
      default:
        throw new Error(`Repository not found for entity type: ${entityType}`);
    }
  },
};

// Create a wrapped version of the controller with error handling
const enhancedController = {};

// Wrap all methods with error handling
Object.entries(relationshipController).forEach(([methodName, method]) => {
  // Convert method name to operation description (e.g., createRelationship -> create relationship)
  const operation = methodName
      .replace(/([A-Z])/g, " $1")
      .toLowerCase()
      .trim();

  enhancedController[methodName] = withErrorHandling(method, operation);
});

module.exports = enhancedController;
