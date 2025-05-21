/**
 * Migration Utilities Module
 *
 * This module provides utilities for migrating data across model versions,
 * particularly for implementing data normalization and structure changes.
 *
 * @module migrationUtils
 * @requires ../providers/repositoryFactory
 * @requires ./transactionUtils
 * @requires ./relationshipUtils
 */
const {
  getItemRepository, 
  getPurchaseRepository,
  getSaleRepository,
  getRelationshipRepository,
} = require("../providers/repositoryFactory");
const { withTransaction } = require("./transactionUtils");
const { createMeasurementConfig } = require("./relationshipUtils");

/**
 * Normalizes measurement data into the standardized structure
 *
 * @param {Object} data - Source measurement data
 * @param {string} defaultMeasurement - Default measurement type if not specified
 * @return {Object} Normalized measurement configuration
 */
const normalizeMeasurement = (data = {}, defaultMeasurement = "quantity") => ({
  measurement: data?.measurement || defaultMeasurement,
  amount: data?.amount || data?.quantity || 0,
  unit: data?.unit || "",
});

/**
 * Migrates a single item to use the normalized measurement structure
 *
 * @async
 * @param {string} itemId - ID of the item to migrate
 * @param {Object} [transaction=null] - Optional transaction object for atomicity
 * @return {Promise<Object>} Updated item object
 */
const migrateItemToNormalizedStructure = async (itemId, transaction = null) => {
  const itemRepo = getItemRepository();
  const item = await itemRepo.findById(itemId);
  
  if (!item) {
    throw new Error(`Item with ID ${itemId} not found`);
  }
  
  // Create normalized measurement structures
  const updatedItem = {
    ...item,
    tracking: normalizeMeasurement(item.tracking, "quantity"),
    price: normalizeMeasurement(item.price || item.selling || item.tracking, item.tracking?.measurement || "quantity"),
    cost: normalizeMeasurement(item.cost || item.tracking, item.tracking?.measurement || "quantity"),
  };
  
  // Update the item with the normalized structure
  return await itemRepo.update(itemId, updatedItem, transaction);
};

/**
 * Migrates all items to use the normalized measurement structure
 *
 * @async
 * @return {Promise<Object>} Migration results
 */
const migrateAllItemsToNormalizedStructure = async () => {
  const itemRepo = getItemRepository();
  const items = await itemRepo.findAll();
  
  const results = {
    total: items.length,
    successful: 0,
    failed: 0,
    errors: [],
  };
  
  for (const item of items) {
    try {
      await migrateItemToNormalizedStructure(item._id);
      results.successful++;
    } catch (error) {
      results.failed++;
      results.errors.push({
        itemId: item._id,
        error: error.message,
      });
    }
  }
  
  return results;
};

/**
 * Migrates a purchase item relationship to use normalized measurements
 *
 * @async
 * @param {string} relationshipId - ID of the relationship to migrate
 * @param {Object} [transaction=null] - Optional transaction object for atomicity
 * @return {Promise<Object>} Updated relationship
 */
const migratePurchaseItemRelationship = async (relationshipId, transaction = null) => {
  const relationshipRepo = getRelationshipRepository();
  const relationship = await relationshipRepo.findById(relationshipId);
  
  if (!relationship) {
    throw new Error(`Relationship with ID ${relationshipId} not found`);
  }
  
  // Skip if not a purchase-item relationship
  if (relationship.relationshipType !== "purchase_item") {
    return relationship;
  }
  
  // Get the associated item to determine default measurements
  const itemRepo = getItemRepository();
  const item = await itemRepo.findById(relationship.secondaryId);
  const defaultMeasurement = item?.tracking?.measurement || "quantity";
  
  // Normalize the measurements
  const updatedRelationship = {
    ...relationship,
    measurements: createMeasurementConfig(
      relationship.measurements,
      defaultMeasurement
    ),
  };
  
  // Update the relationship with normalized measurements
  return await relationshipRepo.update(relationshipId, updatedRelationship, transaction);
};

/**
 * Migrates a sale item relationship to use normalized measurements
 *
 * @async
 * @param {string} relationshipId - ID of the relationship to migrate
 * @param {Object} [transaction=null] - Optional transaction object for atomicity
 * @return {Promise<Object>} Updated relationship
 */
const migrateSaleItemRelationship = async (relationshipId, transaction = null) => {
  const relationshipRepo = getRelationshipRepository();
  const relationship = await relationshipRepo.findById(relationshipId);
  
  if (!relationship) {
    throw new Error(`Relationship with ID ${relationshipId} not found`);
  }
  
  // Skip if not a sale-item relationship
  if (relationship.relationshipType !== "sale_item") {
    return relationship;
  }
  
  // Get the associated item to determine default measurements
  const itemRepo = getItemRepository();
  const item = await itemRepo.findById(relationship.secondaryId);
  const defaultMeasurement = item?.price?.measurement || "quantity";
  
  // Normalize the measurements
  const updatedRelationship = {
    ...relationship,
    measurements: createMeasurementConfig(
      relationship.measurements,
      defaultMeasurement
    ),
  };
  
  // Update the relationship with normalized measurements
  return await relationshipRepo.update(relationshipId, updatedRelationship, transaction);
};

/**
 * Migrates a product material relationship to use normalized measurements
 *
 * @async
 * @param {string} relationshipId - ID of the relationship to migrate
 * @param {Object} [transaction=null] - Optional transaction object for atomicity
 * @return {Promise<Object>} Updated relationship
 */
