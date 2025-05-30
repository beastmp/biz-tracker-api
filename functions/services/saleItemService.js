/**
 * Sale Item Service
 * Provides business logic and operations for sale items
 */

const BaseItemService = require("./baseItemService");

/**
 * Service for managing sale item operations
 * @extends BaseItemService
 */
class SaleItemService extends BaseItemService {
  /**
   * Creates a new SaleItemService instance
   * @param {Object} repository - Sale item repository instance
   * @param {Object} config - Configuration options
   */
  constructor(repository, config = {}) {
    super(repository, config);
    this.saleRepository = null;
    this.purchaseItemService = null;
  }

  /**
   * Set the sale repository dependency
   * @param {Object} repository - Sale repository instance
   */
  setSaleRepository(repository) {
    this.saleRepository = repository;
  }

  /**
   * Set the purchase item service dependency for cost and profit calculations
   * @param {Object} service - Purchase item service instance
   */
  setPurchaseItemService(service) {
    this.purchaseItemService = service;
  }

  /**
   * Find sale items by sale ID
   * @param {string} saleId - Sale ID
   * @param {Object} options - Query options
   * @return {Promise<Array>} - List of sale items
   */
  async findBySaleId(saleId, options = {}) {
    try {
      return await this.repository.findBySaleId(saleId, options);
    } catch (error) {
      console.error(`Error finding sale items for sale ${saleId}:`, error);
      throw error;
    }
  }

  /**
   * Get items with sale history
   * @param {Object} options - Query options
   * @return {Promise<Array>} - List of items with sale history
   */
  async getItemsWithSaleHistory(options = {}) {
    try {
      return await this.repository.getItemsWithSaleHistory(options);
    } catch (error) {
      console.error("Error getting items with sale history:", error);
      throw error;
    }
  }

  /**
   * Calculate average sale price
   * @param {string} itemId - Item ID
   * @param {Object} options - Calculation options
   * @return {Promise<number>} - Average sale price
   */
  async calculateAverageSalePrice(itemId, options = {}) {
    try {
      return await this.repository.calculateAverageSalePrice(itemId, options);
    } catch (error) {
      console.error(`Error calculating average sale price for item ${itemId}:`, error);
      throw error;
    }
  }

