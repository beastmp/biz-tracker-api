/**
 * MongoDB Purchase Repository Module
 *
 * Implements the MongoDB-specific logic for the Purchase entity, providing
 * methods to create, retrieve, update, and delete purchase records in
 * MongoDB.
 *
 * @module MongoDBPurchaseRepository
 * @requires ../../repositories/purchaseRepository
 * @requires ./modelFactory
 * @requires ./schemaGenerator
 */

const PurchaseRepository = require("../../repositories/purchaseRepository");
const {createModel} = require("./modelFactory");
const {
  documentToObject,
  objectToDocument,
} = require("./schemaGenerator");

/**
 * MongoDB-specific implementation of the Purchase repository
 *
 * @class MongoDBPurchaseRepository
 * @extends PurchaseRepository
 */
class MongoDBPurchaseRepository extends PurchaseRepository {
  /**
   * Creates a new instance of MongoDBPurchaseRepository
   *
   * @constructor
   * @param {Object} config - Configuration options
   * @param {string} [config.collectionPrefix] - Prefix for collection names
   */
  constructor(config = {}) {
    super(config);
    this.collectionPrefix = config.collectionPrefix || "";
    this.model = createModel("Purchase", this.collectionPrefix);
  }

  /**
   * Find all purchases matching filter criteria
   *
   * @async
   * @param {Object} filter - Query filters
   * @param {Object} options - Query options (sorting, pagination, etc.)
   * @return {Promise<Array>} - List of purchases
   */
  async findAll(filter = {}, options = {}) {
    const {
      limit = 100,
      skip = 0,
      sort = {purchaseDate: -1},
      populate = false,
    } = options;

    try {
      const query = this._buildQuery(filter);

      let purchaseQuery = this.model
          .find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit);

      // Optionally populate item information
      if (populate && populate.includes("items")) {
        purchaseQuery = purchaseQuery.populate("items.itemId");
      }

      const purchases = await purchaseQuery.exec();

      return purchases.map(documentToObject);
    } catch (error) {
      console.error("Error finding purchases:", error);
      throw error;
    }
  }

  /**
   * Find purchase by ID
   *
   * @async
   * @param {string} id - Purchase ID
   * @return {Promise<Object|null>} - Purchase object or null if not found
   */
  async findById(id) {
    if (!id) return null;

    try {
      const purchase = await this.model.findById(id).exec();
      return purchase ? documentToObject(purchase) : null;
    } catch (error) {
      console.error(`Error finding purchase by ID ${id}:`, error);
      return null;
    }
  }

  /**
   * Find purchases by multiple IDs
   *
   * @async
   * @param {Array<string>} ids - Array of purchase IDs
   * @return {Promise<Array>} - Array of found purchases
   */
  async findByIds(ids) {
    if (!ids || !ids.length) return [];

    try {
      const purchases = await this.model
          .find({_id: {$in: ids}})
          .exec();

      return purchases.map(documentToObject);
    } catch (error) {
      console.error(`Error finding purchases by IDs:`, error);
      return [];
    }
  }

  /**
   * Create a new purchase
   *
   * @async
   * @param {Object} purchaseData - Purchase data
   * @param {Object} [transaction] - Optional transaction
   * @return {Promise<Object>} - Created purchase
   */
  async create(purchaseData, transaction = null) {
    try {
      // If purchase number not provided, generate one
      if (!purchaseData.purchaseNumber) {
        purchaseData.purchaseNumber = await this.generatePurchaseNumber();
      }

      // Calculate total amount if items exist
      if (purchaseData.items && purchaseData.items.length > 0) {
        let totalAmount = 0;

        // Calculate total for each item and overall total
        purchaseData.items = purchaseData.items.map((item) => {
          const quantity = item.quantity || 0;
          const unitPrice = item.unitPrice || 0;
          const total = quantity * unitPrice;

          totalAmount += total;

          return {
            ...item,
            total,
          };
        });

        purchaseData.totalAmount = totalAmount;
      }

      const docData = objectToDocument(purchaseData);
      // eslint-disable-next-line new-cap
      const purchase = new this.model(docData);

      const options = transaction ? {session: transaction} : {};
      await purchase.save(options);

      return documentToObject(purchase);
    } catch (error) {
      console.error("Error creating purchase:", error);
      throw error;
    }
  }

  /**
   * Update an existing purchase
   *
   * @async
   * @param {string} id - Purchase ID
   * @param {Object} purchaseData - Updated purchase data
   * @param {Object} [transaction] - Optional transaction
   * @return {Promise<Object|null>} - Updated purchase or null if not found
   */
  async update(id, purchaseData, transaction = null) {
    if (!id) throw new Error("ID is required for update");

    try {
      const docData = objectToDocument(purchaseData);

      // Remove id from data to prevent _id modification attempt
      if (docData._id) {
        delete docData._id;
      }

      const options = {new: true};
      if (transaction) {
        options.session = transaction;
      }

      const purchase = await this.model
          .findByIdAndUpdate(id, docData, options)
          .exec();

      return purchase ? documentToObject(purchase) : null;
    } catch (error) {
      console.error(`Error updating purchase ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a purchase
   *
   * @async
   * @param {string} id - Purchase ID
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
      console.error(`Error deleting purchase ${id}:`, error);
      throw error;
    }
  }

  /**
   * Count purchases
   *
   * @async
   * @param {Object} filter - Filter criteria
   * @return {Promise<number>} - Count of matching purchases
   */
  async count(filter = {}) {
    try {
      const query = this._buildQuery(filter);
      return await this.model.countDocuments(query).exec();
    } catch (error) {
      console.error("Error counting purchases:", error);
      throw error;
    }
  }

  /**
   * Search purchases
   *
   * @async
   * @param {string} searchText - Search text
   * @param {Object} options - Search options
   * @return {Promise<Array>} - List of matching purchases
   */
  async search(searchText, options = {}) {
    const {
      limit = 20,
      skip = 0,
      fields = ["purchaseNumber", "supplier", "notes"],
    } = options;

    try {
      // If text index exists, use it
      if (searchText && searchText.trim()) {
        try {
          const purchases = await this.model
              .find(
                  {$text: {$search: searchText}},
                  {score: {$meta: "textScore"}},
              )
              .sort({score: {$meta: "textScore"}})
              .skip(skip)
              .limit(limit)
              .exec();

          return purchases.map(documentToObject);
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

      const purchases = await this.model
          .find(query)
          .sort({purchaseDate: -1})
          .skip(skip)
          .limit(limit)
          .exec();

      return purchases.map(documentToObject);
    } catch (error) {
      console.error(`Error searching purchases for "${searchText}":`, error);
      return [];
    }
  }

  /**
   * Get purchases by supplier
   *
   * @async
   * @param {string} supplierId - Supplier ID
   * @param {Object} [options={}] - Additional query options
   * @return {Promise<Array>} - List of purchases from the supplier
   */
  async getPurchasesBySupplier(supplierId, options = {}) {
    try {
      // Try to find by supplierId field first
      const query = {};

      if (supplierId) {
        query.supplierId = supplierId;
      }

      const {
        limit = 100,
        skip = 0,
        sort = {purchaseDate: -1},
      } = options;

      const purchases = await this.model
          .find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .exec();

      return purchases.map(documentToObject);
    } catch (error) {
      console.error(
          `Error getting purchases for supplier ${supplierId}:`,
          error,
      );
      throw error;
    }
  }

  /**
   * Get purchases by item
   *
   * @async
   * @param {string} itemId - Item ID
   * @param {Object} [options={}] - Additional query options
   * @return {Promise<Array>} - List of purchases containing the item
   */
  async getPurchasesByItem(itemId, options = {}) {
    try {
      if (!itemId) return [];

      const {
        limit = 100,
        skip = 0,
        sort = {purchaseDate: -1},
      } = options;

      // MongoDB specific query to find purchases containing the item
      const query = {"items.itemId": itemId};

      const purchases = await this.model
          .find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .exec();

      return purchases.map(documentToObject);
    } catch (error) {
      console.error(`Error getting purchases for item ${itemId}:`, error);
      throw error;
    }
  }

  /**
   * Find purchases using a complex query
   *
   * @async
   * @param {Object} query - Complex query object with filters and operators
   * @param {Object} [options={}] - Additional query options
   * @return {Promise<Array>} - List of matching purchases
   */
  async findByQuery(query = {}, options = {}) {
    try {
      const {
        limit = 100,
        skip = 0,
        sort = {purchaseDate: -1},
      } = options;

      const mongoQuery = this._buildQuery(query);

      const purchases = await this.model
          .find(mongoQuery)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .exec();

      return purchases.map(documentToObject);
    } catch (error) {
      console.error("Error finding purchases by query:", error);
      throw error;
    }
  }

  /**
   * Generate a unique purchase number
   *
   * @async
   * @return {Promise<string>} - Generated unique purchase number
   */
  async generatePurchaseNumber() {
    try {
      const date = new Date();
      const year = date.getFullYear().toString().substr(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const prefix = `P${year}${month}`;

      // Count purchases with this prefix
      const count = await this.model.countDocuments({
        purchaseNumber: {$regex: `^${prefix}`},
      }).exec();

      // Generate purchase number with sequential number
      const sequentialNumber = (count + 1).toString().padStart(4, "0");
      return `${prefix}-${sequentialNumber}`;
    } catch (error) {
      console.error("Error generating purchase number:", error);
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

      // Handle date range queries for purchaseDate
      if (
        key === "purchaseDate" &&
        typeof value === "object" &&
        (value.$gte || value.$lte)
      ) {
        query.purchaseDate = {};

        if (value.$gte) {
          query.purchaseDate.$gte = new Date(value.$gte);
        }

        if (value.$lte) {
          query.purchaseDate.$lte = new Date(value.$lte);
        }

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

module.exports = MongoDBPurchaseRepository;
