/**
 * Sale Item Interface
 * Defines the provider-agnostic contract that all sale item repository
 * implementations must follow
 */

const BaseItemInterface = require("./baseItemInterface");

/**
 * Sale Item Interface class defining the contract for sale item operations
 * @extends BaseItemInterface
 */
class SaleItemInterface extends BaseItemInterface {
  /**
   * Find sale items by sale ID
   * @param {string} saleId - Sale ID
   * @param {Object} options - Query options
   * @return {Promise<Array>} - List of sale items
   */
  async findBySaleId(saleId, options = {}) {
    throw new Error("Method 'findBySaleId' must be implemented");
  }

  /**
   * Get items with sale history
   * @param {Object} options - Query options
   * @return {Promise<Array>} - List of items with sale history
   */
  async getItemsWithSaleHistory(options = {}) {
    throw new Error("Method 'getItemsWithSaleHistory' must be implemented");
  }

  /**
   * Calculate average sale price
   * @param {string} itemId - Item ID
   * @param {Object} options - Calculation options
   * @return {Promise<number>} - Average sale price
   */
  async calculateAverageSalePrice(itemId, options = {}) {
    throw new Error("Method 'calculateAverageSalePrice' must be implemented");
  }

  /**
   * Get sale history for an item
   * @param {string} itemId - Item ID
   * @param {Object} options - Query options
   * @return {Promise<Array>} - Sale history
   */
  async getSaleHistory(itemId, options = {}) {
    throw new Error("Method 'getSaleHistory' must be implemented");
  }

  /**
   * Calculate profit margin for an item
   * @param {string} itemId - Item ID
   * @param {Object} options - Calculation options
   * @return {Promise<Object>} - Profit margin details
   */
  async calculateProfitMargin(itemId, options = {}) {
    throw new Error("Method 'calculateProfitMargin' must be implemented");
  }
}

module.exports = SaleItemInterface;