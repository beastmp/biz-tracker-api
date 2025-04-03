const {BaseAssetRepository} = require("../../base");
const Asset = require("../../../models/asset");
const mongoose = require("mongoose");

/**
 * MongoDB implementation of AssetRepository
 */
class MongoAssetRepository extends BaseAssetRepository {
  /**
   * Find all assets matching filter criteria
   * @param {Object} filter Query filters
   * @return {Promise<Array>} List of assets
   */
  async findAll(filter = {}) {
    return await Asset.find(filter).sort({name: 1});
  }

  /**
   * Find asset by ID
   * @param {string} id Asset ID
   * @return {Promise<Object|null>} Asset object or null if not found
   */
  async findById(id) {
    // Check if we have a valid ID
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }

    try {
      return await Asset.findById(id).populate("purchaseId");
    } catch (error) {
      console.error(`Error finding asset by ID ${id}:`, error);
      return null;
    }
  }

  /**
   * Create a new asset
   * @param {Object} assetData Asset data
   * @return {Promise<Object>} Created asset
   */
  async create(assetData) {
    try {
      const asset = new Asset(assetData);
      await asset.save();
      return asset;
    } catch (error) {
      console.error("Error creating asset:", error);
      throw error;
    }
  }

  /**
   * Update an existing asset
   * @param {string} id Asset ID
   * @param {Object} assetData Updated asset data
   * @return {Promise<Object|null>} Updated asset or null if not found
   */
  async update(id, assetData) {
    try {
      const asset = await Asset.findById(id);
      if (!asset) return null;

      // Update all provided fields
      Object.keys(assetData).forEach((key) => {
        asset[key] = assetData[key];
      });

      await asset.save();
      return asset;
    } catch (error) {
      console.error(`Error updating asset ${id}:`, error);
      throw error;
    }
  }

  /**
   * Update asset image
   * @param {string} id Asset ID
   * @param {string} imageUrl URL to the uploaded image
   * @return {Promise<Object|null>} Updated asset or null if not found
   */
  async updateImage(id, imageUrl) {
    try {
      const asset = await Asset.findById(id);
      if (!asset) return null;

      asset.imageUrl = imageUrl;
      await asset.save();

      return asset;
    } catch (error) {
      console.error(`Error updating image for asset ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete an asset
   * @param {string} id Asset ID
   * @return {Promise<boolean>} True if deleted, false if not found
   */
  async delete(id) {
    try {
      const result = await Asset.findByIdAndDelete(id);
      return !!result;
    } catch (error) {
      console.error(`Error deleting asset ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get assets by purchase ID
   * @param {string} purchaseId Purchase ID
   * @return {Promise<Array>} List of assets
   */
  async getAssetsByPurchase(purchaseId) {
    try {
      return await Asset.find({purchaseId}).sort({createdAt: -1});
    } catch (error) {
      console.error(`Error getting assets for purchase ${purchaseId}:`, error);
      throw error;
    }
  }

  /**
   * Add maintenance record to asset
   * @param {string} id Asset ID
   * @param {Object} maintenanceData Maintenance record data
   * @return {Promise<Object|null>} Updated asset or null if not found
   */
  async addMaintenanceRecord(id, maintenanceData) {
    try {
      const asset = await Asset.findById(id);
      if (!asset) return null;

      if (!asset.maintenanceHistory) {
        asset.maintenanceHistory = [];
      }

      // Add new maintenance record
      asset.maintenanceHistory.push(maintenanceData);

      // Update last maintenance date
      if (!asset.maintenanceSchedule) {
        asset.maintenanceSchedule = {
          frequency: maintenanceData.frequency || "monthly",
          lastMaintenance: maintenanceData.date,
        };
      } else {
        asset.maintenanceSchedule.lastMaintenance = maintenanceData.date;
      }

      // Calculate next maintenance date based on frequency
      if (asset.maintenanceSchedule.frequency) {
        const nextDate = new Date(maintenanceData.date);
        switch (asset.maintenanceSchedule.frequency) {
          case "daily":
            nextDate.setDate(nextDate.getDate() + 1);
            break;
          case "weekly":
            nextDate.setDate(nextDate.getDate() + 7);
            break;
          case "monthly":
            nextDate.setMonth(nextDate.getMonth() + 1);
            break;
          case "quarterly":
            nextDate.setMonth(nextDate.getMonth() + 3);
            break;
          case "yearly":
            nextDate.setFullYear(nextDate.getFullYear() + 1);
            break;
        }
        asset.maintenanceSchedule.nextMaintenance = nextDate;
      }

      await asset.save();
      return asset;
    } catch (error) {
      console.error(`Error adding maintenance record to asset ${id}:`, error);
      throw error;
    }
  }
}

module.exports = MongoAssetRepository;
