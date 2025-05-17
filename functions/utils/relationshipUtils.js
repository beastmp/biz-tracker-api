/**
 * Relationship Utilities Module
 *
 * This module provides utility functions for creating, retrieving, and managing
 * relationships between different entity types in the application. It abstracts
 * the complexity of working with the relationship repository and provides
 * higher-level functions for common relationship operations.
 *
 * @module relationshipUtils
 * @requires ../providers/repositoryFactory
 * @requires ./transactionUtils
 */
const {getRelationshipRepository} = require("../providers/repositoryFactory");
const {withTransaction} = require("./transactionUtils");

/**
 * Creates a product-material relationship between two items
 *
 * @async
 * @param {string} productId - ID of the product (primary entity)
 * @param {string} materialId - ID of the material (secondary entity)
 * @param {Object} measurements - Quantity, weight, or other measurements
 * @param {number} [measurements.quantity] - Quantity of material used in product
 * @param {number} [measurements.weight] - Weight of material used in product
 * @param {Object} [transaction=null] - Optional transaction object for atomicity
 * @return {Promise<Object>} The created relationship object
 *
 * @example
 * // Create a relationship showing a product uses 2 units of a material
 * const relationship = await addProductMaterialRelationship(
 *   "product123",
 *   "material456",
 *   { quantity: 2 }
 * );
 */
const addProductMaterialRelationship = async (
    productId,
    materialId,
    measurements,
    transaction = null,
) => {
  const relationshipRepo = getRelationshipRepository();

  return await relationshipRepo.create({
    primaryId: productId,
    primaryType: "Item",
    secondaryId: materialId,
    secondaryType: "Item",
    relationshipType: "product_material",
    measurements,
  }, transaction);
};

/**
 * Creates a derived item relationship to show that one item is derived from
 * another (such as when an item is broken down or processed into new items)
 *
 * @async
 * @param {string} derivedItemId - ID of the derived item (primary entity)
 * @param {string} sourceItemId - ID of the source item (secondary entity)
 * @param {Object} measurements - Conversion measurements between the items
 * @param {number} [measurements.quantity] - Quantity derived from source
 * @param {number} [measurements.conversionRatio] - Conversion ratio used
 * @param {Object} [transaction=null] - Optional transaction object for atomicity
 * @return {Promise<Object>} The created relationship object
 *
 * @example
 * // Create a relationship showing an item was derived from another
 * const relationship = await addDerivedItemRelationship(
 *   "derivedItem789",
 *   "sourceItem456",
 *   { quantity: 1, conversionRatio: 0.75 }
 * );
 */
const addDerivedItemRelationship = async (
    derivedItemId,
    sourceItemId,
    measurements,
    transaction = null,
) => {
  const relationshipRepo = getRelationshipRepository();

  return await relationshipRepo.create({
    primaryId: derivedItemId,
    primaryType: "Item",
    secondaryId: sourceItemId,
    secondaryType: "Item",
    relationshipType: "derived",
    measurements,
  }, transaction);
};

/**
 * Add a purchase-item relationship
 * @param {string} purchaseId - The purchase ID
 * @param {string} itemId - The item ID
 * @param {Object} measurements - Quantity, weight, etc.
 * @param {Object} attributes - Purchase-specific attributes
 * @param {Object} transaction - Optional transaction
 * @return {Promise<Object>} The created relationship
 */
const addPurchaseItemRelationship = async (
    purchaseId,
    itemId,
    measurements,
    attributes,
    transaction = null,
) => {
  const relationshipRepo = getRelationshipRepository();

  return await relationshipRepo.create({
    primaryId: purchaseId,
    primaryType: "Purchase",
    secondaryId: itemId,
    secondaryType: "Item",
    relationshipType: "purchase_item",
    measurements,
    purchaseItemAttributes: attributes,
  }, transaction);
};

/**
 * Add a purchase-asset relationship
 * @param {string} purchaseId - The purchase ID
 * @param {string} assetId - The asset ID
 * @param {Object} attributes - Asset-specific attributes
 * @param {Object} transaction - Optional transaction
 * @return {Promise<Object>} The created relationship
 */
const addPurchaseAssetRelationship = async (
    purchaseId,
    assetId,
    attributes,
    transaction = null,
) => {
  const relationshipRepo = getRelationshipRepository();

  return await relationshipRepo.create({
    primaryId: purchaseId,
    primaryType: "Purchase",
    secondaryId: assetId,
    secondaryType: "Asset",
    relationshipType: "purchase_asset",
    measurements: {quantity: 1}, // Assets typically have quantity of 1
    purchaseAssetAttributes: attributes,
  }, transaction);
};

