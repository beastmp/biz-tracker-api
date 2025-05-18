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
 * Relationship controller with all methods
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

  /**
   * Convert legacy relationships for a specific entity
   * @param {string} entityId - ID of the entity
   * @param {string} entityType - Type of entity (item, purchase, sale, asset)
   * @return {Promise<Object>} Conversion result
   */
  async convertEntityRelationships(entityId, entityType) {
    if (!entityId || !entityType) {
      throw new ValidationError(
          "Missing required parameters",
          ["entityId", "entityType"]
      );
    }

    // Normalize entity type to match our internal format
    const normalizedType = entityType.charAt(0).toUpperCase() + entityType.slice(1).toLowerCase();
    
    // Get the appropriate repository for this entity type
    const providerFactory = getProviderFactory();
    const repository = this.getRepositoryForEntityType(providerFactory, normalizedType);

    // Find the entity first to make sure it exists
    const entity = await repository.findById(entityId);
    if (!entity) {
      throw new Error(`${normalizedType} with ID ${entityId} not found`);
    }

    console.log(`Converting relationships for ${normalizedType} ${entityId}`);

    // Results tracking
    const result = {
      converted: 0,
      errors: 0,
      details: []
    };

    // Handle conversion based on entity type
    return await withTransaction(async (transaction) => {
      try {
        switch (normalizedType) {
          case "Item": {
            // Convert product-material and derived item relationships
            const legacyComponents = entity.components || [];
            const legacyDerivedFrom = entity.derivedFrom;
            
            // Convert components (product materials)
            for (const component of legacyComponents) {
              try {
                const relationship = await this.createProductMaterialRelationship(
                    entityId,
                    component.materialId,
                    {
                      quantity: component.quantity || 1,
                      weight: component.weight
                    },
                    transaction
                );
                
                result.converted++;
                result.details.push({
                  type: "component",
                  materialId: component.materialId,
                  success: true,
                  relationship: relationship._id
                });
              } catch (error) {
                console.error(`Error converting component ${component.materialId}:`, error);
                result.errors++;
                result.details.push({
                  type: "component",
                  materialId: component.materialId,
                  success: false,
                  error: error.message
                });
              }
            }
            
            // Convert derived-from relationship
            if (legacyDerivedFrom && legacyDerivedFrom.itemId) {
              try {
                const relationship = await this.createDerivedItemRelationship(
                    entityId,
                    legacyDerivedFrom.itemId,
                    {
                      quantity: legacyDerivedFrom.quantity || 1,
                      conversionRatio: legacyDerivedFrom.conversionRatio
                    },
                    transaction
                );
                
                result.converted++;
                result.details.push({
                  type: "derivedFrom",
                  sourceItemId: legacyDerivedFrom.itemId,
                  success: true,
                  relationship: relationship._id
                });
              } catch (error) {
                console.error(`Error converting derivedFrom ${legacyDerivedFrom.itemId}:`, error);
                result.errors++;
                result.details.push({
                  type: "derivedFrom",
                  sourceItemId: legacyDerivedFrom.itemId,
                  success: false,
                  error: error.message
                });
              }
            }
            break;
          }
          
          case "Purchase": {
            // Convert purchase items and assets
            const legacyItems = entity.items || [];
            const legacyAssets = entity.assets || [];
            
            // Convert purchase items
            for (const item of legacyItems) {
              if (!item.itemId) continue;
              
              try {
                const relationship = await this.createPurchaseItemRelationship(
                    entityId,
                    item.itemId,
                    {
                      quantity: item.quantity || 1,
                      weight: item.weight
                    },
                    {
                      purchaseDate: entity.purchaseDate,
                      unitPrice: item.unitPrice,
                      totalPrice: item.totalPrice,
                      purchaseType: item.purchaseType || "inventory"
                    },
                    transaction
                );
                
                result.converted++;
                result.details.push({
                  type: "purchaseItem",
                  itemId: item.itemId,
                  success: true,
                  relationship: relationship._id
                });
              } catch (error) {
                console.error(`Error converting purchase item ${item.itemId}:`, error);
                result.errors++;
                result.details.push({
                  type: "purchaseItem",
                  itemId: item.itemId,
                  success: false,
                  error: error.message
                });
              }
            }
            
            // Convert purchase assets
            for (const asset of legacyAssets) {
              if (!asset.assetId) continue;
              
              try {
                const relationship = await this.createPurchaseAssetRelationship(
                    entityId,
                    asset.assetId,
                    {
                      purchaseDate: entity.purchaseDate,
                      purchasePrice: asset.purchasePrice
                    },
                    transaction
                );
                
                result.converted++;
                result.details.push({
                  type: "purchaseAsset",
                  assetId: asset.assetId,
                  success: true,
                  relationship: relationship._id
                });
              } catch (error) {
                console.error(`Error converting purchase asset ${asset.assetId}:`, error);
                result.errors++;
                result.details.push({
                  type: "purchaseAsset",
                  assetId: asset.assetId,
                  success: false,
                  error: error.message
                });
              }
            }
            break;
          }
          
          case "Sale": {
            // Convert sale items
            const legacyItems = entity.items || [];
            
            for (const item of legacyItems) {
              if (!item.itemId) continue;
              
              try {
                const relationship = await this.createSaleItemRelationship(
                    entityId,
                    item.itemId,
                    {
                      quantity: item.quantity || 1,
                      weight: item.weight
                    },
                    {
                      saleDate: entity.saleDate,
                      unitPrice: item.unitPrice,
                      totalPrice: item.totalPrice,
                      discountAmount: item.discountAmount || 0
                    },
                    transaction
                );
                
                result.converted++;
                result.details.push({
                  type: "saleItem",
                  itemId: item.itemId,
                  success: true,
                  relationship: relationship._id
                });
              } catch (error) {
                console.error(`Error converting sale item ${item.itemId}:`, error);
                result.errors++;
                result.details.push({
                  type: "saleItem",
                  itemId: item.itemId,
                  success: false,
                  error: error.message
                });
              }
            }
            break;
          }
          
          case "Asset":
            // No relationships to convert for assets currently
            result.details.push({
              type: "info",
              message: "No relationships to convert for assets"
            });
            break;
            
          default:
            throw new Error(`Unsupported entity type for conversion: ${normalizedType}`);
        }
        
        // Mark the entity as having converted relationships
        await repository.update(
            entityId,
            { 
              relationshipsConverted: true,
              updatedAt: new Date()
            },
            transaction
        );
        
        return result;
      } catch (error) {
        console.error(`Error in relationship conversion for ${normalizedType} ${entityId}:`, error);
        throw error;
      }
    });
  },

  /**
   * Convert all relationships for a specific entity type
   * @param {string} entityType - Type of entity (item, purchase, sale, asset)
   * @return {Promise<Object>} Conversion result with statistics
   */
  async convertAllEntityTypeRelationships(entityType) {
    // Normalize entity type to match our internal format
    const normalizedType = entityType.charAt(0).toUpperCase() + entityType.slice(1).toLowerCase();
    
    // Get the appropriate repository for this entity type
    const providerFactory = getProviderFactory();
    const repository = this.getRepositoryForEntityType(providerFactory, normalizedType);
    
    // Get all entities of this type
    const entities = await repository.findByFilter({});
    
    console.log(`Found ${entities.length} ${normalizedType} entities to process`);
    
    // Results tracking
    const result = {
      total: entities.length,
      processed: 0,
      converted: 0,
      errors: 0,
      details: []
    };
    
    // Process each entity
    for (const entity of entities) {
      try {
        const entityResult = await this.convertEntityRelationships(
            entity._id,
            normalizedType
        );
        
        result.processed++;
        result.converted += entityResult.converted;
        result.errors += entityResult.errors;
        
        // Only add detailed results for entities with conversions or errors
        if (entityResult.converted > 0 || entityResult.errors > 0) {
          result.details.push({
            entityId: entity._id,
            entityType: normalizedType,
            converted: entityResult.converted,
            errors: entityResult.errors
          });
        }
        
        // Log progress periodically
        if (result.processed % 10 === 0 || result.processed === result.total) {
          console.log(`Processed ${result.processed}/${result.total} ${normalizedType} entities`);
        }
      } catch (error) {
        console.error(`Error processing ${normalizedType} ${entity._id}:`, error);
        result.processed++;
        result.errors++;
        result.details.push({
          entityId: entity._id,
          entityType: normalizedType,
          error: error.message
        });
      }
    }
    
    console.log(`Completed conversion for ${normalizedType}: ${result.converted} relationships converted, ${result.errors} errors`);
    
    return result;
  },

  /**
   * Convert all relationships asynchronously as a background job
   * @param {string} jobId - Job ID for tracking progress
   * @return {Promise<void>}
   */
  async convertAllRelationshipsAsync(jobId) {
    try {
      console.log(`Starting async conversion job ${jobId}`);
      
      // Get provider for job status updates
      const providerFactory = getProviderFactory();
      const cacheProvider = providerFactory.getCacheProvider();
      
      // Update job status function
      const updateJobStatus = async (phase, status, progress, error = null) => {
        const now = new Date().toISOString();
        const jobStatus = {
          jobId,
          status,
          startTime: (await cacheProvider.get(`job:${jobId}`)).startTime || now,
          lastUpdated: now,
          progress: {
            ...progress,
            currentPhase: phase,
            percentComplete: Math.floor((progress.totalConverted / Math.max(1, progress.totalConverted + progress.remainingToProcess)) * 100)
          }
        };
        
        if (status === "completed" || status === "failed") {
          jobStatus.endTime = now;
        }
        
        if (error) {
          jobStatus.error = error;
        }
        
        await cacheProvider.set(`job:${jobId}`, JSON.stringify(jobStatus));
      };
      
      // Entity types to process
      const entityTypes = ["item", "purchase", "sale", "asset"];
      
      // Initialize progress tracking
      const progress = {
        items: { converted: 0, errors: 0 },
        purchases: { converted: 0, errors: 0 },
        sales: { converted: 0, errors: 0 },
        assets: { converted: 0, errors: 0 },
        totalConverted: 0,
        totalErrors: 0,
        remainingToProcess: Number.MAX_SAFE_INTEGER, // Will be updated in first phase
        currentPhase: "starting",
        percentComplete: 0
      };
      
      // Process each entity type
      for (let i = 0; i < entityTypes.length; i++) {
        const entityType = entityTypes[i];
        const phase = `${entityType}s (${i + 1}/${entityTypes.length})`;
        
        try {
          console.log(`Starting conversion for ${entityType}s`);
          await updateJobStatus(phase, "running", progress);
          
          // Convert all relationships for this entity type
          const result = await this.convertAllEntityTypeRelationships(entityType);
          
          // Update progress
          progress[`${entityType}s`] = {
            converted: result.converted,
            errors: result.errors
          };
          
          progress.totalConverted += result.converted;
          progress.totalErrors += result.errors;
          progress.remainingToProcess = entityTypes.slice(i + 1).length * result.total;
          
          await updateJobStatus(phase, "running", progress);
          
          console.log(`Completed ${entityType}s phase: ${result.converted} converted, ${result.errors} errors`);
        } catch (error) {
          console.error(`Error in ${phase} phase:`, error);
          progress.totalErrors++;
          await updateJobStatus(phase, "running", progress, error.message);
        }
      }
      
      // Job completed
      progress.percentComplete = 100;
      progress.currentPhase = "completed";
      await updateJobStatus("completed", "completed", progress);
      
      console.log(`Conversion job ${jobId} completed: ${progress.totalConverted} relationships converted, ${progress.totalErrors} errors`);
    } catch (error) {
      console.error(`Fatal error in conversion job ${jobId}:`, error);
      
      // Update job status to failed
      try {
        const providerFactory = getProviderFactory();
        const cacheProvider = providerFactory.getCacheProvider();
        const jobStatusJson = await cacheProvider.get(`job:${jobId}`);
        const jobStatus = JSON.parse(jobStatusJson);
        
        jobStatus.status = "failed";
        jobStatus.endTime = new Date().toISOString();
        jobStatus.lastUpdated = new Date().toISOString();
        jobStatus.error = error.message;
        
        await cacheProvider.set(`job:${jobId}`, JSON.stringify(jobStatus));
      } catch (cacheError) {
        console.error(`Failed to update job status for ${jobId}:`, cacheError);
      }
    }
  }
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
