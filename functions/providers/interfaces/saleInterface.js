/**
 * Sale Interface
 * Defines the provider-agnostic contract that all sale repository
 * implementations must follow
 */

/**
 * Sale Interface class defining the contract for sale operations
 */
class SaleInterface {
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
    throw new Error("Method 'findByIds' must be implemented by provider");
  }

  /**
   * Create a new sale
   * @param {Object} saleData - Sale data
   * @param {Object} [transaction] - Optional transaction
   * @return {Promise<Object>} - Created sale
   */
  async create(saleData, transaction = null) {
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
    throw new Error("Method 'getSalesByCustomer' must be implemented by provider");
  }

  /**
   * Get sales by item
   * @param {string} itemId - Item ID
   * @return {Promise<Array>} - List of sales containing the item
   */
  async getSalesByItem(itemId) {
    throw new Error("Method 'getSalesByItem' must be implemented by provider");
  }

  /**
   * Find sales using a complex query
   * @param {Object} query - Complex query object with filters and operators
   * @return {Promise<Array>} - List of matching sales
   */
  async findByQuery(query = {}) {
    throw new Error("Method 'findByQuery' must be implemented by provider");
  }

  /**
   * Generate a unique sale number
   * @return {Promise<string>} - Generated unique sale number
   */
  async generateSaleNumber() {
    throw new Error("Method 'generateSaleNumber' must be implemented by provider");
  }

  /**
   * Record payment for a sale
   * @param {string} id - Sale ID
   * @param {Object} paymentData - Payment data (amount, method, date)
   * @param {Object} [transaction] - Optional transaction
   * @return {Promise<Object|null>} - Updated sale or null if not found
   */
  async recordPayment(id, paymentData, transaction = null) {
    throw new Error("Method 'recordPayment' must be implemented by provider");
  }

  /**
   * Update sale status
   * @param {string} id - Sale ID
   * @param {string} status - New status
   * @param {Object} [transaction] - Optional transaction
   * @return {Promise<Object|null>} - Updated sale or null if not found
   */
  async updateStatus(id, status, transaction = null) {
    throw new Error("Method 'updateStatus' must be implemented by provider");
  }

  /**
   * Get sales statistics
   * @param {Object} filter - Filter criteria for statistics
   * @return {Promise<Object>} - Sales statistics object
   */
  async getStatistics(filter = {}) {
    throw new Error("Method 'getStatistics' must be implemented by provider");
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
   * Set transaction provider
   * @param {Object} transactionProvider - Transaction provider
   */
  setTransactionProvider(transactionProvider) {
    this.transactionProvider = transactionProvider;
  }
}

module.exports = SaleInterface;