/**
 * Add a sale-item relationship
 * @param {string} saleId - The sale ID
 * @param {string} itemId - The item ID
 * @param {Object} measurements - Quantity, weight, etc.
 * @param {Object} attributes - Sale-specific attributes
 * @param {Object} transaction - Optional transaction
 * @return {Promise<Object>} The created relationship
 */
const addSaleItemRelationship = async (
    saleId,
    itemId,
    measurements,
    attributes,
    transaction = null,
) => {
  const relationshipRepo = getRelationshipRepository();

  return await relationshipRepo.create({
    primaryId: saleId,
    primaryType: "Sale",
    secondaryId: itemId,
    secondaryType: "Item",
    relationshipType: "sale_item",
    measurements,
    saleItemAttributes: attributes,
  }, transaction);
};

/**
 * Update a sale-item relationship
 *
 * Updates the measurements and attributes of an existing sale-item relationship.
 *
 * @async
 * @param {string} relationshipId - ID of the relationship to update
 * @param {Object} updateData - Data to update in the relationship
 * @param {number} [updateData.quantity] - New quantity of items sold
 * @param {Object} [updateData.weight] - New weight information
 * @param {Object} [updateData.dimensions] - New dimension information
 * @param {number} [updateData.unitPrice] - New unit price
 * @param {number} [updateData.totalPrice] - New total price
 * @param {number} [updateData.discountAmount] - New discount amount
 * @param {Date} [updateData.updatedAt] - Update timestamp
 * @param {Object} [transaction=null] - Optional transaction for atomicity
 * @return {Promise<Object>} The updated relationship
 */
const updateSaleItemRelationship = async (
    relationshipId,
    updateData,
    transaction = null,
) => {
  const relationshipRepo = getRelationshipRepository();

  // Format the update data to match the expected structure
  const formattedData = {};

  if (updateData.quantity || updateData.weight || updateData.dimensions) {
    formattedData.measurements = {
      quantity: updateData.quantity,
      weight: updateData.weight,
      dimensions: updateData.dimensions,
    };
  }

  if (updateData.unitPrice || updateData.totalPrice ||
      updateData.discountAmount) {
    formattedData.saleItemAttributes = {
      unitPrice: updateData.unitPrice,
      totalPrice: updateData.totalPrice,
      discountAmount: updateData.discountAmount,
      updatedAt: updateData.updatedAt || new Date(),
    };
  }

  return await relationshipRepo.update(
      relationshipId,
      formattedData,
      transaction,
  );
};

/**
 * Remove a sale-item relationship
 *
 * Deletes a relationship between a sale and an item.
 *
 * @async
 * @param {string} relationshipId - ID of the relationship to delete
 * @param {Object} [transaction=null] - Optional transaction for atomicity
 * @return {Promise<boolean>} Success status
 */
const removeSaleItemRelationship = async (relationshipId, transaction = null) => {
  const relationshipRepo = getRelationshipRepository();
  return await relationshipRepo.delete(relationshipId, transaction);
};

/**
 * Create a new sale with items in a transaction
 *
 * Creates a sale entity and adds item relationships in a single transaction.
 * Also updates inventory quantities for sold items.
 *
 * @async
 * @param {Object} saleData - Sale data to create
 * @param {Array} itemsData - Array of items to add to the sale
 * @param {string} itemsData[].itemId - ID of the item to add
 * @param {number} [itemsData[].quantity=1] - Quantity of the item sold
 * @param {Object} [itemsData[].weight] - Weight information
 * @param {Object} [itemsData[].dimensions] - Dimension information
 * @param {number} itemsData[].unitPrice - Unit price of the item
 * @param {number} itemsData[].totalPrice - Total price for this item
 * @param {number} [itemsData[].discountAmount=0] - Discount amount
 * @return {Promise<Object>} Object with created sale and relationships
 */
const createSaleWithItems = async (saleData, itemsData) => {
  return await withTransaction(async (transaction) => {
    // Get provider factory and repositories
    const providerFactory = getProviderFactory();
    const saleRepo = providerFactory.createSaleRepository();

    // Create the sale
    const sale = await saleRepo.create(saleData, transaction);
    const createdRelationships = [];

    // Add each item as a relationship
    for (const item of itemsData) {
      if (!item.itemId) continue;

      // Create the relationship
      const relationship = await addSaleItemRelationship(
          sale._id,
          item.itemId,
          {
            quantity: item.quantity || 1,
            weight: item.weight,
            dimensions: item.dimensions,
          },
          {
            saleDate: sale.saleDate,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            discountAmount: item.discountAmount || 0,
          },
          transaction,
      );

      createdRelationships.push(relationship);

      // Update inventory if needed
      await updateInventoryForSale(item.itemId, item.quantity || 1, transaction);
    }

    return {
      sale,
      relationships: createdRelationships,
    };
  });
};