const migrateProductMaterialRelationship = async (relationshipId, transaction = null) => {
  const relationshipRepo = getRelationshipRepository();
  const relationship = await relationshipRepo.findById(relationshipId);
  
  if (!relationship) {
    throw new Error(`Relationship with ID ${relationshipId} not found`);
  }
  
  // Skip if not a product-material relationship
  if (relationship.relationshipType !== "product_material") {
    return relationship;
  }
  
  // Get the associated material to determine default measurements
  const itemRepo = getItemRepository();
  const material = await itemRepo.findById(relationship.secondaryId);
  const defaultMeasurement = material?.tracking?.measurement || "quantity";
  
  // Normalize the measurements
  const updatedRelationship = {
    ...relationship,
    measurements: createMeasurementConfig(
      relationship.measurements,
      defaultMeasurement
    ),
  };
  
  // Update the relationship with normalized measurements
  return await relationshipRepo.update(relationshipId, updatedRelationship, transaction);
};

/**
 * Migrates all relationships to use normalized measurements
 *
 * @async
 * @return {Promise<Object>} Migration results
 */
const migrateAllRelationshipsToNormalizedStructure = async () => {
  const relationshipRepo = getRelationshipRepository();
  const relationships = await relationshipRepo.findAll();
  
  const results = {
    total: relationships.length,
    successful: 0,
    failed: 0,
    byType: {},
    errors: [],
  };
  
  // Initialize counters for each relationship type
  const relationshipTypes = [
    "purchase_item", 
    "sale_item", 
    "product_material", 
    "derived", 
    "purchase_asset",
    "other"
  ];
  
  relationshipTypes.forEach(type => {
    results.byType[type] = {
      total: 0,
      successful: 0,
      failed: 0
    };
  });
  
  for (const relationship of relationships) {
    const relationType = relationship.relationshipType || "other";
    
    // Increment the total for this relationship type
    if (results.byType[relationType]) {
      results.byType[relationType].total++;
    } else {
      results.byType["other"].total++;
    }
    
    try {
      // Choose the appropriate migration function based on relationship type
      switch (relationship.relationshipType) {
        case "purchase_item":
          await migratePurchaseItemRelationship(relationship._id);
          break;
        case "sale_item":
          await migrateSaleItemRelationship(relationship._id);
          break;
        case "product_material":
          await migrateProductMaterialRelationship(relationship._id);
          break;
        // Add other relationship types as needed
      }
      
      results.successful++;
      if (results.byType[relationType]) {
        results.byType[relationType].successful++;
      } else {
        results.byType["other"].successful++;
      }
    } catch (error) {
      results.failed++;
      if (results.byType[relationType]) {
        results.byType[relationType].failed++;
      } else {
        results.byType["other"].failed++;
      }
      
      results.errors.push({
        relationshipId: relationship._id,
        relationshipType: relationship.relationshipType,
        error: error.message,
      });
    }
  }
  
  return results;
};

/**
 * Migrates embedded relationships from items to the new relationship model
 *
 * @async
 * @param {string} itemId - ID of the item with embedded relationships to migrate
 * @return {Promise<Object>} Migration results containing created relationships and errors
 */
