/**
 * Asset Repository
 * Implements provider-agnostic business logic and operations for the Asset entity
 */

const AssetInterface = require("../interfaces/assetInterface");
const {Asset} = require("../../models/assetModel");

/**
 * Base repository for Asset operations with provider-agnostic implementation
 */
class AssetRepository extends AssetInterface {
  /**
   * Creates a new AssetRepository instance
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    super();
    this.config = config;
    this.transactionProvider = null;
    this.relationshipRepository = null;
    this.purchaseRepository = null;
  }

  /**
   * Set the transaction provider dependency
   * @param {Object} provider - Transaction provider instance
   */
  setTransactionProvider(provider) {
    this.transactionProvider = provider;
  }

  /**
   * Set the relationship repository dependency
   * @param {Object} repository - Relationship repository instance
   */
  setRelationshipRepository(repository) {
    this.relationshipRepository = repository;
  }

  /**
   * Set the purchase repository dependency
   * @param {Object} repository - Purchase repository instance
   */
  setPurchaseRepository(repository) {
    this.purchaseRepository = repository;
  }

  /**
   * Get all unique categories from assets
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
      console.error("Error getting asset categories:", error);
      throw error;
    }
  }

  /**
   * Get all unique tags from assets
   * @return {Promise<Array<string>>} List of tags
   */
  async getTags() {
    try {
      const assets = await this.findAll({});
      // Extract all tags from all assets, flatten array, and get unique values
      const tagsSet = new Set(
          assets.flatMap((asset) => asset.tags || []).filter(Boolean),
      );
      return [...tagsSet].sort();
    } catch (error) {
      console.error("Error getting asset tags:", error);
      throw error;
    }
  }

  /**
   * Generate the next available asset tag
   * @return {Promise<string>} Next available asset tag
   */
  async getNextAssetTag() {
    try {
      const assets = await this.findAll({});

      // Extract asset tags that follow the pattern "ASSET-XXXXX"
      const pattern = /^ASSET-(\d+)$/;
      const tagNumbers = assets
          .map((asset) => asset.assetTag || "")
          .filter((tag) => pattern.test(tag))
          .map((tag) => {
            const match = tag.match(pattern);
            return match ? parseInt(match[1], 10) : 0;
          });

      // Get the highest number and increment
      const maxNumber = tagNumbers.length > 0 ? Math.max(...tagNumbers) : 0;
      const nextNumber = maxNumber + 1;

      // Format as ASSET-XXXXX (padded to 5 digits)
      return `ASSET-${nextNumber.toString().padStart(5, "0")}`;
    } catch (error) {
      console.error("Error generating next asset tag:", error);
      throw error;
    }
  }

  /**
   * Add maintenance record to asset
   * @param {string} id - Asset ID
   * @param {Object} maintenanceData - Maintenance record data
   * @param {Object} [transaction] - Optional transaction
   * @return {Promise<Object|null>} Updated asset or null if not found
   */
  async addMaintenanceRecord(id, maintenanceData, transaction = null) {
    try {
      const asset = await this.findById(id);
      if (!asset) return null;

      // Create a new Asset instance to use its business logic
      const assetInstance = new Asset(asset);

      // Add maintenance record
      assetInstance.addMaintenanceRecord(maintenanceData);

      // Update the asset with the new state
      return await this.update(
          id,
          {
            maintenanceHistory: assetInstance.maintenanceHistory,
            maintenanceSchedule: assetInstance.maintenanceSchedule,
          },
          transaction,
      );
    } catch (error) {
      console.error(`Error adding maintenance record to asset ${id}:`, error);
      throw error;
    }
  }

