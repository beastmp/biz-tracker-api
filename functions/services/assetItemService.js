/**
 * Asset Item Service
 * Provides business logic and operations for asset items
 */

const BaseItemService = require("./baseItemService");

/**
 * Service for managing asset item operations
 * @extends BaseItemService
 */
class AssetItemService extends BaseItemService {
  /**
   * Creates a new AssetItemService instance
   * @param {Object} repository - Asset item repository instance
   * @param {Object} config - Configuration options
   */
  constructor(repository, config = {}) {
    super(repository, config);
    this.assetRepository = null;
  }

  /**
   * Set the asset repository dependency
   * @param {Object} repository - Asset repository instance
   */
  setAssetRepository(repository) {
    this.assetRepository = repository;
  }

  /**
   * Get all assets linked to a specific asset item
   * @param {string} assetItemId - Asset item ID
   * @param {Object} options - Query options
   * @return {Promise<Array>} - List of associated assets
   */
  async getLinkedAssets(assetItemId, options = {}) {
    try {
      return await this.repository.getLinkedAssets(assetItemId, options);
    } catch (error) {
      console.error(`Error getting linked assets for asset item ${assetItemId}:`, error);
      throw error;
    }
  }

  /**
   * Count assets linked to a specific asset item
   * @param {string} assetItemId - Asset item ID
   * @return {Promise<number>} - Count of linked assets
   */
  async countLinkedAssets(assetItemId) {
    try {
      return await this.repository.countLinkedAssets(assetItemId);
    } catch (error) {
      console.error(`Error counting linked assets for asset item ${assetItemId}:`, error);
      throw error;
    }
  }

  /**
   * Link assets to an asset item
   * @param {string} assetItemId - Asset item ID
   * @param {Array<string>} assetIds - Array of asset IDs to link
   * @return {Promise<boolean>} - Success indicator
   */
  async linkAssets(assetItemId, assetIds) {
    try {
      // First verify the asset item exists
      const assetItem = await this.findById(assetItemId);
      if (!assetItem) {
        throw new Error(`Asset item not found with id: ${assetItemId}`);
      }

      // Verify all assets exist if asset repository is available
      if (this.assetRepository && assetIds.length > 0) {
        const assets = await this.assetRepository.findByIds(assetIds);
        if (assets.length !== assetIds.length) {
          const foundIds = assets.map(a => a._id.toString());
          const missingIds = assetIds.filter(id => !foundIds.includes(id.toString()));
          throw new Error(`Some assets were not found: ${missingIds.join(", ")}`);
        }
      }

      return await this.repository.linkAssets(assetItemId, assetIds);
    } catch (error) {
      console.error(`Error linking assets to asset item ${assetItemId}:`, error);
      throw error;
    }
  }

  /**
   * Unlink assets from an asset item
   * @param {string} assetItemId - Asset item ID
   * @param {Array<string>} assetIds - Array of asset IDs to unlink
   * @return {Promise<boolean>} - Success indicator
   */
  async unlinkAssets(assetItemId, assetIds) {
    try {
      // First verify the asset item exists
      const assetItem = await this.findById(assetItemId);
      if (!assetItem) {
        throw new Error(`Asset item not found with id: ${assetItemId}`);
      }

      return await this.repository.unlinkAssets(assetItemId, assetIds);
    } catch (error) {
      console.error(`Error unlinking assets from asset item ${assetItemId}:`, error);
      throw error;
    }
  }

  /**
   * Find asset items by asset ID
   * @param {string} assetId - Asset ID
   * @return {Promise<Array>} - List of asset items linked to the asset
   */
  async findByAssetId(assetId) {
    try {
      return await this.repository.findByAssetId(assetId);
    } catch (error) {
      console.error(`Error finding asset items for asset ${assetId}:`, error);
      throw error;
    }
  }

  /**
   * Get asset item with all linked assets
   * @param {string} assetItemId - Asset item ID 
   * @return {Promise<Object>} - Asset item with linked assets
   */
  async getAssetItemWithAssets(assetItemId) {
    try {
      const assetItem = await this.findById(assetItemId);
      
      if (!assetItem) {
        return null;
      }
      
      const linkedAssets = await this.repository.getLinkedAssets(assetItemId);
      
      return {
        ...assetItem,
        assets: linkedAssets || [],
        assetCount: linkedAssets ? linkedAssets.length : 0
      };
    } catch (error) {
      console.error(`Error getting asset item with assets for ${assetItemId}:`, error);
      throw error;
    }
  }
}

module.exports = AssetItemService;