const migrateItemEmbeddedRelationships = async (itemId) => {
  const itemRepo = getItemRepository();
  const relationshipRepo = getRelationshipRepository();
  
  const results = {
    created: 0,
    skipped: 0,
    errors: [],
  };
  
  // Get the item
  const item = await itemRepo.findById(itemId);
  if (!item) {
    throw new Error(`Item with ID ${itemId} not found`);
  }
  
  /**
   * Helper function to create a relationship with duplicate handling
   * 
   * @async
   * @param {Object} relationshipData - Data for the relationship to create
   * @param {string} source - Source of the relationship for error tracking
   * @return {Promise<Object>} Result of creation attempt
   */
  const createRelationshipSafely = async (relationshipData, source) => {
    try {
      // First check if relationship already exists to avoid duplicate key errors
      const existingRelationships = await relationshipRepo.findDirectRelationships(
        relationshipData.primaryId,
        relationshipData.primaryType,
        relationshipData.secondaryId,
        relationshipData.secondaryType
      );
      
      // Check for duplicate based on relationship type
      const isDuplicate = existingRelationships.some(rel => 
        rel.relationshipType === relationshipData.relationshipType);
      
      if (isDuplicate) {
        // Skip creation if relationship already exists
        console.log(`Skipping duplicate relationship: ${relationshipData.relationshipType} between ${relationshipData.primaryId} and ${relationshipData.secondaryId}`);
        results.skipped++;
        return null;
      }
      
      // Create the relationship if it doesn't exist
      const relationship = await relationshipRepo.create(relationshipData);
      results.created++;
      return relationship;
    } catch (error) {
      // Check if this is a duplicate key error
      if (error.code === 11000) {
        // Handle duplicate key error gracefully
        console.log(`Skipping duplicate relationship (caught error): ${relationshipData.relationshipType} between ${relationshipData.primaryId} and ${relationshipData.secondaryId}`);
        results.skipped++;
        return null;
      }
      
      // Re-throw other errors to be caught by the caller
      console.error(`Error creating relationship: ${error.message}`);
      results.errors.push({
        source: source,
        error: error.message,
        data: {
          primaryId: relationshipData.primaryId,
          secondaryId: relationshipData.secondaryId,
          relationshipType: relationshipData.relationshipType
        }
      });
      return null;
    }
  };
  
  // Handle embedded component relationships (material components in products)
  if (item.components && Array.isArray(item.components)) {
    for (const component of item.components) {
      // Ensure itemId is a string, not an object
      const itemIdString = typeof component.itemId === 'object' && component.itemId._id ? 
        component.itemId._id.toString() : 
        (typeof component.itemId === 'string' ? component.itemId : null);

      if (!itemIdString) continue;
      
      // Create a product-material relationship
      await createRelationshipSafely({
        primaryId: itemId,
        primaryType: "Item",
        secondaryId: itemIdString,
        secondaryType: "Item",
        relationshipType: "product_material",
        measurements: createMeasurementConfig({
          quantity: component.quantity,
          unit: component.unit,
        }, "quantity"),
        metadata: {
          migratedFrom: "embedded",
          migrationDate: new Date(),
        },
      }, "components");
    }
  }
  
  // Handle older-style derived item relationships (derivedFrom property)
  if (item.derivedFrom) {
    // Ensure derivedFrom is a string, not an object
    const derivedFromString = typeof item.derivedFrom === 'object' && item.derivedFrom._id ? 
      item.derivedFrom._id.toString() : 
      (typeof item.derivedFrom === 'string' ? item.derivedFrom : null);
      
    if (derivedFromString) {
      await createRelationshipSafely({
        primaryId: itemId,
        primaryType: "Item",
        secondaryId: derivedFromString,
        secondaryType: "Item",
        relationshipType: "derived",
        measurements: createMeasurementConfig({
          quantity: item.derivedQuantity || 1,
          conversionRatio: item.conversionRatio || 1.0,
        }, "quantity"),
        metadata: {
          migratedFrom: "embedded",
          migrationDate: new Date(),
        },
      }, "derivedFrom");
    }
  }
  
  // Handle newer-style derived items array (parent-child relationship)
  if (item.derivedItems && Array.isArray(item.derivedItems)) {
    for (const derivedItem of item.derivedItems) {
      // Ensure item is a string, not an object
      const derivedItemIdString = typeof derivedItem.item === 'object' && derivedItem.item._id ? 
        derivedItem.item._id.toString() : 
        (typeof derivedItem.item === 'string' ? derivedItem.item : null);
      
      if (!derivedItemIdString) continue;
      
      // Create a derived relationship where this item is the parent
      await createRelationshipSafely({
        primaryId: derivedItemIdString,  // The derived item is primary (child)
        primaryType: "Item",
        secondaryId: itemId,          // This item is secondary (parent)
        secondaryType: "Item",
        relationshipType: "derived",
        measurements: createMeasurementConfig({
          quantity: derivedItem.quantity || 1,
          weight: derivedItem.weight || 0,
          weightUnit: derivedItem.weightUnit || "lb",
          length: derivedItem.length || 0,
          lengthUnit: derivedItem.lengthUnit || "in",
          area: derivedItem.area || 0,
          areaUnit: derivedItem.areaUnit || "sqft",
          volume: derivedItem.volume || 0,
          volumeUnit: derivedItem.volumeUnit || "l"
        }, "quantity"),
        metadata: {
          migratedFrom: "derivedItems",
          derivedItemId: derivedItem.id || null,
          migrationDate: new Date(),
        },
      }, "derivedItems");
    }
  }
  
  return results;
};

/**
 * Migrates embedded relationships from purchases to the new relationship model
 *
 * @async
 * @param {string} purchaseId - ID of the purchase with embedded relationships to migrate
 * @return {Promise<Object>} Migration results containing created and skipped relationships
 */
