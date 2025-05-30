/**
 * Asset Item Repository
 * Implements provider-agnostic business logic and operations for the AssetItem entity
 */

const BaseItemRepository = require("./baseItemRepository");
// eslint-disable-next-line no-unused-vars
const { AssetItem } = require("../../models/assetItemModel");

/**
 * Repository for AssetItem operations with provider-agnostic implementation
 */
class AssetItemRepository extends BaseItemRepository {
  /**
   * Creates a new AssetItemRepository instance
   * 
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    super(config);
  }

  /**
   * Find asset items by property type
   * 
   * @param {string} propertyType - The property type to filter by
   * @param {Object} options - Additional query options
   * @return {Promise<Array<AssetItem>>} List of asset items with the specified property type
   */
  async findByPropertyType(propertyType, options = {}) {
    try {
      return this.findAll({ 
        ...options,
        where: {
          ...(options.where || {}),
          propertyType
        }
      });
    } catch (error) {
      console.error(`Error finding assets by property type ${propertyType}:`, error);
      throw error;
    }
  }

  /**
   * Find asset items by status
   * 
   * @param {string} status - The status to filter by
   * @param {Object} options - Additional query options
   * @return {Promise<Array<AssetItem>>} List of asset items with the specified status
   */
  async findByStatus(status, options = {}) {
    try {
      return this.findAll({
        ...options,
        where: {
          ...(options.where || {}),
          status
        }
      });
    } catch (error) {
      console.error(`Error finding assets by status ${status}:`, error);
      throw error;
    }
  }

  /**
   * Get all unique property types from asset items
   * 
   * @return {Promise<Array<string>>} List of property types
   */
  async getPropertyTypes() {
    try {
      const items = await this.findAll({});
      // Extract unique property types, filter out undefined/null/empty values
      const propertyTypes = new Set(
          items.map((item) => item.propertyType).filter(Boolean)
      );
      return [...propertyTypes].sort();
    } catch (error) {
      console.error("Error getting property types:", error);
      throw error;
    }
  }

  /**
   * Find asset items by depreciation method
   * 
   * @param {string} depreciationMethod - The depreciation method to filter by
   * @param {Object} options - Additional query options
   * @return {Promise<Array<AssetItem>>} List of asset items with the specified depreciation method
   */
  async findByDepreciationMethod(depreciationMethod, options = {}) {
    try {
      return this.findAll({
        ...options,
        where: {
          ...(options.where || {}),
          depreciationMethod
        }
      });
    } catch (error) {
      console.error(`Error finding assets by depreciation method ${depreciationMethod}:`, error);
      throw error;
    }
  }
}

module.exports = AssetItemRepository;