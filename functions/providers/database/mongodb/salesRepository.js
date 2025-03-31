const {BaseSalesRepository} = require("../../base");
const Sale = require("../../../models/sale");
// const Item = require("../../models/item");
// const mongoose = require("mongoose");

/**
 * MongoDB implementation of SalesRepository
 */
class MongoSalesRepository extends BaseSalesRepository {
  /**
   * Creates a new instance of MongoSalesRepository
   * @constructor
   */
  constructor() {
    super();
    this.itemRepository = null; // Will be set by ProviderFactory
  }

  /**
   * Find all sales matching filter criteria
   * @param {Object} filter Query filters
   * @return {Promise<Array>} List of sales
   */
  async findAll(filter = {}) {
    return await Sale.find(filter).sort({createdAt: -1});
  }

  /**
   * Find sale by ID
   * @param {string} id Sale ID
   * @return {Promise<Object|null>} Sale object or null if not found
   */
  async findById(id) {
    return await Sale.findById(id);
  }

  /**
   * Create a new sale
   * @param {Object} saleData Sale data
   * @param {Object} [transaction] Database transaction/session
   * @return {Promise<Object>} Created sale
   */
  async create(saleData, transaction) {
    const options = transaction ? {session: transaction} : {};
    const sale = new Sale(saleData);

    await sale.save(options);
    return sale;
  }

  /**
   * Update an existing sale
   * @param {string} id Sale ID
   * @param {Object} saleData Updated sale data
   * @param {Object} [transaction] Database transaction/session
   * @return {Promise<Object|null>} Updated sale or null if not found
   */
  async update(id, saleData, transaction) {
    const options = transaction ? {session: transaction} : {};

    const sale = await Sale.findById(id);
    if (!sale) return null;

    // Update all provided fields
    Object.keys(saleData).forEach((key) => {
      sale[key] = saleData[key];
    });

    await sale.save(options);
    return sale;
  }

  /**
   * Delete a sale
   * @param {string} id Sale ID
   * @param {Object} [transaction] Database transaction/session
   * @return {Promise<boolean>} True if deleted, false if not found
   */
  async delete(id, transaction) {
    const options = transaction ? {session: transaction} : {};
    const result = await Sale.findByIdAndDelete(id, options);

    return !!result;
  }

  /**
   * Update inventory when creating a sale
   * @param {Array} items Items in the sale
   * @param {Object} [transaction] Database transaction/session
   * @return {Promise<void>}
   */
  async updateInventoryForSale(items, transaction) {
    if (!this.itemRepository) {
      throw new Error("ItemRepository not available in MongoSalesRepository");
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

      // Update the item
      await this.itemRepository.update(itemId,
          {quantity: newQuantity}, transaction);
    }
  }

  /**
   * Update inventory when updating a sale
   * @param {Array} originalItems Original items in the sale
   * @param {Array} updatedItems Updated items in the sale
   * @param {Object} [transaction] Database transaction/session
   * @return {Promise<void>}
   */
  async updateInventoryForSaleUpdate(originalItems, updatedItems, transaction) {
    // First, restore inventory for original items
    await this.restoreInventoryForSale(originalItems, transaction);

    // Then, update inventory for the new items
    await this.updateInventoryForSale(updatedItems, transaction);
  }

  /**
   * Restore inventory when deleting a sale
   * @param {Array} items Items in the sale
   * @param {Object} [transaction] Database transaction/session
   * @return {Promise<void>}
   */
  async restoreInventoryForSale(items, transaction) {
    if (!this.itemRepository) {
      throw new Error("ItemRepository not available in MongoSalesRepository");
    }

    for (const saleItem of items) {
      if (!saleItem.item) continue;

      const itemId = typeof saleItem.item ===
        "object" ? saleItem.item._id : saleItem.item;
      const item = await this.itemRepository.findById(itemId);

      if (!item) {
        console.warn(`Item ${itemId} not found
          when restoring inventory for sale`);
        continue;
      }

      // Increase quantity by the sold amount
      const newQuantity = (item.quantity || 0) + saleItem.quantity;

      // Update the item
      await this.itemRepository.update(itemId,
          {quantity: newQuantity}, transaction);
    }
  }

  /**
   * Get sales report
   * @param {Object} filter Query filters
   * @param {string} [startDate] Start date for report
   * @param {string} [endDate] End date for report
   * @return {Promise<Object>} Report data
   */
  async getReport(filter, startDate, endDate) {
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
  }

  /**
   * Get sales trends
   * @param {Object} filter Query filters
   * @param {string} startDate Start date for trends
   * @param {string} endDate End date for trends
   * @return {Promise<Object>} Trends data
   */
  async getTrends(filter, startDate, endDate) {
    const dateFilter = {
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    };

    const combinedFilter = {...filter, ...dateFilter};

    // Get daily sales
    const dailySales = await Sale.aggregate([
      {$match: combinedFilter},
      {
        $group: {
          _id: {
            year: {$year: "$createdAt"},
            month: {$month: "$createdAt"},
            day: {$dayOfMonth: "$createdAt"},
          },
          count: {$sum: 1},
          total: {$sum: "$total"},
        },
      },
      {$sort: {"_id.year": 1, "_id.month": 1, "_id.day": 1}},
    ]);

    // Format results for front-end visualization
    const formattedResults = dailySales.map((day) => ({
      date: `${day._id.year}-${day._id.month.toString().padStart(2, "0")}
        -${day._id.day.toString().padStart(2, "0")}`,
      sales: day.count,
      revenue: day.total,
    }));

    return {
      trends: formattedResults,
      summary: {
        totalDays: formattedResults.length,
        averageDailySales: formattedResults.reduce((sum, day) =>
          sum + day.sales, 0) / Math.max(1, formattedResults.length),
        averageDailyRevenue: formattedResults.reduce((sum, day) =>
          sum + day.revenue, 0) / Math.max(1, formattedResults.length),
      },
    };
  }
}

module.exports = MongoSalesRepository;
