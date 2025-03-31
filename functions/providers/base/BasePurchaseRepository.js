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
   * Base implementation of report generation
   * @param {Object} filter Query filters
   * @param {string} [startDate] Start date for report
   * @param {string} [endDate] End date for report
   * @return {Promise<Object>} Report data
   */
  async getReport(filter, startDate, endDate) {
    try {
      // Create date filters if provided
      let dateFilter = {};
      if (startDate && endDate) {
        dateFilter = {
          purchaseDate: {
            $gte: new Date(startDate),
            $lte: new Date(endDate),
          },
        };
      }

      // Combine filters
      const combinedFilter = {...filter, ...dateFilter};

      // Get purchases within the date range
      const purchases = await this.findAll(combinedFilter);

      // Calculate metrics
      const totalPurchases = purchases.length;
      const totalSpent = purchases.reduce((sum, purchase) =>
        sum + purchase.total, 0);
      const averagePurchaseValue = totalPurchases > 0 ?
        totalSpent / totalPurchases : 0;

      return {
        totalPurchases,
        totalSpent,
        averagePurchaseValue,
        purchases,
      };
    } catch (error) {
      console.error("Error generating purchase report:", error);
      throw error;
    }
  }
}

module.exports = BasePurchaseRepository;
