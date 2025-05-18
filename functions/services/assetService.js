/**
 * Asset Service
 * Contains business logic for asset management operations
 */

const { Asset } = require("../models/assetModel");
const providerFactory = require("../providers/providerFactory");

/**
 * Asset Service class
 * Handles business logic for assets
 */
class AssetService {
  /**
   * Create a new AssetService instance
   */
  constructor() {
    this.assetRepository = providerFactory.createAssetRepository();
  }

  /**
   * Get all assets
   * 
   * @param {Object} query - Query parameters for filtering assets
   * @param {Object} options - Options for pagination, sorting, etc.
   * @returns {Promise<Array>} Array of assets
   */
  async getAllAssets(query = {}, options = {}) {
    return this.assetRepository.findAll(query, options);
  }

  /**
   * Get a single asset by ID
   * 
   * @param {string} id - Asset ID
   * @returns {Promise<Object>} Asset data
   */
  async getAssetById(id) {
    return this.assetRepository.findById(id);
  }

  /**
   * Create a new asset
   * 
   * @param {Object} assetData - Asset data
   * @returns {Promise<Object>} Created asset
   */
  async createAsset(assetData) {
    const asset = new Asset(assetData);
    asset.validate();
    
    return this.assetRepository.create(asset.toObject());
  }

  /**
   * Update an existing asset
   * 
   * @param {string} id - Asset ID
   * @param {Object} assetData - Updated asset data
   * @returns {Promise<Object>} Updated asset
   */
  async updateAsset(id, assetData) {
    const existingAsset = await this.assetRepository.findById(id);
    if (!existingAsset) {
      throw new Error(`Asset with ID ${id} not found`);
    }

    // Create asset with existing data merged with updates
    const asset = new Asset({
      ...existingAsset,
      ...assetData
    });
    asset.validate();
    
    return this.assetRepository.update(id, asset.toObject());
  }

  /**
   * Delete an asset
   * 
   * @param {string} id - Asset ID
   * @returns {Promise<boolean>} True if deleted
   */
  async deleteAsset(id) {
    return this.assetRepository.delete(id);
  }

  /**
   * Calculate depreciation for an asset
   * 
   * @param {string} id - Asset ID
   * @param {number} years - Number of years to depreciate over
   * @param {number} salvageValue - Value at end of depreciation period
   * @param {string} method - Depreciation method ("linear" or "accelerated")
   * @returns {Promise<number>} Current value after depreciation
   */
  async calculateAssetDepreciation(id, years = 5, salvageValue = 0, method = "linear") {
    const assetData = await this.assetRepository.findById(id);
    if (!assetData) {
      throw new Error(`Asset with ID ${id} not found`);
    }

    const asset = new Asset(assetData);
    const currentValue = asset.calculateDepreciation(years, salvageValue, method);
    
    // Update the asset's current value in the database
    asset.currentValue = currentValue;
    await this.assetRepository.update(id, { currentValue });
    
    return currentValue;
  }

  /**
   * Add a maintenance record to an asset
   * 
   * @param {string} id - Asset ID
   * @param {Object} maintenanceData - Maintenance record data
   * @returns {Promise<Object>} Updated asset
   */
  async addMaintenanceRecord(id, maintenanceData) {
    const assetData = await this.assetRepository.findById(id);
    if (!assetData) {
      throw new Error(`Asset with ID ${id} not found`);
    }

    const asset = new Asset(assetData);
    asset.addMaintenanceRecord(maintenanceData);
    
    return this.assetRepository.update(id, asset.toObject());
  }

  /**
   * Check if maintenance is due for an asset
   * 
   * @param {string} id - Asset ID
   * @returns {Promise<boolean>} True if maintenance is due
   */
  async isMaintenanceDue(id) {
    const assetData = await this.assetRepository.findById(id);
    if (!assetData) {
      throw new Error(`Asset with ID ${id} not found`);
    }

    const asset = new Asset(assetData);
    return asset.isMaintenanceDue();
  }

  /**
   * Search for assets by text
   * 
   * @param {string} searchText - Text to search for
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Matching assets
   */
  async searchAssets(searchText, options = {}) {
    return this.assetRepository.search(searchText, options);
  }
}

module.exports = new AssetService();