const migratePurchaseEmbeddedRelationships = async (purchaseId) => {
  const purchaseRepo = getPurchaseRepository();
  const relationshipRepo = getRelationshipRepository();
  const itemRepo = getItemRepository();
  
  const results = {
    created: 0,
    skipped: 0,
    errors: [],
    processedItems: [],
  };
  
  // Get the purchase
  const purchase = await purchaseRepo.findById(purchaseId);
  if (!purchase) {
    throw new Error(`Purchase with ID ${purchaseId} not found`);
  }
  
  /**
   * Helper function to create a relationship with duplicate handling
   * 
   * @async
   * @param {Object} relationshipData - Data for the relationship to create
   * @param {string} itemId - Item ID for error tracking
   * @return {Promise<Object>} Result of creation attempt
   */
  const createRelationshipSafely = async (relationshipData, itemId) => {
    try {
      // First check if relationship already exists to avoid duplicate key errors
      const existingRelationships = await relationshipRepo.findDirectRelationships(
        relationshipData.primaryId,
        relationshipData.primaryType,
        relationshipData.secondaryId,
        relationshipData.secondaryType
      );
      
      // Check for duplicate based on relationship type
      const isDuplicate = existingRelationships.some(rel => 
        rel.relationshipType === relationshipData.relationshipType);
      
      if (isDuplicate) {
        // Skip creation if relationship already exists
        console.log(`Skipping duplicate purchase relationship: ${relationshipData.relationshipType} between ${relationshipData.primaryId} and ${relationshipData.secondaryId}`);
        results.skipped++;
        return null;
      }
      
      // Create the relationship if it doesn't exist
      const relationship = await relationshipRepo.create(relationshipData);
      results.created++;
      return relationship;
    } catch (error) {
      // Check if this is a duplicate key error
      if (error.code === 11000) {
        // Handle duplicate key error gracefully
        console.log(`Skipping duplicate purchase relationship (caught error): ${relationshipData.relationshipType} between ${relationshipData.primaryId} and ${relationshipData.secondaryId}`);
        results.skipped++;
        return null;
      }
      
      // Record other errors
      console.error(`Error creating purchase relationship: ${error.message}`);
      results.errors.push({
        itemId: itemId,
        error: error.message,
        data: {
          primaryId: relationshipData.primaryId,
          secondaryId: relationshipData.secondaryId,
          relationshipType: relationshipData.relationshipType
        }
      });
      return null;
    }
  };
  
  // Handle embedded purchase items
  if (purchase.items && Array.isArray(purchase.items)) {
    for (const purchaseItem of purchase.items) {
      // Check for both item and itemId since different API versions might use different field names
      const itemId = purchaseItem.item || purchaseItem.itemId;
      
      // Ensure itemId is a string, not an object
      const itemIdString = typeof itemId === 'object' && itemId._id ? 
        itemId._id.toString() : 
        (typeof itemId === 'string' ? itemId : null);
      
      if (!itemIdString) {
        results.errors.push({
          purchaseId: purchaseId,
          error: "Purchase item missing item ID field or invalid format",
          data: purchaseItem
        });
        continue;
      }
      
      results.processedItems.push(itemIdString);
      
      // Get the item to determine default measurement type
      try {
        const item = await itemRepo.findById(itemIdString);
        
        if (!item) {
          results.errors.push({
            itemId: itemIdString,
            error: `Item with ID ${itemIdString} not found`,
          });
          continue;
        }
        
        // Determine measurement type based on what data is available in the purchase item
        let defaultMeasurement = "quantity";
        if (purchaseItem.purchasedBy) {
          defaultMeasurement = purchaseItem.purchasedBy;
        } else if (item?.tracking?.measurement) {
          defaultMeasurement = item.tracking.measurement;
        } else {
          // Infer measurement from which fields have values
          if (purchaseItem.volume > 0) defaultMeasurement = "volume";
          else if (purchaseItem.weight > 0) defaultMeasurement = "weight";
          else if (purchaseItem.area > 0) defaultMeasurement = "area";
          else if (purchaseItem.length > 0) defaultMeasurement = "length";
        }
        
        // Create measurements config based on all possible measurement fields
        const measurements = createMeasurementConfig({
          quantity: purchaseItem.quantity || 0,
          unit: purchaseItem.unit || "",
          weight: purchaseItem.weight || 0,
          weightUnit: purchaseItem.weightUnit || "kg",
          length: purchaseItem.length || 0,
          lengthUnit: purchaseItem.lengthUnit || "m",
          area: purchaseItem.area || 0,
          areaUnit: purchaseItem.areaUnit || "sqm",
          volume: purchaseItem.volume || 0,
          volumeUnit: purchaseItem.volumeUnit || "l",
        }, defaultMeasurement);
        
        // Create a purchase-item relationship
        await createRelationshipSafely({
          primaryId: purchaseId,
          primaryType: "Purchase",
          secondaryId: itemIdString,
          secondaryType: "Item",
          relationshipType: "purchase_item",
          measurements: measurements,
          purchaseItemAttributes: {
            costPerUnit: purchaseItem.costPerUnit || purchaseItem.unitPrice || 0,
            totalCost: purchaseItem.totalCost || purchaseItem.total || 0,
            purchasedBy: defaultMeasurement,
            purchaseType: "inventory",
          },
          metadata: {
            migratedFrom: "embedded",
            migrationDate: new Date(),
            originalData: JSON.stringify(purchaseItem),
          },
        }, itemIdString);
      } catch (error) {
        // Handle item retrieval errors
        results.errors.push({
          itemId: itemIdString,
          error: `Failed to process item: ${error.message}`,
        });
      }
    }
  } else {
    console.log(`No items array found in purchase ${purchaseId}`);
    results.errors.push({
      purchaseId: purchaseId,
      error: "No items array found in purchase",
      data: { purchase: purchase._id }
    });
  }
  
  return results;
};

/**
 * Migrates embedded relationships from sales to the new relationship model
 *
 * @async
 * @param {string} saleId - ID of the sale with embedded relationships to migrate
 * @return {Promise<Object>} Migration results containing created, skipped relationships and errors
 */
