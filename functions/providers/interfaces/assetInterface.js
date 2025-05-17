/**
 * Asset Interface
 * Defines the provider-agnostic contract that all asset repository
 * implementations must follow
 */

/**
 * Asset Interface class defining the contract for asset operations
 */
class AssetInterface {
  /**
   * Find all assets matching filter criteria
   * @param {Object} filter - Query filters
   * @param {Object} options - Query options (sorting, pagination, etc.)
   * @return {Promise<Array>} - List of assets
   */
  async findAll(filter = {}, options = {}) {
    throw new Error("Method 'findAll' must be implemented");
  }

  /**
   * Find asset by ID
   * @param {string} id - Asset ID
   * @return {Promise<Object|null>} - Asset object or null if not found
   */
  async findById(id) {
    throw new Error("Method 'findById' must be implemented");
  }

  /**
   * Find assets by multiple IDs
   * @param {Array<string>} ids - Array of asset IDs
   * @return {Promise<Array>} - Array of found assets
   */
  async findByIds(ids) {
    throw new Error("Method 'findByIds' must be implemented");
  }

  /**
   * Create a new asset
   * @param {Object} assetData - Asset data
   * @param {Object} [transaction] - Optional transaction
   * @return {Promise<Object>} - Created asset
   */
  async create(assetData, transaction = null) {
    throw new Error("Method 'create' must be implemented");
  }

  /**
   * Update an existing asset
   * @param {string} id - Asset ID
   * @param {Object} assetData - Updated asset data
   * @param {Object} [transaction] - Optional transaction
   * @return {Promise<Object|null>} - Updated asset or null if not found
   */
  async update(id, assetData, transaction = null) {
    throw new Error("Method 'update' must be implemented");
  }

  /**
   * Delete an asset
   * @param {string} id - Asset ID
   * @param {Object} [transaction] - Optional transaction
   * @return {Promise<boolean>} - True if deleted, false if not found
   */
  async delete(id, transaction = null) {
    throw new Error("Method 'delete' must be implemented");
  }

  /**
   * Count assets
   * @param {Object} filter - Filter criteria
   * @return {Promise<number>} - Count of matching assets
   */
  async count(filter = {}) {
    throw new Error("Method 'count' must be implemented");
  }

  /**
   * Search assets
   * @param {string} searchText - Search text
   * @param {Object} options - Search options
   * @return {Promise<Array>} - List of matching assets
   */
  async search(searchText, options = {}) {
    throw new Error("Method 'search' must be implemented");
  }

  /**
   * Get all unique categories
   * @return {Promise<Array<string>>} - List of categories
   */
  async getCategories() {
    throw new Error("Method 'getCategories' must be implemented");
  }

  /**
   * Get all unique tags
   * @return {Promise<Array<string>>} - List of tags
   */
  async getTags() {
    throw new Error("Method 'getTags' must be implemented");
  }

  /**
   * Generate the next available asset tag
   * @return {Promise<string>} - Next available asset tag
   */
  async getNextAssetTag() {
    throw new Error("Method 'getNextAssetTag' must be implemented");
  }

  /**
   * Get assets by purchase ID
   * @param {string} purchaseId - Purchase ID
   * @return {Promise<Array>} - List of assets from the purchase
   */
  async getAssetsByPurchase(purchaseId) {
    throw new Error("Method 'getAssetsByPurchase' must be implemented");
  }

  /**
   * Add maintenance record to asset
   * @param {string} id - Asset ID
   * @param {Object} maintenanceData - Maintenance record data
   * @param {Object} [transaction] - Optional transaction
   * @return {Promise<Object|null>} - Updated asset or null if not found
   */
  async addMaintenanceRecord(id, maintenanceData, transaction = null) {
    throw new Error("Method 'addMaintenanceRecord' must be implemented");
  }

  /**
   * Update an asset's image
   * @param {string} id - Asset ID
   * @param {string} imageUrl - URL to the uploaded image
   * @return {Promise<Object|null>} - Updated asset or null if not found
   */
  async updateImage(id, imageUrl) {
    throw new Error("Method 'updateImage' must be implemented");
  }

  /**
   * Get assets due for maintenance
   * @param {Object} options - Query options
   * @return {Promise<Array>} - List of assets due for maintenance
   */
  async getAssetsForMaintenance(options = {}) {
    throw new Error("Method 'getAssetsForMaintenance' must be implemented");
  }

  /**
   * Calculate asset depreciation
   * @param {string} id - Asset ID
   * @param {Object} options - Depreciation options
   * @return {Promise<Object>} - Depreciation information
   */
  async calculateDepreciation(id, options = {}) {
    throw new Error("Method 'calculateDepreciation' must be implemented");
  }

  /**
   * Find assets using a complex query
   * @param {Object} query - Complex query object with filters and operators
   * @return {Promise<Array>} - List of matching assets
   */
  async findByQuery(query = {}) {
    throw new Error("Method 'findByQuery' must be implemented");
  }

  /**
   * Generate asset valuation report
   * @param {Object} options - Report options
   * @return {Promise<Object>} - Asset valuation report data
   */
  async generateValuationReport(options = {}) {
    throw new Error(
        "Method 'generateValuationReport' must be implemented",
    );
  }
}

module.exports = AssetInterface;
