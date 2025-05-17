/**
 * Sale Repository
 * Implements provider-agnostic business logic and operations for the Sale entity
 */

const SaleInterface = require("../interfaces/saleInterface");
const {Sale} = require("../../models/saleModel");
const {ValidationError} = require("../../validation/errors");

/**
 * Base sale repository implementation
 * Implements common business logic independent of the underlying database
 */
class SaleRepository extends SaleInterface {
  /**
   * Create a new sale repository
   * @param {Object} config - Configuration object
   */
  constructor(config = {}) {
    super();
    this.config = config;
    this.itemRepository = null;
    this.relationshipRepository = null;
    this.transactionProvider = null;
  }

  /**
   * Find all sales matching filter criteria
   * @param {Object} filter - Query filters
   * @param {Object} options - Query options (sorting, pagination, etc.)
   * @return {Promise<Array>} - List of sales
   */
  async findAll(filter = {}, options = {}) {
    throw new Error("Method 'findAll' must be implemented by provider");
  }

  /**
   * Find sale by ID
   * @param {string} id - Sale ID
   * @return {Promise<Object|null>} - Sale object or null if not found
   */
  async findById(id) {
    throw new Error("Method 'findById' must be implemented by provider");
  }

  /**
   * Find sales by multiple IDs
   * @param {Array<string>} ids - Array of sale IDs
   * @return {Promise<Array>} - Array of found sales
   */
  async findByIds(ids) {
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return [];
    }