/**
 * Update inventory quantities when an item is sold
 *
 * Decreases the inventory quantity of an item after it has been sold.
 * Only applies to items marked as inventory items.
 *
 * @async
 * @param {string} itemId - ID of the item sold
 * @param {number} quantity - Quantity sold
 * @param {Object} [transaction=null] - Optional transaction for atomicity
 * @return {Promise<void>}
 */
const updateInventoryForSale = async (itemId, quantity, transaction = null) => {
  const providerFactory = getProviderFactory();
  const itemRepo = providerFactory.createItemRepository();
  const item = await itemRepo.findById(itemId);

  if (!item) return;

  // Only update inventory for inventory items
  if (item.isInventoryItem === false) return;

  // Calculate new quantities
  const currentQty = item.inventoryQuantity || 0;
  const newQty = Math.max(0, currentQty - quantity);

  // Update the item
  await itemRepo.update(
      itemId,
      {
        inventoryQuantity: newQty,
        updatedAt: new Date(),
      },
      transaction,
  );
};

/**
 * Get product components (materials used in a product)
 * @param {string} productId - Product ID
 * @return {Promise<Array>} Component relationships
 */
const getProductComponents = async (productId) => {
  const relationshipRepo = getRelationshipRepository();
  return await relationshipRepo.findByPrimary(
      productId,
      "Item",
      "product_material",
  );
};

/**
 * Get products using a material
 * @param {string} materialId - Material ID
 * @return {Promise<Array>} Product relationships
 */
const getProductsUsingMaterial = async (materialId) => {
  const relationshipRepo = getRelationshipRepository();
  return await relationshipRepo.findBySecondary(
      materialId,
      "Item",
      "product_material",
  );
};

/**
 * Get source for a derived item
 * @param {string} derivedItemId - Derived item ID
 * @return {Promise<Object|null>} Source relationship or null
 */
const getSourceForDerivedItem = async (derivedItemId) => {
  const relationshipRepo = getRelationshipRepository();
  const relationships = await relationshipRepo.findByPrimary(
      derivedItemId,
      "Item",
      "derived",
  );

  return relationships.length > 0 ? relationships[0] : null;
};

/**
 * Get derived items from a source item
 * @param {string} sourceItemId - Source item ID
 * @return {Promise<Array>} Derived item relationships
 */
const getDerivedItems = async (sourceItemId) => {
  const relationshipRepo = getRelationshipRepository();
  return await relationshipRepo.findBySecondary(
      sourceItemId,
      "Item",
      "derived",
  );
};

/**
 * Get items in a purchase
 * @param {string} purchaseId - The purchase ID
 * @return {Promise<Array>} Array of relationships with purchased items
 */
const getPurchaseItems = async (purchaseId) => {
  const relationshipRepo = getRelationshipRepository();

  return await relationshipRepo.findByPrimary(
      purchaseId,
      "Purchase",
      "purchase_item",
  );
};

/**
 * Get assets in a purchase
 * @param {string} purchaseId - The purchase ID
 * @return {Promise<Array>} Array of relationships with purchased assets
 */
const getPurchaseAssets = async (purchaseId) => {
  const relationshipRepo = getRelationshipRepository();

  return await relationshipRepo.findByPrimary(
      purchaseId,
      "Purchase",
      "purchase_asset",
  );
};

/**
 * Get purchase history for an item
 * @param {string} itemId - The item ID
 * @return {Promise<Array>} Array of relationships with purchases
 */
const getItemPurchaseHistory = async (itemId) => {
  const relationshipRepo = getRelationshipRepository();

  return await relationshipRepo.findBySecondary(
      itemId,
      "Item",
      "purchase_item",
  );
};

/**
 * Get items in a sale
 * @param {string} saleId - The sale ID
 * @return {Promise<Array>} Array of relationships with sold items
 */
const getSaleItems = async (saleId) => {
  const relationshipRepo = getRelationshipRepository();

  return await relationshipRepo.findByPrimary(
      saleId,
      "Sale",
      "sale_item",
  );
};

/**
 * Get sales history for an item
 * @param {string} itemId - The item ID
 * @return {Promise<Array>} Array of relationships with sales
 */
