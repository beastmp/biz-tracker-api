/**
 * Purchase Item Repository
 * Implements provider-agnostic business logic and operations for the Purchase Item entity
 */

const BaseItemRepository = require("./baseItemRepository");
const PurchaseItemInterface = require("../interfaces/purchaseItemInterface");
// eslint-disable-next-line no-unused-vars
const {PurchaseItem} = require("../../models/purchaseItemModel");

/**
 * Base repository for Purchase Item operations with provider-agnostic implementation
 * @extends BaseItemRepository
 * @implements PurchaseItemInterface
 */
class PurchaseItemRepository extends BaseItemRepository {
  /**
   * Creates a new PurchaseItemRepository instance
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    super(config);
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
      const filter = {
        purchaseId: purchaseId,
        ...options.filter,
      };
      
      return await this.findAll(filter, options);
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
      // Implementation depends on specific provider
      throw new Error("Not implemented in base class");
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
      const {
        dateFrom,
        dateTo,
        limit = 10,
      } = options;

      // Build filter
      const filter = { itemId };
      
      if (dateFrom || dateTo) {
        filter.purchaseDate = {};
        if (dateFrom) filter.purchaseDate.$gte = new Date(dateFrom);
        if (dateTo) filter.purchaseDate.$lte = new Date(dateTo);
      }

      // Get purchase items for this item
      const purchaseItems = await this.findAll(filter, { 
        limit,
        sort: { purchaseDate: -1 }
      });

      if (!purchaseItems || purchaseItems.length === 0) {
        return 0;
      }

      // Calculate average cost
      const totalCost = purchaseItems.reduce((sum, item) => {
        return sum + (item.unitCost * item.quantity);
      }, 0);

      const totalQuantity = purchaseItems.reduce((sum, item) => {
        return sum + item.quantity;
      }, 0);

      return totalQuantity > 0 ? totalCost / totalQuantity : 0;
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
      const {
        dateFrom,
        dateTo,
        limit,
        skip = 0,
      } = options;

      // Build filter
      const filter = { itemId };
      
      if (dateFrom || dateTo) {
        filter.purchaseDate = {};
        if (dateFrom) filter.purchaseDate.$gte = new Date(dateFrom);
        if (dateTo) filter.purchaseDate.$lte = new Date(dateTo);
      }

      // Get purchase items for this item
      const purchaseItems = await this.findAll(filter, { 
        limit,
        skip,
        sort: { purchaseDate: -1 }
      });

      // Enrich with purchase information if repository is available
      if (this.purchaseRepository && purchaseItems.length > 0) {
        const purchaseIds = [...new Set(purchaseItems.map(item => item.purchaseId))];
        const purchases = await this.purchaseRepository.findByIds(purchaseIds);
        
        const purchasesById = purchases.reduce((map, purchase) => {
          map[purchase._id] = purchase;
          return map;
        }, {});

        // Add purchase info to each item
        return purchaseItems.map(item => ({
          ...item,
          purchase: purchasesById[item.purchaseId] || null
        }));
      }

      return purchaseItems;
    } catch (error) {
      console.error(`Error getting purchase history for item ${itemId}:`, error);
      throw error;
    }
  }
}

// Ensure the repository implements the interface
Object.getOwnPropertyNames(PurchaseItemInterface.prototype)
  .filter(prop => prop !== "constructor")
  .forEach(method => {
    if (!PurchaseItemRepository.prototype[method]) {
      throw new Error(
        `PurchaseItemRepository must implement ${method} from PurchaseItemInterface`
      );
    }
  });

module.exports = PurchaseItemRepository;