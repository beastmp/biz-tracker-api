/**
 * MongoDB Sale Repository Module
 *
 * Implements the MongoDB-specific logic for the Sale entity, providing
 * methods to create, retrieve, update, and delete sale records in
 * MongoDB.
 *
 * @module MongoDBSaleRepository
 * @requires ../../repositories/saleRepository
 * @requires ./modelFactory
 * @requires ./schemaGenerator
 */

const SaleRepository = require("../../repositories/saleRepository");
const {createModel} = require("./modelFactory");
const {
  documentToObject,
  objectToDocument,
} = require("./schemaGenerator");

/**
 * MongoDB-specific implementation of the Sale repository
 *
 * @class MongoDBSaleRepository
 * @extends SaleRepository
 */
class MongoDBSaleRepository extends SaleRepository {
  /**
   * Creates a new instance of MongoDBSaleRepository
   *
   * @constructor
   * @param {Object} config - Configuration options
   * @param {string} [config.collectionPrefix] - Prefix for collection names
   */
  constructor(config = {}) {
    super(config);
    this.collectionPrefix = config.collectionPrefix || "";
    this.model = createModel("Sale", this.collectionPrefix);
  }

  /**
   * Find all sales matching filter criteria
   *
   * @async
   * @param {Object} filter - Query filters
   * @param {Object} options - Query options (sorting, pagination, etc.)
   * @return {Promise<Array>} - List of sales
   */
  async findAll(filter = {}, options = {}) {
    const {
      limit = 100,
      skip = 0,
      sort = {createdAt: -1},
    } = options;

    try {
      const query = this._buildQuery(filter);

      const sales = await this.model
          .find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .exec();

      return sales.map(documentToObject);
    } catch (error) {
      console.error("Error finding sales:", error);
      throw error;
    }
  }

  /**
   * Find sale by ID
   *
   * @async
   * @param {string} id - Sale ID
   * @return {Promise<Object|null>} - Sale object or null if not found
   */
  async findById(id) {
    if (!id) return null;

    try {
      const sale = await this.model.findById(id).exec();
      return sale ? documentToObject(sale) : null;
    } catch (error) {
      console.error(`Error finding sale by ID ${id}:`, error);
      return null;
    }
  }

  /**
   * Find sales by multiple IDs
   *
   * @async
   * @param {Array<string>} ids - Array of sale IDs
   * @return {Promise<Array>} - Array of found sales
   */
  async findByIds(ids) {
    if (!ids || !ids.length) return [];

    try {
      const sales = await this.model
          .find({_id: {$in: ids}})
          .exec();

      return sales.map(documentToObject);
    } catch (error) {
      console.error(`Error finding sales by IDs:`, error);
      return [];
    }
  }

  /**
   * Create a new sale
   *
   * @async
   * @param {Object} saleData - Sale data
   * @param {Object} [transaction] - Optional transaction
   * @return {Promise<Object>} - Created sale
   */
  async create(saleData, transaction = null) {
    try {
      const docData = objectToDocument(saleData);
      // eslint-disable-next-line new-cap
      const sale = new this.model(docData);

      const options = transaction ? {session: transaction} : {};
      await sale.save(options);

      return documentToObject(sale);
    } catch (error) {
      console.error("Error creating sale:", error);
      throw error;
    }
  }