const getItemSalesHistory = async (itemId) => {
  const relationshipRepo = getRelationshipRepository();

  return await relationshipRepo.findBySecondary(
      itemId,
      "Item",
      "sale_item",
  );
};

/**
 * Retrieves all relationships for a specific entity, including both those
 * where it's the primary entity and where it's the secondary entity
 *
 * @async
 * @param {string} entityId - ID of the entity
 * @param {string} entityType - Type of entity ("Item", "Purchase", etc.)
 * @return {Promise<Object>} Object containing primary and secondary relationships
 *
 * @example
 * // Get all relationships for an item
 * const relationships = await getAllEntityRelationships("item123", "Item");
 * // relationships = {
 * //   asPrimary: [...],
 * //   asSecondary: [...]
 * // }
 */
const getAllEntityRelationships = async (entityId, entityType) => {
  const relationshipRepo = getRelationshipRepository();
  return await relationshipRepo.findAllForEntity(entityId, entityType);
};

/**
 * Finds direct relationships between two specific entities
 *
 * @async
 * @param {string} entity1Id - ID of the first entity
 * @param {string} entity1Type - Type of the first entity
 * @param {string} entity2Id - ID of the second entity
 * @param {string} entity2Type - Type of the second entity
 * @return {Promise<Array>} Array of relationship objects connecting the entities
 *
 * @example
 * // Find relationships between a purchase and an item
 * const relationships = await findDirectRelationships(
 *   "purchase123",
 *   "Purchase",
 *   "item456",
 *   "Item"
 * );
 */
const findDirectRelationships = async (
    entity1Id,
    entity1Type,
    entity2Id,
    entity2Type,
) => {
  const relationshipRepo = getRelationshipRepository();
  return await relationshipRepo.findDirectRelationships(
      entity1Id,
      entity1Type,
      entity2Id,
      entity2Type,
  );
};

/**
 * Creates multiple relationships in a single transaction to ensure atomicity
 *
 * @async
 * @param {Array<Object>} relationshipDataArray - Array of relationship data objects
 * @return {Promise<Array>} Array of results with success/failure information
 *
 * @example
 * // Create multiple relationships in one atomic operation
 * const results = await createManyRelationships([
 *   {
 *     primaryId: "product123",
 *     primaryType: "Item",
 *     secondaryId: "material1",
 *     secondaryType: "Item",
 *     relationshipType: "product_material",
 *     measurements: { quantity: 2 }
 *   },
 *   {
 *     primaryId: "product123",
 *     primaryType: "Item",
 *     secondaryId: "material2",
 *     secondaryType: "Item",
 *     relationshipType: "product_material",
 *     measurements: { quantity: 1 }
 *   }
 * ]);
 */
const createManyRelationships = async (relationshipDataArray) => {
  return withTransaction(async (transaction) => {
    const relationshipRepo = getRelationshipRepository();
    const results = [];

    for (const data of relationshipDataArray) {
      try {
        const relationship = await relationshipRepo.create(data, transaction);
        results.push({
          success: true,
          relationship,
        });
      } catch (error) {
        results.push({
          success: false,
          error: error.message,
          data,
        });
      }
    }

    return results;
  });
};

/**
 * Deletes all relationships for a specific entity (both primary and secondary)
 *
 * @async
 * @param {string} entityId - ID of the entity
 * @param {string} entityType - Type of entity ("Item", "Purchase", etc.)
 * @return {Promise<Object>} Object with counts of deleted relationships
 *
 * @example
 * // Delete all relationships for an item before deleting the item itself
 * const result = await deleteAllEntityRelationships("item123", "Item");
 * // result = {
 * //   primaryDeleted: 5,   // where item was primary
 * //   secondaryDeleted: 3, // where item was secondary
 * //   totalDeleted: 8
 * // }
 */
const deleteAllEntityRelationships = async (entityId, entityType) => {
  return withTransaction(async (transaction) => {
    const relationshipRepo = getRelationshipRepository();

    // Delete relationships where entity is primary
    const primaryDeleted = await relationshipRepo.deleteByPrimary(
        entityId,
        entityType,
        null,
        transaction,
    );

    // Delete relationships where entity is secondary
    const secondaryDeleted = await relationshipRepo.deleteBySecondary(
        entityId,
        entityType,
        null,
        transaction,
    );

    return {
      primaryDeleted,
      secondaryDeleted,
      totalDeleted: primaryDeleted + secondaryDeleted,
    };
  });
};