const migrateSaleEmbeddedRelationships = async (saleId) => {
  const saleRepo = getSaleRepository();
  const relationshipRepo = getRelationshipRepository();
  const itemRepo = getItemRepository();
  
  const results = {
    created: 0,
    skipped: 0,
    errors: [],
    processedItems: [],
  };
  
  // Get the sale
  const sale = await saleRepo.findById(saleId);
  if (!sale) {
    throw new Error(`Sale with ID ${saleId} not found`);
  }
  
  /**
   * Helper function to create a relationship with duplicate handling
   * 
   * @async
   * @param {Object} relationshipData - Data for the relationship to create
   * @param {string} itemId - Item ID for error tracking
   * @return {Promise<Object>} Result of creation attempt
   */
  const createRelationshipSafely = async (relationshipData, itemId) => {
    try {
      // First check if relationship already exists to avoid duplicate key errors
      const existingRelationships = await relationshipRepo.findDirectRelationships(
        relationshipData.primaryId,
        relationshipData.primaryType,
        relationshipData.secondaryId,
        relationshipData.secondaryType
      );
      
      // Check for duplicate based on relationship type
      const isDuplicate = existingRelationships.some(rel => 
        rel.relationshipType === relationshipData.relationshipType);
      
      if (isDuplicate) {
        // Skip creation if relationship already exists
        console.log(`Skipping duplicate sale relationship: ${relationshipData.relationshipType} between ${relationshipData.primaryId} and ${relationshipData.secondaryId}`);
        results.skipped++;
        return null;
      }
      
      // Create the relationship if it doesn't exist
      const relationship = await relationshipRepo.create(relationshipData);
      results.created++;
      return relationship;
    } catch (error) {
      // Check if this is a duplicate key error
      if (error.code === 11000) {
        // Handle duplicate key error gracefully
        console.log(`Skipping duplicate sale relationship (caught error): ${relationshipData.relationshipType} between ${relationshipData.primaryId} and ${relationshipData.secondaryId}`);
        results.skipped++;
        return null;
      }
      
      // Record other errors
      console.error(`Error creating sale relationship: ${error.message}`);
      results.errors.push({
        itemId: itemId,
        error: error.message,
        data: {
          primaryId: relationshipData.primaryId,
          secondaryId: relationshipData.secondaryId,
          relationshipType: relationshipData.relationshipType
        }
      });
      return null;
    }
  };
  
  // Handle embedded sale items
  if (sale.items && Array.isArray(sale.items)) {
    for (const saleItem of sale.items) {
      // Check for both item and itemId since different API versions might use different field names
      const itemId = saleItem.item || saleItem.itemId;
      
      // Ensure itemId is
      const itemIdString = typeof itemId === 'object' && itemId._id ? 
        itemId._id.toString() : 
        (typeof itemId === 'string' ? itemId : null);
      
      if (!itemIdString) {
        results.errors.push({
          saleId: saleId,
          error: "Sale item missing item ID field or invalid format",
          data: saleItem
        });
        continue;
      }
      
      results.processedItems.push(itemIdString);
      
      // Get the item to determine default measurement type
      try {
        const item = await itemRepo.findById(itemIdString);
        
        if (!item) {
          results.errors.push({
            itemId: itemIdString,
            error: `Item with ID ${itemIdString} not found`,
          });
          continue;
        }
        
        // Determine measurement type based on what data is available in the sale item
        let defaultMeasurement = "quantity";
        if (saleItem.soldBy) {
          defaultMeasurement = saleItem.soldBy;
        } else if (item?.price?.measurement) {
          defaultMeasurement = item.price.measurement;
        } else if (item?.tracking?.measurement) {
          defaultMeasurement = item.tracking.measurement;
        } else {
          // Infer measurement from which fields have values
          if (saleItem.volume > 0) defaultMeasurement = "volume";
          else if (saleItem.weight > 0) defaultMeasurement = "weight";
          else if (saleItem.area > 0) defaultMeasurement = "area";
          else if (saleItem.length > 0) defaultMeasurement = "length";
        }
        
        // Create measurements config based on all possible measurement fields
        const measurements = createMeasurementConfig({
          quantity: saleItem.quantity || 0,
          unit: saleItem.unit || "",
          weight: saleItem.weight || 0,
          weightUnit: saleItem.weightUnit || "kg",
          length: saleItem.length || 0,
          lengthUnit: saleItem.lengthUnit || "m",
          area: saleItem.area || 0,
          areaUnit: saleItem.areaUnit || "sqm",
          volume: saleItem.volume || 0,
          volumeUnit: saleItem.volumeUnit || "l",
        }, defaultMeasurement);
        
        // Create a sale-item relationship
        await createRelationshipSafely({
          primaryId: saleId,
          primaryType: "Sale",
          secondaryId: itemIdString,
          secondaryType: "Item",
          relationshipType: "sale_item",
          measurements: measurements,
          saleItemAttributes: {
            unitPrice: saleItem.unitPrice || 0,
            totalPrice: saleItem.totalPrice || saleItem.total || 0,
            discountAmount: saleItem.discountAmount || saleItem.discount || 0,
            discountPercentage: saleItem.discountPercentage || 0,
            saleDate: sale.saleDate || new Date(),
          },
          metadata: {
            migratedFrom: "embedded",
            migrationDate: new Date(),
            originalData: JSON.stringify(saleItem),
          },
        }, itemIdString);
      } catch (error) {
        // Handle item retrieval errors
        results.errors.push({
          itemId: itemIdString,
          error: `Failed to process item: ${error.message}`,
        });
      }
    }
  } else {
    console.log(`No items array found in sale ${saleId}`);
    results.errors.push({
      saleId: saleId,
      error: "No items array found in sale",
      data: { sale: sale._id }
    });
  }
  
  return results;
};

/**
 * Migrates all embedded relationships from all entities to the new relationship model
 *
 * @async
 * @return {Promise<Object>} Migration results
 */
