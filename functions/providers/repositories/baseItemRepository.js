/**
 * Base Item Repository
 * Implements provider-agnostic business logic and operations for the BaseItem entity
 */

const BaseItemInterface = require("../interfaces/baseItemInterface");
// eslint-disable-next-line no-unused-vars
const { BaseItem } = require("../../models/baseItemModel");

/**
 * Base repository for BaseItem operations with provider-agnostic implementation
 */
class BaseItemRepository extends BaseItemInterface {
  /**
   * Creates a new BaseItemRepository instance
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
   * Add inventory to an item
   * 
   * @param {string} id - Item ID
   * @param {number} quantity - Quantity to add
   * @param {number} unitCost - Cost per unit
   * @param {string} source - Source of the inventory addition
   * @param {Object} [transaction] - Optional transaction
   * @return {Promise<Object|null>} Updated item or null if not found
   */
  async addInventory(id, quantity, unitCost, source, transaction = null) {
    try {
      const item = await this.findById(id);
      if (!item) return null;

      // Use the BaseItem model to properly handle inventory addition
      const baseItem = new BaseItem(item);
      baseItem.addInventory(quantity, unitCost, source);

      // Update the item in the database
      return await this.update(id, baseItem.toObject(), transaction);
    } catch (error) {
      console.error(`Error adding inventory to item ${id}:`, error);
      throw error;
    }
  }

  /**
   * Remove inventory from an item
   * 
   * @param {string} id - Item ID
   * @param {number} quantity - Quantity to remove
   * @param {string} source - Source of the inventory removal
   * @param {Object} [transaction] - Optional transaction
   * @return {Promise<Object>} Result with removed cost information and updated item
   */
  async removeInventory(id, quantity, source, transaction = null) {
    try {
      const item = await this.findById(id);
      if (!item) {
        throw new Error(`Item with ID ${id} not found`);
      }

      // Use the BaseItem model to properly handle inventory removal
      const baseItem = new BaseItem(item);
      const removalResult = baseItem.removeInventory(quantity, source);

      // Update the item in the database
      const updatedItem = await this.update(id, baseItem.toObject(), transaction);

      return {
        ...removalResult,
        updatedItem
      };
    } catch (error) {
      console.error(`Error removing inventory from item ${id}:`, error);
      throw error;
    }
  }

  /**
   * Update inventory settings for an item
   * 
   * @param {string} id - Item ID
   * @param {Object} settings - Inventory settings to update
   * @param {Object} [transaction] - Optional transaction
   * @return {Promise<Object|null>} Updated item or null if not found
   */
  async updateInventorySettings(id, settings, transaction = null) {
    try {
      const item = await this.findById(id);
      if (!item) return null;

      // Use the BaseItem model to properly handle settings update
      const baseItem = new BaseItem(item);
      baseItem.updateInventorySettings(settings);

      // Update the item in the database
      return await this.update(id, baseItem.toObject(), transaction);
    } catch (error) {
      console.error(`Error updating inventory settings for item ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get items that need reordering
   * 
   * @return {Promise<Array>} Items that need reordering
   */
  async getItemsNeedingReorder() {
    try {
      // Try to use an optimized query if the database provider supports it
      if (this.findByQuery) {
        return await this.findByQuery({
          "$expr": {
            "$lte": ["$tracking.amount", "$tracking.reorderPoint"]
          }
        });
      }

      // Fallback to client-side filtering
      const items = await this.findAll({});
      return items.filter(item => 
        item.tracking && 
        item.tracking.amount <= item.tracking.reorderPoint
      );
    } catch (error) {
      console.error("Error getting items needing reorder:", error);
      throw error;
    }
  }

  /**
   * Get items below minimum level
   * 
   * @return {Promise<Array>} Items below minimum level
   */
  async getItemsBelowMinimum() {
    try {
      // Try to use an optimized query if the database provider supports it
      if (this.findByQuery) {
        return await this.findByQuery({
          "$expr": {
            "$lt": ["$tracking.amount", "$tracking.minimumLevel"]
          }
        });
      }

      // Fallback to client-side filtering
      const items = await this.findAll({});
      return items.filter(item => 
        item.tracking && 
        item.tracking.amount < item.tracking.minimumLevel
      );
    } catch (error) {
      console.error("Error getting items below minimum:", error);
      throw error;
    }
  }

  /**
   * Get item inventory value calculations
   * 
   * @param {string} id - Item ID
   * @return {Promise<Object>} Inventory value information
   */
  async getInventoryValue(id) {
    try {
      const item = await this.findById(id);
      if (!item) {
        throw new Error(`Item with ID ${id} not found`);
      }

      const baseItem = new BaseItem(item);
      const value = baseItem.calculateInventoryValue();

      return {
        id: item.id,
        sku: item.sku,
        name: item.name,
        quantity: item.tracking.amount,
        unit: item.tracking.unit,
        averageCost: item.tracking.averageCost,
        totalValue: value,
        valuationMethod: item.tracking.valuationMethod,
        lastUpdated: item.tracking.lastUpdated
      };
    } catch (error) {
      console.error(`Error getting inventory value for item ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get total inventory value across all items
   * 
   * @param {Object} filter - Optional filter criteria
   * @return {Promise<Object>} Total inventory value and item count
   */
  async getTotalInventoryValue(filter = {}) {
    try {
      const items = await this.findAll(filter);
      
      let totalValue = 0;
      let itemCount = 0;
      
      items.forEach(item => {
        const baseItem = new BaseItem(item);
        const value = baseItem.calculateInventoryValue();
        
        if (value > 0) {
          totalValue += value;
          itemCount++;
        }
      });
      
      return {
        totalValue,
        itemCount,
        averageItemValue: itemCount > 0 ? totalValue / itemCount : 0
      };
    } catch (error) {
      console.error("Error calculating total inventory value:", error);
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

module.exports = BaseItemRepository;