  /**
   * Calculate asset depreciation
   * @param {string} id - Asset ID
   * @param {Object} options - Depreciation options
   * @return {Promise<Object>} Depreciation information
   */
  async calculateDepreciation(id, options = {}) {
    try {
      const asset = await this.findById(id);
      if (!asset) {
        throw new Error(`Asset with ID ${id} not found`);
      }

      const {
        years = 5,
        salvageValue = 0,
        method = "linear",
      } = options;

      // Create an Asset instance to use its business logic
      const assetInstance = new Asset(asset);

      // Calculate the depreciated value
      const currentValue = assetInstance.calculateDepreciation(
          years,
          salvageValue,
          method,
      );

      // Return depreciation details
      return {
        assetId: id,
        assetName: asset.name,
        initialCost: asset.initialCost,
        currentValue,
        depreciationAmount: asset.initialCost - currentValue,
        depreciationRate: (1 - (currentValue / asset.initialCost)) * 100,
        depreciationMethod: method,
        years,
        salvageValue,
      };
    } catch (error) {
      console.error(`Error calculating depreciation for asset ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get assets by purchase ID
   * @param {string} purchaseId - Purchase ID
   * @return {Promise<Array>} List of assets from the purchase
   */
  async getAssetsByPurchase(purchaseId) {
    try {
      return await this.findAll({purchaseId});
    } catch (error) {
      console.error(`Error getting assets for purchase ${purchaseId}:`, error);
      throw error;
    }
  }

  /**
   * Get assets due for maintenance
   * @param {Object} options - Query options
   * @return {Promise<Array>} List of assets due for maintenance
   */
  async getAssetsForMaintenance(options = {}) {
    try {
      // Get all assets with maintenance schedules
      const assets = await this.findAll({
        "maintenanceSchedule.nextMaintenance": {$ne: null},
      });

      // Filter assets where maintenance is due (next maintenance <= current date)
      const currentDate = new Date();
      const dueAssets = assets.filter((asset) => {
        if (
          !asset.maintenanceSchedule ||
          !asset.maintenanceSchedule.nextMaintenance
        ) {
          return false;
        }

        const nextMaintenance = new Date(
            asset.maintenanceSchedule.nextMaintenance,
        );
        return nextMaintenance <= currentDate;
      });

      return dueAssets;
    } catch (error) {
      console.error("Error getting assets due for maintenance:", error);
      throw error;
    }
  }

  /**
   * Generate asset valuation report
   * @param {Object} options - Report options
   * @return {Promise<Object>} Asset valuation report
   */
  async generateValuationReport(options = {}) {
    try {
      const {
        category = null,
        status = null,
        depreciationMethod = "linear",
        depreciationYears = 5,
        salvageValue = 0,
      } = options;

      // Build filter based on options
      const filter = {};
      if (category) filter.category = category;
      if (status) filter.status = status;

      // Get assets based on filter
      const assets = await this.findAll(filter);

      // Calculate current value for each asset
      const assetsWithValue = assets.map((asset) => {
        const assetInstance = new Asset(asset);
        const currentValue = assetInstance.calculateDepreciation(
            depreciationYears,
            salvageValue,
            depreciationMethod,
        );

        return {
          ...asset,
          currentValue,
        };
      });

      // Calculate summary statistics
      const totalInitialCost = assetsWithValue.reduce(
          (sum, asset) => sum + (asset.initialCost || 0),
          0,
      );

      const totalCurrentValue = assetsWithValue.reduce(
          (sum, asset) => sum + (asset.currentValue || 0),
          0,
      );

      const totalDepreciation = totalInitialCost - totalCurrentValue;

      // Group by category
      const assetsByCategory = {};
      assetsWithValue.forEach((asset) => {
        const category = asset.category || "Uncategorized";
        if (!assetsByCategory[category]) {
          assetsByCategory[category] = [];
        }
        assetsByCategory[category].push(asset);
      });

      // Calculate category totals
      const categoryTotals = {};
      Object.entries(assetsByCategory).forEach(([category, assets]) => {
        const initialCost = assets.reduce(
            (sum, asset) => sum + (asset.initialCost || 0),
            0,
        );

        const currentValue = assets.reduce(
            (sum, asset) => sum + (asset.currentValue || 0),
            0,
        );

        categoryTotals[category] = {
          count: assets.length,
          initialCost,
          currentValue,
          depreciation: initialCost - currentValue,
        };
      });

      // Group by status
      const assetsByStatus = {};
      assetsWithValue.forEach((asset) => {
        const status = asset.status || "unknown";
        if (!assetsByStatus[status]) {
          assetsByStatus[status] = [];
        }
        assetsByStatus[status].push(asset);
      });

      // Calculate status totals
      const statusTotals = {};
      Object.entries(assetsByStatus).forEach(([status, assets]) => {
        const initialCost = assets.reduce(
            (sum, asset) => sum + (asset.initialCost || 0),
            0,
        );

        const currentValue = assets.reduce(
            (sum, asset) => sum + (asset.currentValue || 0),
            0,
        );

        statusTotals[status] = {
          count: assets.length,
          initialCost,
          currentValue,
          depreciation: initialCost - currentValue,
        };
      });

      // Return the report
      return {
        generatedAt: new Date(),
        reportOptions: {
          category,
          status,
          depreciationMethod,
          depreciationYears,
          salvageValue,
        },
        summary: {
          totalAssets: assets.length,
          totalInitialCost,
          totalCurrentValue,
          totalDepreciation,
          depreciationRate: totalInitialCost > 0 ?
            (totalDepreciation / totalInitialCost) * 100 : 0,
        },
        assets: assetsWithValue,
        categoryTotals,
        statusTotals,
      };
    } catch (error) {
      console.error("Error generating asset valuation report:", error);
      throw error;
    }
  }

  /**
   * Get asset relationships
   * @param {string} assetId - Asset ID
   * @return {Promise<Object>} Relationship information
   */
  async getAssetRelationships(assetId) {
    try {
      // Check if relationship repository is available
      if (!this.relationshipRepository) {
        return {
          hasPurchase: false,
          purchase: null,
        };
      }

      // Get relationships from the relationship repository
      const relationships = await this.relationshipRepository
          .getRelationshipsForEntity(assetId, "Asset");

      return relationships;
    } catch (error) {
      console.error(`Error getting relationships for asset ${assetId}:`, error);
      throw error;
    }
  }

  /**
   * Update asset image
   * @param {string} id - Asset ID
   * @param {string} imageUrl - URL to the uploaded image
   * @return {Promise<Object|null>} Updated asset or null if not found
   */
  async updateImage(id, imageUrl) {
    if (!id || !imageUrl) {
      throw new Error("Asset ID and image URL are required");
    }

    try {
      return await this.update(id, {imageUrl});
    } catch (error) {
      console.error(`Error updating image for asset ${id}:`, error);
      throw error;
    }
  }
}

module.exports = AssetRepository;