/**
 * Convert an item's legacy relationships to the new relationship model
 *
 * This function handles the migration of an item's relationships from the
 * legacy embedded model to the new separate relationship documents model.
 *
 * @async
 * @param {string} itemId - ID of the item whose relationships to convert
 * @return {Promise<Object>} Object containing conversion statistics
 *
 * @example
 * // Migrate an item's relationships
 * const result = await convertItemRelationships("item123");
 * // result = {
 * //   created: 5,  // number of new relationships created
 * //   errors: [],  // any errors that occurred during conversion
 * //   status: "success"
 * // }
 */
const convertItemRelationships = async (itemId) => {
  const relationshipRepo = getRelationshipRepository();
  return await relationshipRepo.convertLegacyRelationships(itemId, "Item");
};

/**
 * Convert all relationships for a purchase to the new relationship model
 *
 * This function migrates purchase-related relationships (with items and assets)
 * from the legacy embedded model to the new relationship documents model.
 *
 * @async
 * @param {string} purchaseId - ID of the purchase whose relationships to convert
 * @return {Promise<Object>} Object containing conversion statistics
 *
 * @example
 * // Migrate a purchase's relationships
 * const result = await convertPurchaseRelationships("purchase456");
 * // result = {
 * //   created: 3,  // number of new relationships created
 * //   errors: [],  // any errors that occurred during conversion
 * //   status: "success"
 * // }
 */
const convertPurchaseRelationships = async (purchaseId) => {
  const relationshipRepo = getRelationshipRepository();
  return await relationshipRepo.convertLegacyRelationships(
      purchaseId,
      "Purchase",
  );
};

/**
 * Convert all relationships for a sale to the new relationship model
 *
 * This function migrates sale-related relationships (primarily with items)
 * from the legacy embedded model to the new relationship documents model.
 *
 * @async
 * @param {string} saleId - ID of the sale whose relationships to convert
 * @return {Promise<Object>} Object containing conversion statistics
 *
 * @example
 * // Migrate a sale's relationships
 * const result = await convertSaleRelationships("sale789");
 */
const convertSaleRelationships = async (saleId) => {
  const relationshipRepo = getRelationshipRepository();
  return await relationshipRepo.convertLegacyRelationships(saleId, "Sale");
};

/**
 * Convert all relationships for an asset to the new relationship model
 *
 * This function migrates asset-related relationships (primarily with purchases)
 * from the legacy embedded model to the new relationship documents model.
 *
 * @async
 * @param {string} assetId - ID of the asset whose relationships to convert
 * @return {Promise<Object>} Object containing conversion statistics
 */
const convertAssetRelationships = async (assetId) => {
  const relationshipRepo = getRelationshipRepository();
  return await relationshipRepo.convertLegacyRelationships(assetId, "Asset");
};

/**
 * Retrieves statistics about relationships in the system
 *
 * Collects and returns information about the total number of relationships,
 * breakdown by relationship types, entity types, etc.
 *
 * @async
 * @return {Promise<Object>} Comprehensive statistics about relationships
 *
 * @example
 * // Get statistics about all relationships in the system
 * const stats = await getRelationshipStatistics();
 * // stats = {
 * //   totalCount: 1250,
 * //   byType: {
 * //     "product_material": 342,
 * //     "purchase_item": 583,
 * //     ...
 * //   },
 * //   byEntityType: {
 * //     "Item": 895,
 * //     "Purchase": 320,
 * //     ...
 * //   }
 * // }
 */
const getRelationshipStatistics = async () => {
  const relationshipRepo = getRelationshipRepository();
  return await relationshipRepo.getStatistics();
};

module.exports = {
  // Create relationship functions
  addProductMaterialRelationship,
  addDerivedItemRelationship,
  addPurchaseItemRelationship,
  addPurchaseAssetRelationship,
  addSaleItemRelationship,
  createManyRelationships,

  // Retrieve relationship functions
  getProductComponents,
  getProductsUsingMaterial,
  getSourceForDerivedItem,
  getDerivedItems,
  getPurchaseItems,
  getPurchaseAssets,
  getItemPurchaseHistory,
  getSaleItems,
  getItemSalesHistory,
  getAllEntityRelationships,
  findDirectRelationships,
  getRelationshipStatistics,

  // Delete relationship functions
  deleteAllEntityRelationships,

  // Conversion functions
  convertItemRelationships,
  convertPurchaseRelationships,
  convertSaleRelationships,
  convertAssetRelationships,

  // Sale relationship functions
  updateSaleItemRelationship,
  removeSaleItemRelationship,
  createSaleWithItems,
  updateInventoryForSale,
};
