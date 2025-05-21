/**
 * Item Repository
 * Implements provider-agnostic business logic and operations for the Item entity
 */

const ItemInterface = require("../interfaces/itemInterface");
// eslint-disable-next-line no-unused-vars
const {Item} = require("../../models/itemModel");

/**
 * Base repository for Item operations with provider-agnostic implementation
 */
class ItemRepository extends ItemInterface {
  /**
   * Creates a new ItemRepository instance
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    super();
    this.config = config;
    this.transactionProvider = null;
    this.relationshipRepository = null;
  }

  /**
   * Set the transaction provider dependency
   * @param {Object} provider - Transaction provider instance
   */
  setTransactionProvider(provider) {
    this.transactionProvider = provider;
  }

  /**
   * Set the relationship repository dependency
   * @param {Object} repository - Relationship repository instance
   */
  setRelationshipRepository(repository) {
    this.relationshipRepository = repository;
  }

  /**
   * Get all unique categories from items
   * @return {Promise<Array<string>>} List of categories
   */
  async getCategories() {
    try {
      const items = await this.findAll({});
      // Extract unique categories, filter out undefined/null/empty values
      const categories = new Set(
          items.map((item) => item.category).filter(Boolean),
      );
      return [...categories].sort();
    } catch (error) {
      console.error("Error getting categories:", error);
      throw error;
    }
  }

  /**
   * Get all unique tags from items
   * @return {Promise<Array<string>>} List of tags
   */
  async getTags() {
    try {
      const items = await this.findAll({});
      // Extract all tags from all items, flatten array, and get unique values
      const tagsSet = new Set(
          items.flatMap((item) => item.tags || []).filter(Boolean),
      );
      return [...tagsSet].sort();
    } catch (error) {
      console.error("Error getting tags:", error);
      throw error;
    }
  }

  /**
   * Generate the next available SKU
   * @return {Promise<string>} Next available SKU
   */
  async getNextSku() {
    try {
      const items = await this.findAll({});
      const skus = items
          .map((item) => item.sku || "")
          .filter((sku) => /^\d+$/.test(sku)) // Only get numeric SKUs
          .map((sku) => parseInt(sku, 10));

      const maxSku = skus.length > 0 ? Math.max(...skus) : 0;
      // Pad with zeros to create a 10-digit SKU
      return (maxSku + 1).toString().padStart(10, "0");
    } catch (error) {
      console.error("Error generating next SKU:", error);
      throw error;
    }
  }

  /**
   * Update inventory quantities for an item
   * @param {string} id - Item ID
   * @param {Object} quantities - Quantity changes by tracking type
   * @param {Object} [transaction] - Optional transaction
   * @return {Promise<Object|null>} Updated item or null if not found
   */
  async updateInventory(id, quantities, transaction = null) {
    try {
      const item = await this.findById(id);
      if (!item) return null;

      // Build the update data based on tracking type and provided quantities
      const updateData = {};

      if (quantities.quantity !== undefined &&
         (item.trackingType === "quantity" ||
          item.trackingType === null)) {
        updateData.quantity = Math.max(0,
            (item.quantity || 0) + quantities.quantity);
      }

      if (quantities.weight !== undefined &&
          item.trackingType === "weight") {
        updateData.weight = Math.max(0,
            (item.weight || 0) + quantities.weight);
      }

      if (quantities.length !== undefined &&
          item.trackingType === "length") {
        updateData.length = Math.max(0,
            (item.length || 0) + quantities.length);
      }

      if (quantities.area !== undefined &&
          item.trackingType === "area") {
        updateData.area = Math.max(0,
            (item.area || 0) + quantities.area);
      }

      if (quantities.volume !== undefined &&
          item.trackingType === "volume") {
        updateData.volume = Math.max(0,
            (item.volume || 0) + quantities.volume);
      }

      // If we have changes to make, update the item
      if (Object.keys(updateData).length > 0) {
        return await this.update(id, updateData, transaction);
      }

      return item;
    } catch (error) {
      console.error(`Error updating inventory for item ${id}:`, error);
      throw error;
    }
  }

