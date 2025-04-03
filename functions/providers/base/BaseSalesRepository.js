const SalesRepository = require("../interfaces/salesRepository");

/**
 * Base implementation of SalesRepository with common functionality
 * @abstract
 */
class BaseSalesRepository extends SalesRepository {
  /**
   * Creates a new instance of BaseSalesRepository
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
   * Update inventory when creating a sale
   * @param {Array} items Items in the sale
   * @param {Object} [transaction] Database transaction/session
   * @return {Promise<void>}
   */
  async updateInventoryForSale(items, transaction) {
    try {
      // This method requires access to the ItemRepository
      // The specific implementation will need to provide this
      if (!this.itemRepository) {
        throw new Error("ItemRepository not available in BaseSalesRepository");
      }

      for (const saleItem of items) {
        if (!saleItem.item) continue;

        const itemId = typeof saleItem.item ===
          "object" ? saleItem.item._id : saleItem.item;
        const item = await this.itemRepository.findById(itemId);

        if (!item) {
          console.warn(`Item ${itemId} not found
            when updating inventory for sale`);
          continue;
        }

        // Decrease quantity by the sold amount
        const newQuantity = Math.max(0, item.quantity - saleItem.quantity);

        // Create update payload based on item's tracking type
        const updateData = {quantity: newQuantity};

        // Update the item
        await this.itemRepository.update(itemId, updateData, transaction);
      }
    } catch (error) {
      console.error("Error updating inventory for sale:", error);
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
          createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate),
          },
        };
      }

      // Combine filters
      const combinedFilter = {...filter, ...dateFilter};

      // Get sales within the date range
      const sales = await this.findAll(combinedFilter);

      // Calculate metrics
      const totalSales = sales.length;
      const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
      const averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;

      return {
        totalSales,
        totalRevenue,
        averageOrderValue,
        sales,
      };
    } catch (error) {
      console.error("Error generating sales report:", error);
      throw error;
    }
  }
}

module.exports = BaseSalesRepository;
