/**
 * @interface AssetRepository
 * Interface that defines methods
 * each asset repository implementation must provide
 */
class AssetRepository {
  /**
   * Find all assets
   * @param {Object} filter Query filters
   * @return {Promise<Array>} List of assets
   */
  async findAll(filter = {}) {
    throw new Error("Method not implemented");
  }

  /**
   * Find asset by ID
   * @param {string} id Asset ID
   * @return {Promise<Object|null>} Asset object or null if not found
   */
  async findById(id) {
    throw new Error("Method not implemented");
  }

  /**
   * Create a new asset
   * @param {Object} assetData Asset data
   * @return {Promise<Object>} Created asset
   */
  async create(assetData) {
    throw new Error("Method not implemented");
  }

  /**
   * Update an existing asset
   * @param {string} id Asset ID
   * @param {Object} assetData Updated asset data
   * @return {Promise<Object|null>} Updated asset or null if not found
   */
  async update(id, assetData) {
    throw new Error("Method not implemented");
  }

  /**
   * Delete an asset
   * @param {string} id Asset ID
   * @return {Promise<boolean>} True if deleted, false if not found
   */
  async delete(id) {
    throw new Error("Method not implemented");
  }

  /**
   * Get all unique categories
   * @return {Promise<Array<string>>} List of categories
   */
  async getCategories() {
    throw new Error("Method not implemented");
  }

  /**
   * Update asset image
   * @param {string} id Asset ID
   * @param {string} imageUrl URL to the uploaded image
   * @return {Promise<Object|null>} Updated asset or null if not found
   */
  async updateImage(id, imageUrl) {
    throw new Error("Method not implemented");
  }

  /**
   * Get assets related to a purchase
   * @param {string} purchaseId Purchase ID
   * @return {Promise<Array>} List of assets
   */
  async getAssetsByPurchase(purchaseId) {
    throw new Error("Method not implemented");
  }
}

module.exports = AssetRepository;
