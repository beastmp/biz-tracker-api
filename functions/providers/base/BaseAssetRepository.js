const AssetRepository = require("../interfaces/assetRepository");

/**
 * Base implementation of AssetRepository with common functionality
 * @abstract
 */
class BaseAssetRepository extends AssetRepository {
  /**
   * Get all unique categories
   * @return {Promise<Array<string>>} List of categories
   */
  async getCategories() {
    try {
      const assets = await this.findAll({});
      // Extract unique categories, filter out undefined/null/empty values
      const categories = new Set(
          assets.map((asset) => asset.category).filter(Boolean),
      );
      return [...categories].sort();
    } catch (error) {
      console.error("Error getting categories:", error);
      throw error;
    }
  }

  /**
   * Get assets by purchase ID - base implementation
   * @param {string} purchaseId Purchase ID
   * @return {Promise<Array>} List of assets
   */
  async getAssetsByPurchase(purchaseId) {
    try {
      const assets = await this.findAll({purchaseId});
      return assets;
    } catch (error) {
      console.error(`Error getting assets for purchase ${purchaseId}:`, error);
      throw error;
    }
  }
}

module.exports = BaseAssetRepository;
