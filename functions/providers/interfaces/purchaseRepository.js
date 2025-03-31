/**
 * @interface PurchaseRepository
 * Interface that defines methods
 * each purchase repository implementation must provide
 */
class PurchaseRepository {
  /**
   * Find all purchases matching filter criteria
   * @param {Object} filter Query filters (e.g., {businessId})
   * @return {Promise<Array>} List of purchases
   */
  async findAll(filter = {}) {
    throw new Error("Method not implemented");
  }

  /**
   * Find purchase by ID
   * @param {string} id Purchase ID
   * @return {Promise<Object|null>} Purchase object or null if not found
   */
  async findById(id) {
    throw new Error("Method not implemented");
  }

  /**
   * Create a new purchase
   * @param {Object} purchaseData Purchase data
   * @param {Object} [transaction] Database transaction/session
   * @return {Promise<Object>} Created purchase
   */
  async create(purchaseData, transaction) {
    throw new Error("Method not implemented");
  }

  /**
   * Update an existing purchase
   * @param {string} id Purchase ID
   * @param {Object} purchaseData Updated purchase data
   * @param {Object} [transaction] Database transaction/session
   * @return {Promise<Object|null>} Updated purchase or null if not found
   */
  async update(id, purchaseData, transaction) {
    throw new Error("Method not implemented");
  }

  /**
   * Delete a purchase
   * @param {string} id Purchase ID
   * @param {Object} [transaction] Database transaction/session
   * @return {Promise<boolean>} True if deleted, false if not found
   */
  async delete(id, transaction) {
    throw new Error("Method not implemented");
  }

  /**
   * Update inventory when creating a purchase
   * @param {Array} items Items in the purchase
   * @param {Object} [transaction] Database transaction/session
   * @return {Promise<void>}
   */
  async updateInventoryForPurchase(items, transaction) {
    throw new Error("Method not implemented");
  }

  /**
   * Update inventory when updating a purchase
   * @param {Array} originalItems Original items in the purchase
   * @param {Array} updatedItems Updated items in the purchase
   * @param {Object} [transaction] Database transaction/session
   * @return {Promise<void>}
   */
  async updateInventoryForPurchaseUpdate(originalItems,
      updatedItems, transaction) {
    throw new Error("Method not implemented");
  }

  /**
   * Revert inventory when deleting a purchase
   * @param {Array} items Items in the purchase
   * @param {Object} [transaction] Database transaction/session
   * @return {Promise<void>}
   */
  async revertInventoryForPurchase(items, transaction) {
    throw new Error("Method not implemented");
  }

  /**
   * Get purchase report
   * @param {Object} filter Query filters
   * @param {string} [startDate] Start date for report
   * @param {string} [endDate] End date for report
   * @return {Promise<Object>} Report data
   */
  async getReport(filter, startDate, endDate) {
    throw new Error("Method not implemented");
  }

  /**
   * Get purchase trends
   * @param {Object} filter Query filters
   * @param {string} startDate Start date for trends
   * @param {string} endDate End date for trends
   * @return {Promise<Object>} Trends data
   */
  async getTrends(filter, startDate, endDate) {
    throw new Error("Method not implemented");
  }
}

module.exports = PurchaseRepository;
