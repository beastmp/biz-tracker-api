/**
 * Sale Transaction Interface
 * Defines the provider-agnostic contract that all sale transaction repository
 * implementations must follow
 */

const BaseTransactionInterface = require("./baseTransactionInterface");

/**
 * Sale Transaction Interface class defining the contract for sale transaction operations
 * @extends BaseTransactionInterface
 */
class SaleTransactionInterface extends BaseTransactionInterface {
  /**
   * Find transactions by customer ID
   * @param {string} customerId - Customer ID
   * @param {Object} options - Query options
   * @return {Promise<Array>} - List of sale transactions
   */
  async findByCustomer(customerId, options = {}) {
    throw new Error("Method 'findByCustomer' must be implemented");
  }

  /**
   * Calculate total revenue by customer
   * @param {string} customerId - Customer ID
   * @param {Object} options - Date range options
   * @return {Promise<number>} - Total revenue amount
   */
  async calculateTotalRevenueByCustomer(customerId, options = {}) {
    throw new Error("Method 'calculateTotalRevenueByCustomer' must be implemented");
  }

  /**
   * Get sale history summary
   * @param {Object} options - Filter and grouping options
   * @return {Promise<Array>} - Summary data
   */
  async getSaleHistorySummary(options = {}) {
    throw new Error("Method 'getSaleHistorySummary' must be implemented");
  }

  /**
   * Generate sales report
   * @param {Object} options - Report criteria and options
   * @return {Promise<Object>} - Report data
   */
  async generateSalesReport(options = {}) {
    throw new Error("Method 'generateSalesReport' must be implemented");
  }

  /**
   * Calculate profit margins
   * @param {Object} options - Calculation options
   * @return {Promise<Object>} - Profit margin data
   */
  async calculateProfitMargins(options = {}) {
    throw new Error("Method 'calculateProfitMargins' must be implemented");
  }
}

module.exports = SaleTransactionInterface;