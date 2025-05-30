/**
 * Sale Item Repository
 * Implements provider-agnostic business logic and operations for the Sale Item entity
 */

const BaseItemRepository = require("./baseItemRepository");
const SaleItemInterface = require("../interfaces/saleItemInterface");
// eslint-disable-next-line no-unused-vars
const {SaleItem} = require("../../models/saleItemModel");

/**
 * Base repository for Sale Item operations with provider-agnostic implementation
 * @extends BaseItemRepository
 * @implements SaleItemInterface
 */
class SaleItemRepository extends BaseItemRepository {
  /**
   * Creates a new SaleItemRepository instance
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    super(config);
    this.saleRepository = null;
    this.purchaseItemRepository = null;
  }

  /**
   * Set the sale repository dependency
   * @param {Object} repository - Sale repository instance
   */
  setSaleRepository(repository) {
    this.saleRepository = repository;
  }

  /**
   * Set the purchase item repository dependency for cost calculations
   * @param {Object} repository - Purchase item repository instance
   */
  setPurchaseItemRepository(repository) {
    this.purchaseItemRepository = repository;
  }

  /**
   * Find sale items by sale ID
   * @param {string} saleId - Sale ID
   * @param {Object} options - Query options
   * @return {Promise<Array>} - List of sale items
   */
  async findBySaleId(saleId, options = {}) {
    try {
      const filter = {
        saleId: saleId,
        ...options.filter,
      };
      
      return await this.findAll(filter, options);
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
      // Implementation depends on specific provider
      throw new Error("Not implemented in base class");
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
      const {
        dateFrom,
        dateTo,
        limit = 10,
      } = options;

      // Build filter
      const filter = { itemId };
      
      if (dateFrom || dateTo) {
        filter.saleDate = {};
        if (dateFrom) filter.saleDate.$gte = new Date(dateFrom);
        if (dateTo) filter.saleDate.$lte = new Date(dateTo);
      }

      // Get sale items for this item
      const saleItems = await this.findAll(filter, { 
        limit,
        sort: { saleDate: -1 }
      });

      if (!saleItems || saleItems.length === 0) {
        return 0;
      }

      // Calculate average price
      const totalPrice = saleItems.reduce((sum, item) => {
        return sum + (item.unitPrice * item.quantity);
      }, 0);

      const totalQuantity = saleItems.reduce((sum, item) => {
        return sum + item.quantity;
      }, 0);

      return totalQuantity > 0 ? totalPrice / totalQuantity : 0;
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
      const {
        dateFrom,
        dateTo,
        limit,
        skip = 0,
      } = options;

      // Build filter
      const filter = { itemId };
      
      if (dateFrom || dateTo) {
        filter.saleDate = {};
        if (dateFrom) filter.saleDate.$gte = new Date(dateFrom);
        if (dateTo) filter.saleDate.$lte = new Date(dateTo);
      }

      // Get sale items for this item
      const saleItems = await this.findAll(filter, { 
        limit,
        skip,
        sort: { saleDate: -1 }
      });

      // Enrich with sale information if repository is available
      if (this.saleRepository && saleItems.length > 0) {
        const saleIds = [...new Set(saleItems.map(item => item.saleId))];
        const sales = await this.saleRepository.findByIds(saleIds);
        
        const salesById = sales.reduce((map, sale) => {
          map[sale._id] = sale;
          return map;
        }, {});

        // Add sale info to each item
        return saleItems.map(item => ({
          ...item,
          sale: salesById[item.saleId] || null
        }));
      }

      return saleItems;
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
      // Calculate average sale price
      const avgSalePrice = await this.calculateAverageSalePrice(itemId, options);
      
      // Calculate average purchase cost (if purchase repository is available)
      let avgPurchaseCost = 0;
      if (this.purchaseItemRepository) {
        avgPurchaseCost = await this.purchaseItemRepository.calculateAveragePurchaseCost(
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
    } catch (error) {
      console.error(`Error calculating profit margin for item ${itemId}:`, error);
      throw error;
    }
  }
}

// Ensure the repository implements the interface
Object.getOwnPropertyNames(SaleItemInterface.prototype)
  .filter(prop => prop !== "constructor")
  .forEach(method => {
    if (!SaleItemRepository.prototype[method]) {
      throw new Error(
        `SaleItemRepository must implement ${method} from SaleItemInterface`
      );
    }
  });

module.exports = SaleItemRepository;