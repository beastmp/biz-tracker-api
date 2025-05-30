/**
 * Purchase Transaction Interface
 * Defines the provider-agnostic contract that all purchase transaction repository
 * implementations must follow
 */

const BaseTransactionInterface = require("./baseTransactionInterface");

/**
 * Purchase Transaction Interface class defining the contract for purchase transaction operations
 * @extends BaseTransactionInterface
 */
class PurchaseTransactionInterface extends BaseTransactionInterface {
  /**
   * Find transactions by supplier ID
   * @param {string} supplierId - Supplier ID
   * @param {Object} options - Query options
   * @return {Promise<Array>} - List of purchase transactions
   */
  async findBySupplier(supplierId, options = {}) {
    throw new Error("Method 'findBySupplier' must be implemented");
  }

  /**
   * Calculate total spend by supplier
   * @param {string} supplierId - Supplier ID
   * @param {Object} options - Date range options
   * @return {Promise<number>} - Total spend amount
   */
  async calculateTotalSpendBySupplier(supplierId, options = {}) {
    throw new Error("Method 'calculateTotalSpendBySupplier' must be implemented");
  }

  /**
   * Get purchase history summary
   * @param {Object} options - Filter and grouping options
   * @return {Promise<Array>} - Summary data
   */
  async getPurchaseHistorySummary(options = {}) {
    throw new Error("Method 'getPurchaseHistorySummary' must be implemented");
  }

  /**
   * Generate purchase report
   * @param {Object} options - Report criteria and options
   * @return {Promise<Object>} - Report data
   */
  async generatePurchaseReport(options = {}) {
    throw new Error("Method 'generatePurchaseReport' must be implemented");
  }
}

module.exports = PurchaseTransactionInterface;