const migrateAllEmbeddedRelationships = async () => {
  // Get repositories
  const itemRepo = getItemRepository();
  const purchaseRepo = getPurchaseRepository();
  const saleRepo = getSaleRepository();
  
  // Get all entities that might have embedded relationships
  const [items, purchases, sales] = await Promise.all([
    itemRepo.findAll(),
    purchaseRepo.findAll(),
    saleRepo.findAll(),
  ]);
  
  const results = {
    items: {
      total: items.length,
      processed: 0,
      relationshipsCreated: 0,
      errors: [],
    },
    purchases: {
      total: purchases.length,
      processed: 0,
      relationshipsCreated: 0,
      errors: [],
    },
    sales: {
      total: sales.length,
      processed: 0,
      relationshipsCreated: 0,
      errors: [],
    },
  };
  
  // Process all items
  for (const item of items) {
    try {
      const itemResult = await migrateItemEmbeddedRelationships(item._id);
      results.items.processed++;
      results.items.relationshipsCreated += itemResult.created;
      results.items.errors = [...results.items.errors, ...itemResult.errors];
    } catch (error) {
      results.items.errors.push({
        itemId: item._id,
        error: error.message,
      });
    }
  }
  
  // Process all purchases
  for (const purchase of purchases) {
    try {
      const purchaseResult = await migratePurchaseEmbeddedRelationships(purchase._id);
      results.purchases.processed++;
      results.purchases.relationshipsCreated += purchaseResult.created;
      results.purchases.errors = [...results.purchases.errors, ...purchaseResult.errors];
    } catch (error) {
      results.purchases.errors.push({
        purchaseId: purchase._id,
        error: error.message,
      });
    }
  }
  
  // Process all sales
  for (const sale of sales) {
    try {
      const saleResult = await migrateSaleEmbeddedRelationships(sale._id);
      results.sales.processed++;
      results.sales.relationshipsCreated += saleResult.created;
      results.sales.errors = [...results.sales.errors, ...saleResult.errors];
    } catch (error) {
      results.sales.errors.push({
        saleId: sale._id,
        error: error.message,
      });
    }
  }
  
  // Calculate totals
  const totalRelationshipsCreated = 
    results.items.relationshipsCreated +
    results.purchases.relationshipsCreated +
    results.sales.relationshipsCreated;
  
  const totalErrors = 
    results.items.errors.length +
    results.purchases.errors.length +
    results.sales.errors.length;
  
  return {
    ...results,
    totalRelationshipsCreated,
    totalErrors,
  };
};

/**
 * Removes embedded relationship fields from an entity after migration
 * 
 * @async
 * @param {string} entityType - Type of entity ("Item", "Purchase", "Sale")
 * @param {string} entityId - ID of the entity to clean up
 * @return {Promise<Object>} Cleanup results
 */
const cleanupEmbeddedFields = async (entityType, entityId) => {
  switch (entityType.toLowerCase()) {
    case "item":
      return await cleanupItemEmbeddedFields(entityId);
    case "purchase":
      return await cleanupPurchaseEmbeddedFields(entityId);
    case "sale":
      return await cleanupSaleEmbeddedFields(entityId);
    default:
      throw new Error(`Unsupported entity type: ${entityType}`);
  }
};

/**
 * Removes embedded relationship fields from all entities of a specific type
 * 
 * @async
 * @param {string} entityType - Type of entity ("Item", "Purchase", "Sale")
 * @return {Promise<Object>} Cleanup results
 */
const cleanupAllEmbeddedFields = async (entityType) => {
  switch (entityType.toLowerCase()) {
    case "item":
      return await cleanupAllItemsEmbeddedFields();
    case "purchase":
      return await cleanupAllPurchasesEmbeddedFields();
    case "sale":
      return await cleanupAllSalesEmbeddedFields();
    default:
      throw new Error(`Unsupported entity type: ${entityType}`);
  }
};

/**
 * Removes embedded relationship fields from all entities of all types
 * 
 * @async
 * @return {Promise<Object>} Cleanup results
 */
const cleanupAllEmbeddedFieldsAllEntityTypes = async () => {
  const [itemResults, purchaseResults, saleResults] = await Promise.all([
    cleanupAllItemsEmbeddedFields(),
    cleanupAllPurchasesEmbeddedFields(),
    cleanupAllSalesEmbeddedFields()
  ]);

  return {
    items: itemResults,
    purchases: purchaseResults,
    sales: saleResults,
    summary: {
      totalProcessed: 
        itemResults.processed + purchaseResults.processed + saleResults.processed,
      totalSuccess: 
        itemResults.success + purchaseResults.success + saleResults.success,
      totalErrors: 
        itemResults.errors.length + purchaseResults.errors.length + saleResults.errors.length,
    }
  };
};

/**
 * Removes embedded relationship fields from a single item
 * 
 * @async
 * @param {string} itemId - ID of the item to clean up
 * @return {Promise<Object>} Cleanup results
 */