  /**
   * Get sale history for an item
   * @param {string} itemId - Item ID
   * @param {Object} options - Query options
   * @return {Promise<Array>} - Sale history
   */
  async getSaleHistory(itemId, options = {}) {
    try {
      return await this.repository.getSaleHistory(itemId, options);
    } catch (error) {
      console.error(`Error getting sale history for item ${itemId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate profit margin for an item
   * @param {string} itemId - Item ID
   * @param {Object} options - Calculation options
   * @return {Promise<Object>} - Profit margin details
   */
  async calculateProfitMargin(itemId, options = {}) {
    try {
      // First attempt to use the repository method
      try {
        return await this.repository.calculateProfitMargin(itemId, options);
      } catch (repoError) {
        // If repository method fails, use the service's own implementation
        console.warn(`Repository profit calculation failed, using service method: ${repoError.message}`);
        
        // Get average sale price
        const avgSalePrice = await this.calculateAverageSalePrice(itemId, options);

        // Get average purchase cost if purchase item service is available
        let avgPurchaseCost = 0;
        if (this.purchaseItemService) {
          avgPurchaseCost = await this.purchaseItemService.calculateAveragePurchaseCost(
            itemId, 
            options
          );
        }

        // Calculate profit and margin
        const profit = avgSalePrice - avgPurchaseCost;
        const marginPercent = avgSalePrice > 0 
          ? (profit / avgSalePrice) * 100 
          : 0;

        return {
          itemId,
          averageSalePrice: avgSalePrice,
          averageCost: avgPurchaseCost,
          profit,
          marginPercent,
          dateRange: {
            from: options.dateFrom,
            to: options.dateTo
          }
        };
      }
    } catch (error) {
      console.error(`Error calculating profit margin for item ${itemId}:`, error);
      throw error;
    }
  }

  /**
   * Create sale items as part of a transaction
   * @param {Array<Object>} items - Array of sale item data
   * @param {string} saleId - Sale transaction ID
   * @param {Object} transaction - Database transaction
   * @return {Promise<Array>} - Created sale items
   */
  async createSaleItems(items, saleId, transaction = null) {
    try {
      if (!items || !Array.isArray(items) || items.length === 0) {
        return [];
      }

      // Add saleId to all items
      const itemsWithSale = items.map(item => ({
        ...item,
        saleId
      }));

      // Use createMany instead of individual creates for better performance
      return await this.createMany(itemsWithSale, { transaction });
    } catch (error) {
      console.error(`Error creating sale items for sale ${saleId}:`, error);
      throw error;
    }
  }

  /**
   * Update sale items as part of a transaction
   * @param {string} saleId - Sale transaction ID
   * @param {Array<Object>} items - Array of sale item data
   * @param {Object} transaction - Database transaction
   * @return {Promise<Array>} - Updated sale items
   */
  async updateSaleItems(saleId, items, transaction = null) {
    try {
      if (!items || !Array.isArray(items)) {
        return [];
      }

      // Get existing items for this sale
      const existingItems = await this.repository.findBySaleId(saleId);
      const existingItemIds = existingItems.map(item => item._id.toString());
      
      // Separate items to create, update, and delete
      const itemsToCreate = items.filter(item => !item._id);
      const itemsToUpdate = items.filter(item => item._id && existingItemIds.includes(item._id.toString()));
      const idsToKeep = itemsToUpdate.map(item => item._id.toString());
      const idsToDelete = existingItemIds.filter(id => !idsToKeep.includes(id));
      
      // Perform operations
      const createdItems = await this.createSaleItems(itemsToCreate, saleId, transaction);
      
      const updatedItems = [];
      for (const item of itemsToUpdate) {
        // Ensure saleId is set correctly
        item.saleId = saleId;
        const updated = await this.update(item._id, item, { transaction });
        updatedItems.push(updated);
      }
      
      // Delete removed items
      if (idsToDelete.length > 0) {
        await this.deleteMany(idsToDelete, { transaction });
      }
      
      return [...createdItems, ...updatedItems];
    } catch (error) {
      console.error(`Error updating sale items for sale ${saleId}:`, error);
      throw error;
    }
  }

  /**
   * Get profit margins summary for multiple items
   * @param {Array<string>} itemIds - Array of item IDs
   * @param {Object} options - Calculation options
   * @return {Promise<Object>} - Profit margins data
   */
  async getProfitMarginsSummary(itemIds, options = {}) {
    try {
      if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
        return {
          items: [],
          summary: {
            totalRevenue: 0,
            totalCost: 0,
            totalProfit: 0,
            averageMargin: 0
          }
        };
      }

      // Get margin data for each item
      const items = [];
      let totalRevenue = 0;
      let totalCost = 0;
      
      for (const itemId of itemIds) {
        const margin = await this.calculateProfitMargin(itemId, options);
        
        if (margin) {
          items.push(margin);
          totalRevenue += (margin.averageSalePrice * (margin.quantitySold || 1));
          totalCost += (margin.averageCost * (margin.quantitySold || 1));
        }
      }
      
      // Calculate overall summary
      const totalProfit = totalRevenue - totalCost;
      const averageMargin = totalRevenue > 0 
        ? (totalProfit / totalRevenue) * 100 
        : 0;

      return {
        items,
        summary: {
          totalRevenue,
          totalCost,
          totalProfit,
          averageMargin,
          dateRange: {
            from: options.dateFrom,
            to: options.dateTo
          }
        }
      };
    } catch (error) {
      console.error("Error getting profit margins summary:", error);
      throw error;
    }
  }
}

module.exports = SaleItemService;