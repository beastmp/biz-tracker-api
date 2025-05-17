/**
 * MongoDB Asset Repository
 * Implements the MongoDB-specific logic for the Asset entity
 */

const mongoose = require("mongoose");
const AssetRepository = require("../../repositories/assetRepository");
const {getModel} = require("./modelFactory");

/**
 * MongoDB-specific implementation of the Asset repository
 */
class MongoDBAssetRepository extends AssetRepository {
  /**
   * Creates a new instance of MongoDBAssetRepository
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    super(config);
    this.model = getModel("Asset");
    this.collectionPrefix = config.collectionPrefix || "";
  }

  /**
   * Find all assets matching filter criteria
   * @param {Object} filter - Query filters
   * @param {Object} options - Query options (sorting, pagination, etc.)
   * @return {Promise<Array>} - List of assets
   */
  async findAll(filter = {}, options = {}) {
    try {
      const {
        limit = 100,
        skip = 0,
        sort = {name: 1},
      } = options;

      const query = this._buildQuery(filter);

      const assets = await this.model
          .find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .exec();

      return assets;
    } catch (error) {
      console.error("Error finding assets:", error);
      throw error;
    }
  }

  /**
   * Find asset by ID
   * @param {string} id - Asset ID
   * @return {Promise<Object|null>} - Asset object or null if not found
   */
  async findById(id) {
    // Check if we have a valid ID
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }

    try {
      return await this.model.findById(id);
    } catch (error) {
      console.error(`Error finding asset by ID ${id}:`, error);
      return null;
    }
  }

  /**
   * Find assets by multiple IDs
   * @param {Array<string>} ids - Array of asset IDs
   * @return {Promise<Array>} - Array of found assets
   */
  async findByIds(ids) {
    if (!ids || !ids.length) return [];

    try {
      const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));

      if (validIds.length === 0) return [];

      const assets = await this.model
          .find({_id: {$in: validIds}})
          .exec();

      return assets;
    } catch (error) {
      console.error(`Error finding assets by IDs:`, error);
      return [];
    }
  }

  /**
   * Create a new asset
   * @param {Object} assetData - Asset data
   * @param {Object} [transaction] - Optional transaction
   * @return {Promise<Object>} - Created asset
   */
  async create(assetData, transaction = null) {
    try {
      // eslint-disable-next-line new-cap
      const asset = new this.model(assetData);

      const options = transaction ? {session: transaction} : {};
      await asset.save(options);

      return asset;
    } catch (error) {
      console.error("Error creating asset:", error);
      throw error;
    }
  }

  /**
   * Update an existing asset
   * @param {string} id - Asset ID
   * @param {Object} assetData - Updated asset data
   * @param {Object} [transaction] - Optional transaction
   * @return {Promise<Object|null>} - Updated asset or null if not found
   */
  async update(id, assetData, transaction = null) {
    try {
      // Check if we have a valid ID
      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return null;
      }

      const options = {new: true};
      if (transaction) {
        options.session = transaction;
      }

      // Ensure we don't try to modify the _id field
      if (assetData._id) {
        delete assetData._id;
      }

      const asset = await this.model
          .findByIdAndUpdate(id, assetData, options)
          .exec();

      return asset;
    } catch (error) {
      console.error(`Error updating asset ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete an asset
   * @param {string} id - Asset ID
   * @param {Object} [transaction] - Optional transaction
   * @return {Promise<boolean>} - True if deleted, false if not found
   */
  async delete(id, transaction = null) {
    try {
      // Check if we have a valid ID
      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return false;
      }

      const options = transaction ? {session: transaction} : {};
      const result = await this.model.findByIdAndDelete(id, options).exec();

      return !!result;
    } catch (error) {
      console.error(`Error deleting asset ${id}:`, error);
      throw error;
    }
  }

  /**
   * Count assets
   * @param {Object} filter - Filter criteria
   * @return {Promise<number>} - Count of matching assets
   */
  async count(filter = {}) {
    try {
      const query = this._buildQuery(filter);
      return await this.model.countDocuments(query).exec();
    } catch (error) {
      console.error("Error counting assets:", error);
      throw error;
    }
  }

  /**
   * Search assets
   * @param {string} searchText - Search text
   * @param {Object} options - Search options
   * @return {Promise<Array>} - List of matching assets
   */
  async search(searchText, options = {}) {
    const {
      limit = 20,
      skip = 0,
      fields = ["name", "description", "notes", "assetTag", "serialNumber"],
    } = options;

    try {
      // If text index exists, use it
      if (searchText && searchText.trim()) {
        try {
          const assets = await this.model
              .find(
                  {$text: {$search: searchText}},
                  {score: {$meta: "textScore"}},
              )
              .sort({score: {$meta: "textScore"}})
              .skip(skip)
              .limit(limit)
              .exec();

          return assets;
        } catch (err) {
          // Fall back to regex search if text search fails
          console.warn("Text search failed, falling back to regex:", err);
        }
      }

      // Fallback: regex search on specified fields
      const query = searchText ?
        {
          $or: fields.map((field) => ({
            [field]: {$regex: searchText, $options: "i"},
          })),
        } :
        {};

      const assets = await this.model
          .find(query)
          .skip(skip)
          .limit(limit)
          .exec();

      return assets;
    } catch (error) {
      console.error("Error searching assets:", error);
      throw error;
    }
  }

  /**
   * Get assets by purchase ID
   * @param {string} purchaseId - Purchase ID
   * @return {Promise<Array>} - List of assets from the purchase
   */
  async getAssetsByPurchase(purchaseId) {
    try {
      if (!purchaseId || !mongoose.Types.ObjectId.isValid(purchaseId)) {
        return [];
      }

      return await this.model.find({purchaseId}).sort({name: 1}).exec();
    } catch (error) {
      console.error(
          `Error getting assets for purchase ${purchaseId}:`,
          error,
      );
      throw error;
    }
  }

  /**
   * Get assets due for maintenance
   * @param {Object} options - Query options
   * @return {Promise<Array>} - List of assets due for maintenance
   */
  async getAssetsForMaintenance(options = {}) {
    try {
      const currentDate = new Date();

      const query = {
        "maintenanceSchedule.nextMaintenance": {$lte: currentDate},
      };

      return await this.model.find(query).sort({name: 1}).exec();
    } catch (error) {
      console.error("Error getting assets due for maintenance:", error);
      throw error;
    }
  }

  /**
   * Find assets using a complex query
   * @param {Object} query - Complex query object with filters and operators
   * @return {Promise<Array>} - List of matching assets
   */
  async findByQuery(query = {}) {
    try {
      const mongoQuery = this._buildQuery(query);
      return await this.model.find(mongoQuery).exec();
    } catch (error) {
      console.error("Error finding assets by query:", error);
      throw error;
    }
  }

  /**
   * Build query object from filters
   * @param {Object} filters - Filter criteria
   * @return {Object} - MongoDB query
   * @private
   */
  _buildQuery(filters) {
    const query = {};

    if (!filters || typeof filters !== "object") {
      return query;
    }

    Object.entries(filters).forEach(([key, value]) => {
      // Handle special operators
      if (key.startsWith("$")) {
        query[key] = value;
        return;
      }

      // Handle nested objects with dot notation
      if (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
      ) {
        Object.entries(value).forEach(([operator, operand]) => {
          if (operator.startsWith("$")) {
            query[key] = {...query[key], [operator]: operand};
          } else {
            query[`${key}.${operator}`] = operand;
          }
        });
        return;
      }

      // Handle regular values
      query[key] = value;
    });

    return query;
  }
}

module.exports = MongoDBAssetRepository;