const cleanupItemEmbeddedFields = async (itemId) => {
  const itemRepo = getItemRepository();
  
  const results = {
    itemId,
    fieldsRemoved: [],
    success: false,
    error: null
  };
  
  try {
    // Get the item
    const item = await itemRepo.findById(itemId);
    if (!item) {
      throw new Error(`Item with ID ${itemId} not found`);
    }
    
    // Create update object with MongoDB $unset operator to properly remove fields
    const unsetObj = {};
    let fieldRemoved = false;
    
    // Check and add fields to unset
    if (item.components !== undefined) {
      unsetObj.components = "";
      results.fieldsRemoved.push("components");
      fieldRemoved = true;
    }
    
    if (item.derivedFrom !== undefined) {
      unsetObj.derivedFrom = "";
      unsetObj.derivedQuantity = "";
      unsetObj.conversionRatio = "";
      results.fieldsRemoved.push("derivedFrom", "derivedQuantity", "conversionRatio");
      fieldRemoved = true;
    }
    
    if (item.derivedItems !== undefined) {
      unsetObj.derivedItems = "";
      results.fieldsRemoved.push("derivedItems");
      fieldRemoved = true;
    }
    
    if (item.usedInProducts !== undefined) {
      unsetObj.usedInProducts = "";
      results.fieldsRemoved.push("usedInProducts");
      fieldRemoved = true;
    }
    
    // Only update if we have fields to remove
    if (fieldRemoved) {
      // Use $unset to completely remove the fields from the document
      const updateObj = { $unset: unsetObj };
      
      // Log the update operation for debugging
      console.log(`Cleaning up item ${itemId} with $unset:`, JSON.stringify(unsetObj));
      
      // Use the new updateRaw method with $unset operator
      await itemRepo.updateRaw(itemId, updateObj);
      results.success = true;
    } else {
      results.message = "No embedded fields to remove";
      results.success = true;
    }
    
    return results;
  } catch (error) {
    console.error(`Error cleaning up item ${itemId}:`, error);
    results.error = error.message;
    return results;
  }
};

/**
 * Removes embedded relationship fields from a single purchase
 * 
 * @async
 * @param {string} purchaseId - ID of the purchase to clean up
 * @return {Promise<Object>} Cleanup results
 */
const cleanupPurchaseEmbeddedFields = async (purchaseId) => {
  const purchaseRepo = getPurchaseRepository();
  
  const results = {
    purchaseId,
    fieldsRemoved: [],
    success: false,
    error: null
  };
  
  try {
    // Get the purchase
    const purchase = await purchaseRepo.findById(purchaseId);
    if (!purchase) {
      throw new Error(`Purchase with ID ${purchaseId} not found`);
    }
    
    // Create update object with MongoDB $unset operator to properly remove fields
    const unsetObj = {};
    let fieldRemoved = false;
    
    // Check and add fields to unset
    if (purchase.items !== undefined) {
      unsetObj.items = "";
      results.fieldsRemoved.push("items");
      fieldRemoved = true;
    }
    
    // Only update if we have fields to remove
    if (fieldRemoved) {
      // Use $unset to completely remove the fields from the document
      const updateObj = { $unset: unsetObj };
      
      console.log(`Cleaning up purchase ${purchaseId} with $unset:`, JSON.stringify(unsetObj));
      
      // Use the updateRaw method with $unset operator if available
      if (purchaseRepo.updateRaw) {
        await purchaseRepo.updateRaw(purchaseId, updateObj);
      } else {
        // Fallback to standard update if updateRaw is not available
        const standardUpdate = {};
        Object.keys(unsetObj).forEach(key => {
          standardUpdate[key] = undefined;
        });
        await purchaseRepo.update(purchaseId, standardUpdate);
      }
      
      results.success = true;
    } else {
      results.message = "No embedded fields to remove";
      results.success = true;
    }
    
    return results;
  } catch (error) {
    console.error(`Error cleaning up purchase ${purchaseId}:`, error);
    results.error = error.message;
    return results;
  }
};

/**
 * Removes embedded relationship fields from a single sale
 * 
 * @async
 * @param {string} saleId - ID of the sale to clean up
 * @return {Promise<Object>} Cleanup results
 */
const cleanupSaleEmbeddedFields = async (saleId) => {
  const saleRepo = getSaleRepository();
  
  const results = {
    saleId,
    fieldsRemoved: [],
    success: false,
    error: null
  };
  
  try {
    // Get the sale
    const sale = await saleRepo.findById(saleId);
    if (!sale) {
      throw new Error(`Sale with ID ${saleId} not found`);
    }
    
    // Create update object with MongoDB $unset operator to properly remove fields
    const unsetObj = {};
    let fieldRemoved = false;
    
    // Check and add fields to unset
    if (sale.items !== undefined) {
      unsetObj.items = "";
      results.fieldsRemoved.push("items");
      fieldRemoved = true;
    }
    
    // Only update if we have fields to remove
    if (fieldRemoved) {
      // Use $unset to completely remove the fields from the document
      const updateObj = { $unset: unsetObj };
      
      console.log(`Cleaning up sale ${saleId} with $unset:`, JSON.stringify(unsetObj));
      
      // Use the updateRaw method with $unset operator if available
      if (saleRepo.updateRaw) {
        await saleRepo.updateRaw(saleId, updateObj);
      } else {
        // Fallback to standard update if updateRaw is not available
        const standardUpdate = {};
        Object.keys(unsetObj).forEach(key => {
          standardUpdate[key] = undefined;
        });
        await saleRepo.update(saleId, standardUpdate);
      }
      
      results.success = true;
    } else {
      results.message = "No embedded fields to remove";
      results.success = true;
    }
    
    return results;
  } catch (error) {
    console.error(`Error cleaning up sale ${saleId}:`, error);
    results.error = error.message;
    return results;
  }
};

/**
 * Removes embedded relationship fields from all items
 * 
 * @async
 * @return {Promise<Object>} Cleanup results
 */
