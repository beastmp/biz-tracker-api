/**
 * Base Transaction Interface
 * Defines the contract that all transaction repositories must implement
 */

/**
 * Base interface for transaction repositories
 * @abstract
 */
class BaseTransactionInterface {
  /**
   * Create a new transaction
   * @abstract
   * @param {Object} data - Transaction data
   * @param {Object} [transaction] - Optional transaction object
   * @return {Promise<Object>} Created transaction
   */
  async create(data, transaction) {
    throw new Error("Method 'create' must be implemented.");
  }

  /**
   * Find transaction by ID
   * @abstract
   * @param {string} id - Transaction ID
   * @return {Promise<Object|null>} Transaction or null if not found
   */
  async findById(id) {
    throw new Error("Method 'findById' must be implemented.");
  }

  /**
   * Find all transactions matching a filter
   * @abstract
   * @param {Object} filter - Filter criteria
   * @param {Object} [options] - Query options (pagination, sorting, etc.)
   * @return {Promise<Array>} Matching transactions
   */
  async findAll(filter, options) {
    throw new Error("Method 'findAll' must be implemented.");
  }

  /**
   * Update a transaction
   * @abstract
   * @param {string} id - Transaction ID
   * @param {Object} data - Updated transaction data
   * @param {Object} [transaction] - Optional transaction object
   * @return {Promise<Object|null>} Updated transaction or null if not found
   */
  async update(id, data, transaction) {
    throw new Error("Method 'update' must be implemented.");
  }

  /**
   * Delete a transaction
   * @abstract
   * @param {string} id - Transaction ID
   * @param {Object} [transaction] - Optional transaction object
   * @return {Promise<boolean>} True if deleted, false if not found
   */
  async delete(id, transaction) {
    throw new Error("Method 'delete' must be implemented.");
  }

  /**
   * Search for transactions by text
   * @abstract
   * @param {string} text - Text to search for
   * @param {Object} [options] - Search options
   * @return {Promise<Array>} Matching transactions
   */
  async search(text, options) {
    throw new Error("Method 'search' must be implemented.");
  }

  /**
   * Count transactions matching a filter
   * @abstract
   * @param {Object} filter - Filter criteria
   * @return {Promise<number>} Count of matching transactions
   */
  async count(filter) {
    throw new Error("Method 'count' must be implemented.");
  }

  /**
   * Check if a transaction exists
   * @abstract
   * @param {Object} filter - Filter criteria
   * @return {Promise<boolean>} True if exists, false otherwise
   */
  async exists(filter) {
    throw new Error("Method 'exists' must be implemented.");
  }

  /**
   * Find one transaction matching a filter
   * @abstract
   * @param {Object} filter - Filter criteria
   * @return {Promise<Object|null>} Transaction or null if not found
   */
  async findOne(filter) {
    throw new Error("Method 'findOne' must be implemented.");
  }

  /**
   * Find transactions by a specific query
   * @abstract
   * @param {Object} query - Complex query object
   * @param {Object} [options] - Query options
   * @return {Promise<Array>} Matching transactions
   */
  async findByQuery(query, options) {
    throw new Error("Method 'findByQuery' must be implemented.");
  }

  /**
   * Bulk create transactions
   * @abstract
   * @param {Array<Object>} transactions - Array of transaction data
   * @param {Object} [transaction] - Optional transaction object
   * @return {Promise<Array>} Created transactions
   */
  async bulkCreate(transactions, transaction) {
    throw new Error("Method 'bulkCreate' must be implemented.");
  }

  /**
   * Bulk update transactions
   * @abstract
   * @param {Object} filter - Filter criteria
   * @param {Object} update - Update to apply
   * @param {Object} [transaction] - Optional transaction object
   * @return {Promise<number>} Number of updated transactions
   */
  async bulkUpdate(filter, update, transaction) {
    throw new Error("Method 'bulkUpdate' must be implemented.");
  }

  /**
   * Bulk delete transactions
   * @abstract
   * @param {Object} filter - Filter criteria
   * @param {Object} [transaction] - Optional transaction object
   * @return {Promise<number>} Number of deleted transactions
   */
  async bulkDelete(filter, transaction) {
    throw new Error("Method 'bulkDelete' must be implemented.");
  }

  /**
   * Find transactions by pattern in transactionId
   * @abstract
   * @param {string} pattern - Pattern to match (e.g., regex)
   * @param {Object} [options] - Query options
   * @return {Promise<Array>} Matching transactions
   */
  async findByPattern(pattern, options) {
    throw new Error("Method 'findByPattern' must be implemented.");
  }

  /**
   * Get transactions with joins to related data (e.g., items, parties)
   * @abstract
   * @param {Object} filter - Filter criteria
   * @param {Array<string>} relations - Relations to include
   * @param {Object} [options] - Query options
   * @return {Promise<Array>} Transactions with related data
   */
  async findWithRelations(filter, relations, options) {
    throw new Error("Method 'findWithRelations' must be implemented.");
  }
}

module.exports = BaseTransactionInterface;