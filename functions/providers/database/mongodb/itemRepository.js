/**
 * MongoDB Item Repository
 * Implements the MongoDB-specific logic for the Item entity
 */

const ItemRepository = require("../../repositories/itemRepository");
const {createModel} = require("./modelFactory");
const {
  documentToObject,
  objectToDocument,
} = require("./schemaGenerator");

/**
 * MongoDB-specific implementation of the Item repository
 */
class MongoDBItemRepository extends ItemRepository {
  /**
   * Creates a new instance of MongoDBItemRepository
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    super(config);
    this.collectionPrefix = config.collectionPrefix || "";
    this.model = createModel("Item", this.collectionPrefix);
  }

  /**
   * Find all items matching filter criteria
   * @param {Object} filter - Query filters
   * @param {Object} options - Query options (sorting, pagination, etc.)
   * @return {Promise<Array>} - List of items
   */
  async findAll(filter = {}, options = {}) {
    const {
      limit = 100,
      skip = 0,
      sort = {createdAt: -1},
    } = options;

    const query = this._buildQuery(filter);

    const items = await this.model
        .find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec();

    return items.map(documentToObject);
  }

  /**
   * Find item by ID
   * @param {string} id - Item ID
   * @return {Promise<Object|null>} - Item object or null if not found
   */
  async findById(id) {
    if (!id) return null;

    try {
      const item = await this.model.findById(id).exec();
      return item ? documentToObject(item) : null;
    } catch (error) {
      console.error(`Error finding item by ID ${id}:`, error);
      return null;
    }
  }

  /**
   * Find items by multiple IDs
   * @param {Array<string>} ids - Array of item IDs
   * @return {Promise<Array>} - Array of found items
   */
  async findByIds(ids) {
    if (!ids || !ids.length) return [];

    try {
      const items = await this.model
          .find({_id: {$in: ids}})
          .exec();

      return items.map(documentToObject);
    } catch (error) {
      console.error(`Error finding items by IDs:`, error);
      return [];
    }
  }

  /**
   * Create a new item
   * @param {Object} itemData - Item data
   * @param {Object} [transaction] - Optional transaction
   * @return {Promise<Object>} - Created item
   */
  async create(itemData, transaction = null) {
    try {
      const docData = objectToDocument(itemData);
      // eslint-disable-next-line new-cap
      const item = new this.model(docData);

      const options = transaction ? {session: transaction} : {};
      await item.save(options);

      return documentToObject(item);
    } catch (error) {
      console.error("Error creating item:", error);
      throw error;
    }
  }

