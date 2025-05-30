/**
 * Purchase Item Interface
 * Defines the provider-agnostic contract that all purchase item repository
 * implementations must follow
 */

const BaseItemInterface = require("./baseItemInterface");

/**
 * Purchase Item Interface class defining the contract for purchase item operations
 * @extends BaseItemInterface
 */
class PurchaseItemInterface extends BaseItemInterface {
  /**
   * Find purchase items by purchase ID
   * @param {string} purchaseId - Purchase ID
   * @param {Object} options - Query options
   * @return {Promise<Array>} - List of purchase items
   */
  async findByPurchaseId(purchaseId, options = {}) {
    throw new Error("Method 'findByPurchaseId' must be implemented");
  }

  /**
   * Get items with purchase history
   * @param {Object} options - Query options
   * @return {Promise<Array>} - List of items with purchase history
   */
  async getItemsWithPurchaseHistory(options = {}) {
    throw new Error("Method 'getItemsWithPurchaseHistory' must be implemented");
  }

  /**
   * Calculate average purchase cost
   * @param {string} itemId - Item ID
   * @param {Object} options - Calculation options
   * @return {Promise<number>} - Average purchase cost
   */
  async calculateAveragePurchaseCost(itemId, options = {}) {
    throw new Error("Method 'calculateAveragePurchaseCost' must be implemented");
  }

  /**
   * Get purchase history for an item
   * @param {string} itemId - Item ID
   * @param {Object} options - Query options
   * @return {Promise<Array>} - Purchase history
   */
  async getPurchaseHistory(itemId, options = {}) {
    throw new Error("Method 'getPurchaseHistory' must be implemented");
  }
}

module.exports = PurchaseItemInterface;