  /**
   * Batch update multiple items
   * @param {Array<Object>} items - Array of items with id and update data
   * @param {Object} [transaction] - Optional transaction
   * @return {Promise<Array>} Array of updated items
   */
  async batchUpdate(items, transaction = null) {
    try {
      if (!items || !Array.isArray(items) || items.length === 0) {
        return [];
      }

      // Use transaction if provided, otherwise create a new one if available
      let tx = transaction;
      let usingNewTransaction = false;

      if (!tx && this.transactionProvider) {
        tx = await this.transactionProvider.startTransaction();
        usingNewTransaction = true;
      }

      try {
        const updatedItems = [];

        // Process each item update
        for (const itemUpdate of items) {
          if (!itemUpdate.id) continue;

          const updatedItem = await this.update(
              itemUpdate.id,
              itemUpdate.data,
              tx,
          );

          if (updatedItem) {
            updatedItems.push(updatedItem);
          }
        }

        // Commit transaction if we created it
        if (usingNewTransaction && tx) {
          await this.transactionProvider.commitTransaction(tx);
        }

        return updatedItems;
      } catch (error) {
        // Rollback transaction if we created it
        if (usingNewTransaction && tx) {
          await this.transactionProvider.rollbackTransaction(tx);
        }
        throw error;
      }
    } catch (error) {
      console.error("Error in batch update:", error);
      throw error;
    }
  }

  /**
   * Get item relationships
   * @param {string} itemId - Item ID
   * @return {Promise<Object>} Relationship information
   */
  async getItemRelationships(itemId) {
    try {
      // Check if relationship repository is available
      if (!this.relationshipRepository) {
        return {
          isUsedInProducts: false,
          products: [],
          hasDerivedItems: false,
          derivedItems: [],
          hasComponentItems: false,
          componentItems: [],
          hasParentItem: false,
          parentItem: null,
        };
      }

      // Get relationships from the relationship repository
      const relationships = await this.relationshipRepository.getRelationshipsForEntity(
          itemId,
          "Item",
      );

      return relationships;
    } catch (error) {
      console.error(`Error getting relationships for item ${itemId}:`, error);
      throw error;
    }
  }

  /**
   * Create derived items from a source item
   * @param {string} sourceItemId - ID of the source item
   * @param {Array<Object>} derivedItemsData - Array of derived item data
   * @param {Object} [transaction] - Optional transaction
   * @return {Promise<Object>} Object containing source item and derived items
   */
  async createDerivedItems(sourceItemId, derivedItemsData, transaction = null) {
    try {
      // Validate inputs
      if (!sourceItemId || !derivedItemsData || !Array.isArray(derivedItemsData)) {
        throw new Error("Invalid arguments for createDerivedItems");
      }

      // Get source item
      const sourceItem = await this.findById(sourceItemId);
      if (!sourceItem) {
        throw new Error(`Source item ${sourceItemId} not found`);
      }

      // Use transaction if provided, otherwise create a new one if available
      let tx = transaction;
      let usingNewTransaction = false;

      if (!tx && this.transactionProvider) {
        tx = await this.transactionProvider.startTransaction();
        usingNewTransaction = true;
      }

      try {
        const derivedItems = [];

        // Create each derived item and establish relationship
        for (const itemData of derivedItemsData) {
          // Create derived item
          const derivedItem = await this.create(itemData, tx);

          // Create relationship if relationship repository is available
          if (this.relationshipRepository) {
            const measurements = itemData.measurements || {quantity: 1};

            await this.relationshipRepository.createRelationship({
              primaryId: derivedItem._id,
              primaryType: "Item",
              secondaryId: sourceItemId,
              secondaryType: "Item",
              relationshipType: "derived",
              measurements: measurements,
            }, tx);
          }

          derivedItems.push(derivedItem);
        }

        // Commit transaction if we created it
        if (usingNewTransaction && tx) {
          await this.transactionProvider.commitTransaction(tx);
        }

        return {
          sourceItem,
          derivedItems,
        };
      } catch (error) {
        // Rollback transaction if we created it
        if (usingNewTransaction && tx) {
          await this.transactionProvider.rollbackTransaction(tx);
        }
        throw error;
      }
    } catch (error) {
      console.error(`Error creating derived items for ${sourceItemId}:`, error);
      throw error;
    }
  }

