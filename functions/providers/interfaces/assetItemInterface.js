/**
 * Asset Item Interface
 * Defines the provider-agnostic contract that all asset item repository
 * implementations must follow
 */

const BaseItemInterface = require("./baseItemInterface");

/**
 * Asset Item Interface class defining the contract for asset item operations
 * @extends BaseItemInterface
 */
class AssetItemInterface extends BaseItemInterface {
  /**
   * Get all assets linked to a specific asset item
   * @param {string} assetItemId - Asset item ID
   * @param {Object} options - Query options
   * @return {Promise<Array>} - List of associated assets
   */
  async getLinkedAssets(assetItemId, options = {}) {
    throw new Error("Method 'getLinkedAssets' must be implemented");
  }

  /**
   * Count assets linked to a specific asset item
   * @param {string} assetItemId - Asset item ID
   * @return {Promise<number>} - Count of linked assets
   */
  async countLinkedAssets(assetItemId) {
    throw new Error("Method 'countLinkedAssets' must be implemented");
  }

  /**
   * Link assets to an asset item
   * @param {string} assetItemId - Asset item ID
   * @param {Array<string>} assetIds - Array of asset IDs to link
   * @param {Object} [transaction] - Optional transaction
   * @return {Promise<boolean>} - Success indicator
   */
  async linkAssets(assetItemId, assetIds, transaction = null) {
    throw new Error("Method 'linkAssets' must be implemented");
  }

  /**
   * Unlink assets from an asset item
   * @param {string} assetItemId - Asset item ID
   * @param {Array<string>} assetIds - Array of asset IDs to unlink
   * @param {Object} [transaction] - Optional transaction
   * @return {Promise<boolean>} - Success indicator
   */
  async unlinkAssets(assetItemId, assetIds, transaction = null) {
    throw new Error("Method 'unlinkAssets' must be implemented");
  }

  /**
   * Find asset items by asset ID
   * @param {string} assetId - Asset ID
   * @return {Promise<Array>} - List of asset items linked to the asset
   */
  async findByAssetId(assetId) {
    throw new Error("Method 'findByAssetId' must be implemented");
  }
}

module.exports = AssetItemInterface;