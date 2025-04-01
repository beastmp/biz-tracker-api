/**
 * @interface SalesRepository
 * Interface that defines methods
 * each sales repository implementation must provide
 */
class SalesRepository {
  /**
   * Find all sales matching filter criteria
   * @param {Object} filter Query filters (e.g., {businessId})
   * @return {Promise<Array>} List of sales
   */
  async findAll(filter = {}) {
    throw new Error("Method not implemented");
  }

  /**
   * Find sale by ID
   * @param {string} id Sale ID
   * @return {Promise<Object|null>} Sale object or null if not found
   */
  async findById(id) {
    throw new Error("Method not implemented");
  }

  /**
   * Create a new sale
   * @param {Object} saleData Sale data
   * @param {Object} [transaction] Database transaction/session
   * @return {Promise<Object>} Created sale
   */
  async create(saleData, transaction) {
    throw new Error("Method not implemented");
  }

  /**
   * Update an existing sale
   * @param {string} id Sale ID
   * @param {Object} saleData Updated sale data
   * @param {Object} [transaction] Database transaction/session
   * @return {Promise<Object|null>} Updated sale or null if not found
   */
  async update(id, saleData, transaction) {
    throw new Error("Method not implemented");
  }

  /**
   * Delete a sale
   * @param {string} id Sale ID
   * @param {Object} [transaction] Database transaction/session
   * @return {Promise<boolean>} True if deleted, false if not found
   */
  async delete(id, transaction) {
    throw new Error("Method not implemented");
  }

  /**
   * Update inventory when creating a sale
   * @param {Array} items Items in the sale
   * @param {Object} [transaction] Database transaction/session
   * @return {Promise<void>}
   */
  async updateInventoryForSale(items, transaction) {
    throw new Error("Method not implemented");
  }

  /**
   * Update inventory when updating a sale
   * @param {Array} originalItems Original items in the sale
   * @param {Array} updatedItems Updated items in the sale
   * @param {Object} [transaction] Database transaction/session
   * @return {Promise<void>}
   */
  async updateInventoryForSaleUpdate(originalItems, updatedItems, transaction) {
    throw new Error("Method not implemented");
  }

  /**
   * Restore inventory when deleting a sale
   * @param {Array} items Items in the sale
   * @param {Object} [transaction] Database transaction/session
   * @return {Promise<void>}
   */
  async restoreInventoryForSale(items, transaction) {
    throw new Error("Method not implemented");
  }

  /**
   * Get sales report
   * @param {Object} filter Query filters
   * @param {string} [startDate] Start date for report
   * @param {string} [endDate] End date for report
   * @return {Promise<Object>} Report data
   */
  async getReport(filter, startDate, endDate) {
    throw new Error("Method not implemented");
  }

  /**
   * Get sales trends
   * @param {Object} filter Query filters
   * @param {string} startDate Start date for trends
   * @param {string} endDate End date for trends
   * @return {Promise<Object>} Trends data
   */
  async getTrends(filter, startDate, endDate) {
    throw new Error("Method not implemented");
  }

  /**
   * Get all sales containing a specific item
   * @param {string} itemId - ID of the item to filter by
   * @return {Promise<Array>} List of sales containing the item
   */
  async getAllByItemId(itemId) {
    throw new Error("Method not implemented");
  }
}

module.exports = SalesRepository;