  /**
   * Get derived items for a source item
   * @param {string} sourceItemId - ID of the source item
   * @return {Promise<Array>} Array of derived items
   */
  async getDerivedItems(sourceItemId) {
    try {
      if (!this.relationshipRepository) {
        return [];
      }

      // Get relationships where this item is the secondary (parent) in a derived relationship
      const relationships = await this.relationshipRepository.findRelationships({
        secondaryId: sourceItemId,
        secondaryType: "Item",
        relationshipType: "derived",
      });

      if (!relationships || relationships.length === 0) {
        return [];
      }

      // Get all the derived item IDs
      const derivedItemIds = relationships.map((rel) => rel.primaryId);

      // Get the actual items
      return await this.findByIds(derivedItemIds);
    } catch (error) {
      console.error(`Error getting derived items for ${sourceItemId}:`, error);
      throw error;
    }
  }

  /**
   * Get the parent item for a derived item
   * @param {string} derivedItemId - ID of the derived item
   * @return {Promise<Object|null>} Parent item or null
   */
  async getParentItem(derivedItemId) {
    try {
      if (!this.relationshipRepository) {
        return null;
      }

      // Get relationships where this item is the primary (child) in a derived relationship
      const relationships = await this.relationshipRepository.findRelationships({
        primaryId: derivedItemId,
        primaryType: "Item",
        relationshipType: "derived",
      });

      if (!relationships || relationships.length === 0) {
        return null;
      }

      // Get the parent item ID from the first relationship (there should only be one parent)
      const parentItemId = relationships[0].secondaryId;

      // Get the actual parent item
      return await this.findById(parentItemId);
    } catch (error) {
      console.error(`Error getting parent item for ${derivedItemId}:`, error);
      throw error;
    }
  }

  /**
   * Update an item with raw MongoDB operators
   * 
   * @param {string} id - ID of the item to update
   * @param {Object} updateData - Update data with MongoDB operators like $set, $unset, etc.
   * @param {Object} [transaction] - Optional transaction
   * @return {Promise<Object|null>} Updated item or null if not found
   */
  async updateRaw(id, updateData, transaction = null) {
    try {
      // Get the database provider implementation
      const provider = this.getProvider();
      
      // Call the provider's raw update method if available
      if (provider.updateRaw) {
        return await provider.updateRaw("items", id, updateData, transaction);
      }
      
      // Fallback to regular update if raw update not supported by provider
      console.warn("Provider does not support raw updates, falling back to regular update");
      
      // Remove MongoDB operators from the update
      const cleanData = {};
      if (updateData.$set) {
        Object.assign(cleanData, updateData.$set);
      }
      
      // Attempt standard update as fallback
      return await this.update(id, cleanData, transaction);
    } catch (error) {
      console.error(`Error in raw update for item ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get the database provider instance
   * 
   * @return {Object} Provider instance
   */
  getProvider() {
    // If this is a MongoDB repository, it will have a direct provider reference
    if (this.provider) {
      return this.provider;
    }
    
    // Otherwise try to get it from the provider factory
    try {
      const providerFactory = require("../providerFactory");
      return providerFactory.getDatabaseProvider();
    } catch (error) {
      console.error("Failed to get database provider:", error);
      throw new Error("Database provider not available");
    }
  }
}

module.exports = ItemRepository;