  /**
   * Update an existing sale
   *
   * @async
   * @param {string} id - Sale ID
   * @param {Object} saleData - Updated sale data
   * @param {Object} [transaction] - Optional transaction
   * @return {Promise<Object|null>} - Updated sale or null if not found
   */
  async update(id, saleData, transaction = null) {
    if (!id) throw new Error("ID is required for update");

    try {
      const docData = objectToDocument(saleData);

      // Remove id from data to prevent _id modification attempt
      if (docData._id) {
        delete docData._id;
      }

      const options = {new: true};
      if (transaction) {
        options.session = transaction;
      }

      const sale = await this.model
          .findByIdAndUpdate(id, docData, options)
          .exec();

      return sale ? documentToObject(sale) : null;
    } catch (error) {
      console.error(`Error updating sale ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a sale
   *
   * @async
   * @param {string} id - Sale ID
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
      console.error(`Error deleting sale ${id}:`, error);
      throw error;
    }
  }

  /**
   * Count sales
   *
   * @async
   * @param {Object} filter - Filter criteria
   * @return {Promise<number>} - Count of matching sales
   */
  async count(filter = {}) {
    try {
      const query = this._buildQuery(filter);
      return await this.model.countDocuments(query).exec();
    } catch (error) {
      console.error("Error counting sales:", error);
      throw error;
    }
  }

  /**
   * Search sales
   *
   * @async
   * @param {string} searchText - Search text
   * @param {Object} options - Search options
   * @return {Promise<Array>} - List of matching sales
   */
  async search(searchText, options = {}) {
    const {
      limit = 20,
      skip = 0,
      fields = ["customerName", "saleNumber", "notes"],
    } = options;

    try {
      // If text index exists, use it
      if (searchText && searchText.trim()) {
        try {
          const sales = await this.model
              .find(
                  {$text: {$search: searchText}},
                  {score: {$meta: "textScore"}},
              )
              .sort({score: {$meta: "textScore"}})
              .skip(skip)
              .limit(limit)
              .exec();

          return sales.map(documentToObject);
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

      const sales = await this.model
          .find(query)
          .skip(skip)
          .limit(limit)
          .exec();

      return sales.map(documentToObject);
    } catch (error) {
      console.error(`Error searching sales for "${searchText}":`, error);
      return [];
    }
  }

  /**
   * Generate a unique sale number
   *
   * @async
   * @return {Promise<string>} - Generated unique sale number
   */
  async generateSaleNumber() {
    try {
      const date = new Date();
      const year = date.getFullYear().toString().substr(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const prefix = `S${year}${month}`;

      // Count sales with this prefix
      const count = await this.model.countDocuments({
        saleNumber: {$regex: `^${prefix}`},
      }).exec();

      // Generate sale number with sequential number
      const sequentialNumber = (count + 1).toString().padStart(4, "0");
      return `${prefix}-${sequentialNumber}`;
    } catch (error) {
      console.error("Error generating sale number:", error);
      throw error;
    }
  }

  /**
   * Find sales by customer
   *
   * @async
   * @param {string} customerId - Customer ID
   * @param {Object} options - Query options
   * @return {Promise<Array>} - List of sales for the customer
   */
  async findByCustomer(customerId, options = {}) {
    try {
      const {
        limit = 100,
        skip = 0,
        sort = {saleDate: -1},
        status = null,
      } = options;

      const query = {customerId};

      if (status) {
        query.status = status;
      }

      const sales = await this.model
          .find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .exec();

      return sales.map(documentToObject);
    } catch (error) {
      console.error(`Error finding sales for customer ${customerId}:`, error);
      throw error;
    }
  }

  /**
   * Update sale status
   *
   * @async
   * @param {string} id - Sale ID
   * @param {string} status - New status
   * @param {Object} [metadata={}] - Additional status-related metadata
   * @param {Object} [transaction] - Optional transaction
   * @return {Promise<Object|null>} - Updated sale or null if not found
   */
  async updateStatus(id, status, metadata = {}, transaction = null) {
    if (!id) throw new Error("ID is required for status update");
    if (!status) throw new Error("Status is required for update");

    try {
      const updateData = {
        status,
        ...metadata,
        statusUpdatedAt: new Date(),
      };

      const options = {new: true};
      if (transaction) {
        options.session = transaction;
      }

      const sale = await this.model
          .findByIdAndUpdate(
              id,
              {$set: updateData},
              options,
          )
          .exec();

      return sale ? documentToObject(sale) : null;
    } catch (error) {
      console.error(`Error updating status for sale ${id}:`, error);
      throw error;
    }
  }

  /**
   * Add items to a sale
   *
   * @async
   * @param {string} id - Sale ID
   * @param {Array<Object>} items - Items to add to the sale
   * @param {Object} [transaction] - Optional transaction
   * @return {Promise<Object|null>} - Updated sale or null if not found
   */
  async addItems(id, items, transaction = null) {
    if (!id) throw new Error("Sale ID is required");
    if (!items || !Array.isArray(items) || !items.length) {
      throw new Error("Items array is required and must not be empty");
    }

    try {
      const options = {new: true};
      if (transaction) {
        options.session = transaction;
      }

      const sale = await this.model
          .findByIdAndUpdate(
              id,
              {$push: {items: {$each: items}}},
              options,
          )
          .exec();

      return sale ? documentToObject(sale) : null;
    } catch (error) {
      console.error(`Error adding items to sale ${id}:`, error);
      throw error;
    }
  }

  /**
   * Remove items from a sale
   *
   * @async
   * @param {string} id - Sale ID
   * @param {Array<string>} itemIds - IDs of items to remove
   * @param {Object} [transaction] - Optional transaction
   * @return {Promise<Object|null>} - Updated sale or null if not found
   */
  async removeItems(id, itemIds, transaction = null) {
    if (!id) throw new Error("Sale ID is required");
    if (!itemIds || !Array.isArray(itemIds) || !itemIds.length) {
      throw new Error("Item IDs array is required and must not be empty");
    }

    try {
      const options = {new: true};
      if (transaction) {
        options.session = transaction;
      }

      const sale = await this.model
          .findByIdAndUpdate(
              id,
              {$pull: {items: {_id: {$in: itemIds}}}},
              options,
          )
          .exec();

      return sale ? documentToObject(sale) : null;
    } catch (error) {
      console.error(`Error removing items from sale ${id}:`, error);
      throw error;
    }
  }

  /**
   * Update payment information for a sale
   *
   * @async
   * @param {string} id - Sale ID
   * @param {Object} paymentData - Payment data to update
   * @param {Object} [transaction] - Optional transaction
   * @return {Promise<Object|null>} - Updated sale or null if not found
   */
  async updatePayment(id, paymentData, transaction = null) {
    if (!id) throw new Error("Sale ID is required");
    if (!paymentData) throw new Error("Payment data is required");

    try {
      const options = {new: true};
      if (transaction) {
        options.session = transaction;
      }

      // Calculate payment totals
      const sale = await this.model.findById(id).exec();
      if (!sale) return null;

      const currentSale = documentToObject(sale);

      // Prepare update data
      const updateData = {};

      // Update payment status if provided
      if (paymentData.paymentStatus) {
        updateData.paymentStatus = paymentData.paymentStatus;
      }

      // Add a new payment if provided
      if (paymentData.payment) {
        if (!updateData.$push) updateData.$push = {};
        updateData.$push.payments = paymentData.payment;

        // Calculate new paid amount and balance
        const payments = [...currentSale.payments, paymentData.payment];
        const paidAmount = payments.reduce(
            (total, payment) => total + (payment.amount || 0),
            0,
        );
        const balanceDue = currentSale.totalAmount - paidAmount;

        // Use $set for these calculated fields
        if (!updateData.$set) updateData.$set = {};
        updateData.$set.paidAmount = paidAmount;
        updateData.$set.balanceDue = balanceDue;

        // Auto-update payment status based on balance
        if (balanceDue <= 0 && !paymentData.paymentStatus) {
          updateData.$set.paymentStatus = "paid";
        } else if (
          paidAmount > 0 &&
            balanceDue > 0 &&
            !paymentData.paymentStatus
        ) {
          updateData.$set.paymentStatus = "partial";
        }
      }

      // Update due date if provided
      if (paymentData.paymentDueDate) {
        if (!updateData.$set) updateData.$set = {};
        updateData.$set.paymentDueDate = paymentData.paymentDueDate;
      }

      // Apply the update
      const updatedSale = await this.model
          .findByIdAndUpdate(id, updateData, options)
          .exec();

      return updatedSale ? documentToObject(updatedSale) : null;
    } catch (error) {
      console.error(`Error updating payment for sale ${id}:`, error);
      throw error;
    }
  }

  /**
   * Process shipment for a sale
   *
   * @async
   * @param {string} id - Sale ID
   * @param {Object} shipmentData - Shipment data
   * @param {Object} [transaction] - Optional transaction
   * @return {Promise<Object|null>} - Updated sale or null if not found
   */
  async processShipment(id, shipmentData, transaction = null) {
    if (!id) throw new Error("Sale ID is required");
    if (!shipmentData) throw new Error("Shipment data is required");

    try {
      const options = {new: true};
      if (transaction) {
        options.session = transaction;
      }

      const updateData = {
        "shippingDetails.shippedDate": shipmentData.shippedDate || new Date(),
        "shippingDetails.trackingNumber": shipmentData.trackingNumber,
        "shippingDetails.carrier": shipmentData.carrier,
        "shippingDetails.shippingMethod": shipmentData.shippingMethod,
        "status": "shipped",
        "statusUpdatedAt": new Date(),
      };

      // If there are shipped items details, add them
      if (shipmentData.shippedItems && shipmentData.shippedItems.length) {
        updateData["shippingDetails.shippedItems"] = shipmentData.shippedItems;
      }

      const sale = await this.model
          .findByIdAndUpdate(
              id,
              {$set: updateData},
              options,
          )
          .exec();

      return sale ? documentToObject(sale) : null;
    } catch (error) {
      console.error(`Error processing shipment for sale ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get sales summary by date range
   *
   * @async
   * @param {Date} startDate - Start date for the summary
   * @param {Date} endDate - End date for the summary
   * @param {Object} [options] - Additional options
   * @return {Promise<Object>} - Sales summary object
   */
  async getSalesSummary(startDate, endDate, options = {}) {
    try {
      const {groupBy = "day"} = options;

      let dateFormat;

      // Configure grouping format based on the groupBy parameter
      switch (groupBy) {
        case "day":
          dateFormat = {
            year: {$year: "$saleDate"},
            month: {$month: "$saleDate"},
            day: {$dayOfMonth: "$saleDate"},
          };
          break;
        case "month":
          dateFormat = {
            year: {$year: "$saleDate"},
            month: {$month: "$saleDate"},
          };
          break;
        case "year":
          dateFormat = {
            year: {$year: "$saleDate"},
          };
          break;
        default:
          dateFormat = {
            year: {$year: "$saleDate"},
            month: {$month: "$saleDate"},
            day: {$dayOfMonth: "$saleDate"},
          };
      }

      // Create the group by stage
      const groupByStage = {
        _id: dateFormat,
        count: {$sum: 1},
        totalAmount: {$sum: "$totalAmount"},
        subtotal: {$sum: "$subtotal"},
        taxTotal: {$sum: "$taxTotal"},
        discountTotal: {$sum: "$discountTotal"},
        paidAmount: {$sum: "$paidAmount"},
        balanceDue: {$sum: "$balanceDue"},
      };

      // Run aggregation
      const results = await this.model.aggregate([
        {
          $match: {
            saleDate: {
              $gte: startDate,
              $lte: endDate,
            },
          },
        },
        {
          $group: groupByStage,
        },
        {
          $sort: {"_id.year": 1, "_id.month": 1, "_id.day": 1},
        },
      ]).exec();

      // Format the results for better usability
      const formattedResults = results.map((item) => {
        const dateObj = {...item._id};
        let dateStr;

        if (groupBy === "day") {
          dateStr = `${dateObj.year}-${String(dateObj.month).padStart(2, "0")}-${
            String(dateObj.day).padStart(2, "0")
          }`;
        } else if (groupBy === "month") {
          dateStr = `${dateObj.year}-${String(dateObj.month).padStart(2, "0")}`;
        } else {
          dateStr = `${dateObj.year}`;
        }

        return {
          date: dateStr,
          count: item.count,
          totalAmount: item.totalAmount,
          subtotal: item.subtotal,
          taxTotal: item.taxTotal,
          discountTotal: item.discountTotal,
          paidAmount: item.paidAmount,
          balanceDue: item.balanceDue,
        };
      });

      // Calculate the overall summary
      const totalSales = results.reduce((sum, item) => sum + item.count, 0);
      const totalAmount = results.reduce(
          (sum, item) => sum + item.totalAmount,
          0,
      );
      const totalPaid = results.reduce(
          (sum, item) => sum + item.paidAmount,
          0,
      );
      const totalBalance = results.reduce(
          (sum, item) => sum + item.balanceDue,
          0,
      );

      return {
        summary: {
          totalSales,
          totalAmount,
          totalPaid,
          totalBalance,
          startDate,
          endDate,
        },
        detail: formattedResults,
      };
    } catch (error) {
      console.error("Error getting sales summary:", error);
      throw error;
    }
  }

  /**
   * Build query object from filters
   *
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

module.exports = MongoDBSaleRepository;
