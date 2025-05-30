/**
 * Purchase Item Service
 * Provides business logic and operations for purchase items
 */

const BaseItemService = require("./baseItemService");

/**
 * Service for managing purchase item operations
 * @extends BaseItemService
 */
class PurchaseItemService extends BaseItemService {
  /**
   * Creates a new PurchaseItemService instance
   * @param {Object} repository - Purchase item repository instance
   * @param {Object} config - Configuration options
   */
  constructor(repository, config = {}) {
    super(repository, config);
    this.purchaseRepository = null;
  }

  /**
   * Set the purchase repository dependency
   * @param {Object} repository - Purchase repository instance
   */
  setPurchaseRepository(repository) {
    this.purchaseRepository = repository;
  }

  /**
   * Find purchase items by purchase ID
   * @param {string} purchaseId - Purchase ID
   * @param {Object} options - Query options
   * @return {Promise<Array>} - List of purchase items
   */
  async findByPurchaseId(purchaseId, options = {}) {
    try {
      return await this.repository.findByPurchaseId(purchaseId, options);
    } catch (error) {
      console.error(`Error finding purchase items for purchase ${purchaseId}:`, error);
      throw error;
    }
  }

  /**
   * Get items with purchase history
   * @param {Object} options - Query options
   * @return {Promise<Array>} - List of items with purchase history
   */
  async getItemsWithPurchaseHistory(options = {}) {
    try {
      return await this.repository.getItemsWithPurchaseHistory(options);
    } catch (error) {
      console.error("Error getting items with purchase history:", error);
      throw error;
    }
  }

  /**
   * Calculate average purchase cost
   * @param {string} itemId - Item ID
   * @param {Object} options - Calculation options
   * @return {Promise<number>} - Average purchase cost
   */
  async calculateAveragePurchaseCost(itemId, options = {}) {
    try {
      return await this.repository.calculateAveragePurchaseCost(itemId, options);
    } catch (error) {
      console.error(`Error calculating average purchase cost for item ${itemId}:`, error);
      throw error;
    }
  }

  /**
   * Get purchase history for an item
   * @param {string} itemId - Item ID
   * @param {Object} options - Query options
   * @return {Promise<Array>} - Purchase history
   */
  async getPurchaseHistory(itemId, options = {}) {
    try {
      return await this.repository.getPurchaseHistory(itemId, options);
    } catch (error) {
      console.error(`Error getting purchase history for item ${itemId}:`, error);
      throw error;
    }
  }

  /**
   * Create purchase items as part of a transaction
   * @param {Array<Object>} items - Array of purchase item data
   * @param {string} purchaseId - Purchase transaction ID
   * @param {Object} transaction - Database transaction
   * @return {Promise<Array>} - Created purchase items
   */
  async createPurchaseItems(items, purchaseId, transaction = null) {
    try {
      if (!items || !Array.isArray(items) || items.length === 0) {
        return [];
      }

      // Add purchaseId to all items
      const itemsWithPurchase = items.map(item => ({
        ...item,
        purchaseId
      }));

      // Use createMany instead of individual creates for better performance
      return await this.createMany(itemsWithPurchase, { transaction });
    } catch (error) {
      console.error(`Error creating purchase items for purchase ${purchaseId}:`, error);
      throw error;
    }
  }

  /**
   * Update purchase items as part of a transaction
   * @param {string} purchaseId - Purchase transaction ID
   * @param {Array<Object>} items - Array of purchase item data
   * @param {Object} transaction - Database transaction
   * @return {Promise<Array>} - Updated purchase items
   */
  async updatePurchaseItems(purchaseId, items, transaction = null) {
    try {
      if (!items || !Array.isArray(items)) {
        return [];
      }

      // Get existing items for this purchase
      const existingItems = await this.repository.findByPurchaseId(purchaseId);
      const existingItemIds = existingItems.map(item => item._id.toString());
      
      // Separate items to create, update, and delete
      const itemsToCreate = items.filter(item => !item._id);
      const itemsToUpdate = items.filter(item => item._id && existingItemIds.includes(item._id.toString()));
      const idsToKeep = itemsToUpdate.map(item => item._id.toString());
      const idsToDelete = existingItemIds.filter(id => !idsToKeep.includes(id));
      
      // Perform operations
      const createdItems = await this.createPurchaseItems(itemsToCreate, purchaseId, transaction);
      
      const updatedItems = [];
      for (const item of itemsToUpdate) {
        // Ensure purchaseId is set correctly
        item.purchaseId = purchaseId;
        const updated = await this.update(item._id, item, { transaction });
        updatedItems.push(updated);
      }
      
      // Delete removed items
      if (idsToDelete.length > 0) {
        await this.deleteMany(idsToDelete, { transaction });
      }
      
      return [...createdItems, ...updatedItems];
    } catch (error) {
      console.error(`Error updating purchase items for purchase ${purchaseId}:`, error);
      throw error;
    }
  }
}

module.exports = PurchaseItemService;