const PurchaseRepository = require("../interfaces/purchaseRepository");

/**
 * Base implementation of PurchaseRepository with common functionality
 * @abstract
 */
class BasePurchaseRepository extends PurchaseRepository {
  /**
   * Creates a new instance of BasePurchaseRepository
   */
  constructor() {
    super();
    this.itemRepository = null;
  }

  /**
   * Set the item repository dependency
   * @param {ItemRepository} itemRepository The item repository implementation
   */
  setItemRepository(itemRepository) {
    this.itemRepository = itemRepository;
  }

  /**
   * Update inventory when creating a purchase
   * @param {Array} items Items in the purchase
   * @param {Object} [transaction] Database transaction/session
   * @return {Promise<void>}
   */
  async updateInventoryForPurchase(items, transaction) {
    try {
      // This method requires access to the ItemRepository
      // The specific implementation will need to provide this
      if (!this.itemRepository) {
        throw new Error(`ItemRepository not available
          in BasePurchaseRepository`);
      }

      for (const purchaseItem of items) {
        if (!purchaseItem.item) continue;

        const itemId = typeof purchaseItem.item ===
          "object" ? purchaseItem.item._id : purchaseItem.item;
        const item = await this.itemRepository.findById(itemId);

        if (!item) {
          console.warn(`Item ${itemId} not found
            when updating inventory for purchase`);
          continue;
        }

        let updateData = {};

        // Handle different tracking types
        if (purchaseItem.weight && item.trackingType === "weight") {
          // For weight tracked items
          const newWeight = (item.weight || 0) + (purchaseItem.weight || 0);
          updateData = {weight: newWeight};
        } else {
          // For quantity tracked items (default)
          const newQuantity = (item.quantity || 0) +
            (purchaseItem.quantity || 0);
          updateData = {quantity: newQuantity};
        }

        // Update the item
        await this.itemRepository.update(itemId, updateData, transaction);
      }
    } catch (error) {
      console.error("Error updating inventory for purchase:", error);
      throw error;
    }
  }

  /**
   * Get purchase report
   * @param {Object} filter Query filters
   * @param {string} [startDate] Start date for report
   * @param {string} [endDate] End date for report
   * @return {Promise<Object>} Report data
   */
  async getReport(filter, startDate, endDate) {
    try {
      // Get purchases within date range
      const query = {...filter};
      if (startDate || endDate) {
        query.purchaseDate = {};
        if (startDate) {
          query.purchaseDate.$gte = new Date(startDate);
        }
        if (endDate) {
          query.purchaseDate.$lte = new Date(endDate);
        }
      }

      const purchases = await this.findAll(query);

      // Calculate report statistics
      const totalPurchases = purchases.length;
      const totalCost = purchases.reduce((sum, purchase) =>
        sum + purchase.total, 0);
      const averagePurchaseValue = totalPurchases > 0 ?
        totalCost / totalPurchases : 0;

      return {
        totalPurchases,
        totalCost,
        averagePurchaseValue,
        purchases,
      };
    } catch (error) {
      console.error("Error generating purchase report:", error);
      throw error;
    }
  }

  /**
   * Get purchase trends
   * @param {Object} filter Query filters
   * @param {string} startDate Start date for trends
   * @param {string} endDate End date for trends
   * @return {Promise<Object>} Trends data
   */
  async getTrends(filter, startDate, endDate) {
    try {
      // Get purchases within date range
      const query = {...filter};
      if (startDate || endDate) {
        query.purchaseDate = {};
        if (startDate) {
          query.purchaseDate.$gte = new Date(startDate);
        }
        if (endDate) {
          query.purchaseDate.$lte = new Date(endDate);
        }
      }

      const purchases = await this.findAll(query);

      // Group purchases by date
      const trendData = {};
      purchases.forEach((purchase) => {
        // Format the date as YYYY-MM-DD
        const date = purchase.purchaseDate ?
          new Date(purchase.purchaseDate).toISOString().split("T")[0] :
          new Date().toISOString().split("T")[0];

        if (!trendData[date]) {
          trendData[date] = {
            date,
            count: 0,
            total: 0,
            measurementBreakdown: {
              quantity: {count: 0, total: 0},
              weight: {count: 0, total: 0},
              length: {count: 0, total: 0},
              area: {count: 0, total: 0},
              volume: {count: 0, total: 0},
            },
          };
        }

        trendData[date].count += 1;
        trendData[date].total += purchase.total;

        // Analyze items by measurement type
        purchase.items.forEach((item) => {
          const measurementType = item.purchasedBy || "quantity";
          trendData[date].measurementBreakdown[measurementType].count += 1;
          trendData[date].measurementBreakdown[measurementType].total +=
            item.totalCost;
        });
      });

      // Convert to array and sort by date
      return Object.values(trendData).sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
    } catch (error) {
      console.error("Error generating purchase trends:", error);
      throw error;
    }
  }

  /**
   * Get all purchases containing a specific item
   * @param {string} itemId - ID of the item to filter by
   * @return {Promise<Array>} List of purchases containing the item
   */
  async getAllByItemId(itemId) {
    try {
      // This is a basic implementation that filters in memory
      const allPurchases = await this.findAll({});
      return allPurchases.filter((purchase) =>
        purchase.items.some((item) =>
          (typeof item.item === "string" && item.item === itemId) ||
          (item.item && item.item._id === itemId),
        ),
      );
    } catch (error) {
      console.error(`Error getting purchases by item ID ${itemId}:`, error);
      throw error;
    }
  }

  /**
   * Create a business asset from a purchase item
   * @param {string} purchaseId - ID of the purchase
   * @param {number} itemIndex - Index of the item in the purchase
   * @param {Object} assetData - Additional asset data
   * @return {Promise<Object>} Created business asset
   */
  async createAssetFromPurchaseItem(purchaseId, itemIndex, assetData) {
    throw new Error("Method not implemented: createAssetFromPurchaseItem");
  }
}

module.exports = BasePurchaseRepository;