    return Promise.all(ids.map((id) => this.findById(id)))
        .then((sales) => sales.filter((sale) => sale !== null));
  }

  /**
   * Create a new sale
   * @param {Object} saleData - Sale data
   * @param {Object} [transaction] - Optional transaction
   * @return {Promise<Object>} - Created sale
   */
  async create(saleData, transaction = null) {
    // Create sale instance to validate and process data
    const sale = new Sale(saleData);

    // Validate the sale data
    try {
      sale.validate();
    } catch (error) {
      throw new ValidationError(error.message);
    }

    // Generate a sale number if not provided
    if (!sale.saleNumber || sale.saleNumber.trim() === "") {
      sale.saleNumber = await this.generateSaleNumber();
    }

    // Update item totals
    sale.updateItemTotals();

    // Calculate total amount
    sale.calculateTotal();

    // Update payment status
    sale.updatePaymentStatus();

    throw new Error("Method 'create' must be implemented by provider");
  }

  /**
   * Update an existing sale
   * @param {string} id - Sale ID
   * @param {Object} saleData - Updated sale data
   * @param {Object} [transaction] - Optional transaction
   * @return {Promise<Object|null>} - Updated sale or null if not found
   */
  async update(id, saleData, transaction = null) {
    // Find existing sale
    const existingSale = await this.findById(id);
    if (!existingSale) {
      return null;
    }

    // Create sale instance with updated data
    const sale = new Sale({...existingSale, ...saleData});

    // Validate the updated sale data
    try {
      sale.validate();
    } catch (error) {
      throw new ValidationError(error.message);
    }

    // Update item totals
    sale.updateItemTotals();

    // Calculate total amount
    sale.calculateTotal();

    // Update payment status
    sale.updatePaymentStatus();

    throw new Error("Method 'update' must be implemented by provider");
  }

  /**
   * Delete a sale
   * @param {string} id - Sale ID
   * @param {Object} [transaction] - Optional transaction
   * @return {Promise<boolean>} - True if deleted, false if not found
   */
  async delete(id, transaction = null) {
    throw new Error("Method 'delete' must be implemented by provider");
  }

  /**
   * Count sales
   * @param {Object} filter - Filter criteria
   * @return {Promise<number>} - Count of matching sales
   */
  async count(filter = {}) {
    throw new Error("Method 'count' must be implemented by provider");
  }

  /**
   * Search sales
   * @param {string} searchText - Search text
   * @param {Object} options - Search options
   * @return {Promise<Array>} - List of matching sales
   */
  async search(searchText, options = {}) {
    throw new Error("Method 'search' must be implemented by provider");
  }

  /**
   * Get sales by customer
   * @param {string} customerId - Customer ID
   * @return {Promise<Array>} - List of sales for the customer
   */
  async getSalesByCustomer(customerId) {
    if (!customerId) {
      throw new ValidationError("Customer ID is required");
    }

    return this.findAll({customerId});
  }

  /**
   * Get sales by item
   * @param {string} itemId - Item ID
   * @return {Promise<Array>} - List of sales containing the item
   */
  async getSalesByItem(itemId) {
    if (!itemId) {
      throw new ValidationError("Item ID is required");
    }

    const allSales = await this.findAll({});

    // Filter sales that contain the item
    return allSales.filter((sale) =>
      sale.items &&
      sale.items.some((item) => item.itemId === itemId),
    );
  }

  /**
   * Find sales using a complex query
   * @param {Object} query - Complex query object with filters and operators
   * @return {Promise<Array>} - List of matching sales
   */
  async findByQuery(query = {}) {
    // Default implementation just passes to findAll
    // Provider should implement more sophisticated querying if supported
    return this.findAll(query);
  }

  /**
   * Generate a unique sale number
   * @return {Promise<string>} - Generated unique sale number
   */
  async generateSaleNumber() {
    const date = new Date();
    const year = date.getFullYear().toString().substr(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const prefix = `S${year}${month}`;

    // Get count of sales for this month to use as a sequential number
    const count = await this.count({
      saleNumber: {$regex: `^${prefix}`},
    });

    // Generate sale number with sequential number padded to 4 digits
    const sequentialNumber = (count + 1).toString().padStart(4, "0");
    return `${prefix}-${sequentialNumber}`;
  }

  /**
   * Record payment for a sale
   * @param {string} id - Sale ID
   * @param {Object} paymentData - Payment data (amount, method, date)
   * @param {Object} [transaction] - Optional transaction
   * @return {Promise<Object|null>} - Updated sale or null if not found
   */
  async recordPayment(id, paymentData, transaction = null) {
    if (!id) {
      throw new ValidationError("Sale ID is required");
    }

    if (!paymentData || typeof paymentData !== "object") {
      throw new ValidationError("Payment data is required");
    }

    if (typeof paymentData.amount !== "number" || paymentData.amount <= 0) {
      throw new ValidationError("Payment amount must be a positive number");
    }

    // Find the sale
    const sale = await this.findById(id);
    if (!sale) {
      return null;
    }

    // Create a Sale instance to use business logic
    const saleInstance = new Sale(sale);

    // Record the payment
    saleInstance.recordPayment(
        paymentData.amount,
        paymentData.method,
      paymentData.date ? new Date(paymentData.date) : new Date(),
    );

    // Update the sale with payment information
    return this.update(id, saleInstance.toObject(), transaction);
  }

  /**
   * Update sale status
   * @param {string} id - Sale ID
   * @param {string} status - New status
   * @param {Object} [transaction] - Optional transaction
   * @return {Promise<Object|null>} - Updated sale or null if not found
   */
  async updateStatus(id, status, transaction = null) {
    if (!id) {
      throw new ValidationError("Sale ID is required");
    }

    if (!status) {
      throw new ValidationError("Status is required");
    }

    // Validate status
    const validStatuses = [
      "draft",
      "confirmed",
      "shipped",
      "completed",
      "cancelled",
    ];

    if (!validStatuses.includes(status)) {
      throw new ValidationError(`Invalid status: ${status}`);
    }

    // Find the sale
    const sale = await this.findById(id);
    if (!sale) {
      return null;
    }

    // Create a Sale instance to use business logic
    const saleInstance = new Sale(sale);

    // Update the status based on the requested status
    switch (status) {
      case "confirmed":
        saleInstance.markAsConfirmed();
        break;
      case "completed":
        saleInstance.markAsCompleted();
        break;
      case "cancelled":
        saleInstance.cancel();
        break;
      default:
        saleInstance.status = status;
    }

    // Update the sale with the new status
    return this.update(id, saleInstance.toObject(), transaction);
  }

  /**
   * Get sales statistics
   * @param {Object} filter - Filter criteria for statistics
   * @return {Promise<Object>} - Sales statistics
   */
  async getStatistics(filter = {}) {
    // Get all sales matching the filter
    const sales = await this.findAll(filter);

    // Calculate total sales amount
    const totalAmount = sales.reduce(
        (sum, sale) => sum + (sale.totalAmount || 0),
        0,
    );

    // Calculate total number of sales
    const count = sales.length;

    // Calculate average sale amount
    const averageAmount = count > 0 ? totalAmount / count : 0;

    // Count sales by status
    const statusCounts = sales.reduce((counts, sale) => {
      const status = sale.status || "unknown";
      counts[status] = (counts[status] || 0) + 1;
      return counts;
    }, {});

    // Count sales by payment status
    const paymentStatusCounts = sales.reduce((counts, sale) => {
      const paymentStatus = sale.paymentStatus || "unknown";
      counts[paymentStatus] = (counts[paymentStatus] || 0) + 1;
      return counts;
    }, {});

    // Group sales by month
    const salesByMonth = sales.reduce((months, sale) => {
      if (sale.saleDate) {
        const date = new Date(sale.saleDate);
        const yearMonth = `${date.getFullYear()}-${(date.getMonth() + 1)
            .toString()
            .padStart(2, "0")}`;

        if (!months[yearMonth]) {
          months[yearMonth] = {
            count: 0,
            totalAmount: 0,
          };
        }

        months[yearMonth].count += 1;
        months[yearMonth].totalAmount += (sale.totalAmount || 0);
      }

      return months;
    }, {});

    return {
      totalAmount,
      count,
      averageAmount,
      statusCounts,
      paymentStatusCounts,
      salesByMonth,
    };
  }

  /**
   * Set item repository dependency
   * @param {Object} itemRepository - Item repository
   */
  setItemRepository(itemRepository) {
    this.itemRepository = itemRepository;
  }

  /**
   * Set relationship repository dependency
   * @param {Object} relationshipRepository - Relationship repository
   */
  setRelationshipRepository(relationshipRepository) {
    this.relationshipRepository = relationshipRepository;
  }

  /**
   * Set asset repository dependency
   * @param {Object} assetRepository - Asset repository
   */
  setAssetRepository(assetRepository) {
    this.assetRepository = assetRepository;
  }

  /**
   * Set transaction provider
   * @param {Object} transactionProvider - Transaction provider
   */
  setTransactionProvider(transactionProvider) {
    this.transactionProvider = transactionProvider;
  }
}

module.exports = SaleRepository;