  /**
   * Update an existing item
   * @param {string} id - Item ID
   * @param {Object} itemData - Updated item data
   * @param {Object} [transaction] - Optional transaction
   * @return {Promise<Object|null>} - Updated item or null if not found
   */
  async update(id, itemData, transaction = null) {
    if (!id) throw new Error("ID is required for update");

    try {
      const docData = objectToDocument(itemData);

      // Remove id from data to prevent _id modification attempt
      if (docData._id) {
        delete docData._id;
      }

      const options = {new: true};
      if (transaction) {
        options.session = transaction;
      }

      const item = await this.model
          .findByIdAndUpdate(id, docData, options)
          .exec();

      return item ? documentToObject(item) : null;
    } catch (error) {
      console.error(`Error updating item ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete an item
   * @param {string} id - Item ID
   * @param {Object} [transaction] - Optional transaction
   * @return {Promise<boolean>} - True if deleted, false if not found
   */
  async delete(id, transaction = null) {
    if (!id) return false;

    try {
      const options = transaction ? {session: transaction} : {};
      const result = await this.model.findByIdAndDelete(id, options).exec();
      return !!result;
    } catch (error) {
      console.error(`Error deleting item ${id}:`, error);
      throw error;
    }
  }

  /**
   * Count items
   * @param {Object} filter - Filter criteria
   * @return {Promise<number>} - Count of matching items
   */
  async count(filter = {}) {
    try {
      const query = this._buildQuery(filter);
      return await this.model.countDocuments(query).exec();
    } catch (error) {
      console.error("Error counting items:", error);
      throw error;
    }
  }

  /**
   * Search items
   * @param {string} searchText - Search text
   * @param {Object} options - Search options
   * @return {Promise<Array>} - List of matching items
   */
  async search(searchText, options = {}) {
    const {
      limit = 20,
      skip = 0,
      fields = ["name", "description", "sku"],
    } = options;

    try {
      // If text index exists, use it
      if (searchText && searchText.trim()) {
        try {
          const items = await this.model
              .find(
                  {$text: {$search: searchText}},
                  {score: {$meta: "textScore"}},
              )
              .sort({score: {$meta: "textScore"}})
              .skip(skip)
              .limit(limit)
              .exec();

          return items.map(documentToObject);
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

      const items = await this.model
          .find(query)
          .skip(skip)
          .limit(limit)
          .exec();

      return items.map(documentToObject);
    } catch (error) {
      console.error("Error searching items:", error);
      throw error;
    }
  }

  /**
   * Get items with inventory quantities
   * @param {Object} options - Query options
   * @return {Promise<Array>} - Items with quantities
   */
  async getItemsWithQuantities(options = {}) {
    const {limit = 100, skip = 0, filter = {}} = options;

    try {
      // Apply filters if provided
      const matchStage = this._buildQuery(filter);

      // Using aggregation to calculate quantities
      const items = await this.model.aggregate([
        // Match stage with filters
        {$match: matchStage},
        // Lookup purchases to calculate incoming inventory
        {
          $lookup: {
            from: `${this.collectionPrefix}purchases`,
            let: {itemId: "$_id"},
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      {$eq: ["$itemId", "$$itemId"]},
                      {$eq: ["$status", "completed"]},
                    ],
                  },
                },
              },
              {
                $group: {
                  _id: null,
                  totalQuantity: {$sum: "$quantity"},
                },
              },
            ],
            as: "purchases",
          },
        },
        // Lookup sales to calculate outgoing inventory
        {
          $lookup: {
            from: `${this.collectionPrefix}sales`,
            let: {itemId: "$_id"},
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      {$eq: ["$itemId", "$$itemId"]},
                      {$eq: ["$status", "completed"]},
                    ],
                  },
                },
              },
              {
                $group: {
                  _id: null,
                  totalQuantity: {$sum: "$quantity"},
                },
              },
            ],
            as: "sales",
          },
        },
        // Calculate current quantity
        {
          $addFields: {
            purchaseQuantity: {
              $cond: {
                if: {$gt: [{$size: "$purchases"}, 0]},
                then: {$arrayElemAt: ["$purchases.totalQuantity", 0]},
                else: 0,
              },
            },
            saleQuantity: {
              $cond: {
                if: {$gt: [{$size: "$sales"}, 0]},
                then: {$arrayElemAt: ["$sales.totalQuantity", 0]},
                else: 0,
              },
            },
          },
        },
        {
          $addFields: {
            currentQuantity: {
              $subtract: ["$purchaseQuantity", "$saleQuantity"],
            },
          },
        },
        // Clean up temporary fields
        {
          $project: {
            purchases: 0,
            sales: 0,
            purchaseQuantity: 0,
            saleQuantity: 0,
          },
        },
        // Pagination
        {$skip: skip},
        {$limit: limit},
      ]);

      return items.map(documentToObject);
    } catch (error) {
      console.error("Error getting items with quantities:", error);
      throw error;
    }
  }

  /**
   * Find items using a complex query
   * @param {Object} query - Complex query object with filters and operators
   * @return {Promise<Array>} - List of matching items
   */
  async findByQuery(query = {}) {
    try {
      const mongoQuery = this._buildQuery(query);
      const items = await this.model.find(mongoQuery).exec();
      return items.map(documentToObject);
    } catch (error) {
      console.error("Error finding items by query:", error);
      throw error;
    }
  }

  /**
   * Update item image
   * @param {string} id - Item ID
   * @param {string} imageUrl - URL to the uploaded image
   * @return {Promise<Object|null>} - Updated item or null if not found
   */
  async updateImage(id, imageUrl) {
    if (!id || !imageUrl) {
      throw new Error("Item ID and image URL are required");
    }

    try {
      const item = await this.model
          .findByIdAndUpdate(
              id,
              {imageUrl},
              {new: true},
          )
          .exec();

      return item ? documentToObject(item) : null;
    } catch (error) {
      console.error(`Error updating image for item ${id}:`, error);
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

module.exports = MongoDBItemRepository;