const cleanupAllItemsEmbeddedFields = async () => {
  const itemRepo = getItemRepository();
  
  const results = {
    processed: 0,
    success: 0,
    skipped: 0,
    errors: []
  };
  
  // Get all items
  const items = await itemRepo.findAll();
  results.total = items.length;
  
  // Process each item
  for (const item of items) {
    try {
      results.processed++;
      
      // Check if item has any embedded fields to clean up
      const hasEmbeddedFields = 
        item.components !== undefined || 
        item.derivedFrom !== undefined || 
        item.derivedItems !== undefined ||
        item.usedInProducts !== undefined;
      
      if (!hasEmbeddedFields) {
        results.skipped++;
        continue;
      }
      
      // Create $unset object with fields to remove
      const unsetObj = {};
      
      if (item.components !== undefined) {
        unsetObj.components = "";
      }
      
      if (item.derivedFrom !== undefined) {
        unsetObj.derivedFrom = "";
        unsetObj.derivedQuantity = "";
        unsetObj.conversionRatio = "";
      }
      
      if (item.derivedItems !== undefined) {
        unsetObj.derivedItems = "";
      }
      
      if (item.usedInProducts !== undefined) {
        unsetObj.usedInProducts = "";
      }
      
      // Update the item using updateRaw with $unset operator if available
      if (itemRepo.updateRaw) {
        await itemRepo.updateRaw(item._id, { $unset: unsetObj });
      } else {
        // Fallback to standard update if updateRaw is not available
        const standardUpdate = {};
        Object.keys(unsetObj).forEach(key => {
          standardUpdate[key] = undefined;
        });
        await itemRepo.update(item._id, standardUpdate);
      }
      
      results.success++;
    } catch (error) {
      console.error(`Error cleaning up item ${item._id}:`, error);
      results.errors.push({
        itemId: item._id,
        error: error.message
      });
    }
  }
  
  return results;
};

/**
 * Removes embedded relationship fields from all purchases
 * 
 * @async
 * @return {Promise<Object>} Cleanup results
 */
const cleanupAllPurchasesEmbeddedFields = async () => {
  const purchaseRepo = getPurchaseRepository();
  
  const results = {
    processed: 0,
    success: 0,
    skipped: 0,
    errors: []
  };
  
  // Get all purchases
  const purchases = await purchaseRepo.findAll();
  results.total = purchases.length;
  
  // Process each purchase
  for (const purchase of purchases) {
    try {
      results.processed++;
      
      // Check if purchase has any embedded fields to clean up
      const hasEmbeddedFields = purchase.items !== undefined;
      
      if (!hasEmbeddedFields) {
        results.skipped++;
        continue;
      }
      
      // Create $unset object with fields to remove
      const unsetObj = { items: "" };
      
      // Update the purchase using updateRaw with $unset operator if available
      if (purchaseRepo.updateRaw) {
        await purchaseRepo.updateRaw(purchase._id, { $unset: unsetObj });
      } else {
        // Fallback to standard update if updateRaw is not available
        await purchaseRepo.update(purchase._id, { items: undefined });
      }
      
      results.success++;
    } catch (error) {
      console.error(`Error cleaning up purchase ${purchase._id}:`, error);
      results.errors.push({
        purchaseId: purchase._id,
        error: error.message
      });
    }
  }
  
  return results;
};

/**
 * Removes embedded relationship fields from all sales
 * 
 * @async
 * @return {Promise<Object>} Cleanup results
 */
const cleanupAllSalesEmbeddedFields = async () => {
  const saleRepo = getSaleRepository();
  
  const results = {
    processed: 0,
    success: 0,
    skipped: 0,
    errors: []
  };
  
  // Get all sales
  const sales = await saleRepo.findAll();
  results.total = sales.length;
  
  // Process each sale
  for (const sale of sales) {
    try {
      results.processed++;
      
      // Check if sale has any embedded fields to clean up
      const hasEmbeddedFields = sale.items !== undefined;
      
      if (!hasEmbeddedFields) {
        results.skipped++;
        continue;
      }
      
      // Create $unset object with fields to remove
      const unsetObj = { items: "" };
      
      // Update the sale using updateRaw with $unset operator if available
      if (saleRepo.updateRaw) {
        await saleRepo.updateRaw(sale._id, { $unset: unsetObj });
      } else {
        // Fallback to standard update if updateRaw is not available
        await saleRepo.update(sale._id, { items: undefined });
      }
      
      results.success++;
    } catch (error) {
      console.error(`Error cleaning up sale ${sale._id}:`, error);
      results.errors.push({
        saleId: sale._id,
        error: error.message
      });
    }
  }
  
  return results;
};

// Export the migration utilities
module.exports = {
  // Item migrations
  migrateItemToNormalizedStructure,
  migrateAllItemsToNormalizedStructure,
  
  // Relationship migrations
  migratePurchaseItemRelationship,
  migrateSaleItemRelationship,
  migrateProductMaterialRelationship,
  migrateAllRelationshipsToNormalizedStructure,
  
  // Embedded relationship migrations
  migrateItemEmbeddedRelationships,
  migratePurchaseEmbeddedRelationships,
  migrateSaleEmbeddedRelationships,
  migrateAllEmbeddedRelationships,
  
  // Helper functions
  normalizeMeasurement,
  cleanupEmbeddedFields,
  cleanupAllEmbeddedFields,
  cleanupAllEmbeddedFieldsAllEntityTypes,
};