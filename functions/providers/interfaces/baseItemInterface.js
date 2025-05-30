/**
 * Base Item Interface
 * Defines the contract that all item repositories must implement
 */

/**
 * Base interface for item repositories
 * @abstract
 */
class BaseItemInterface {
  /**
   * Create a new item
   * @abstract
   * @param {Object} data - Item data
   * @param {Object} [transaction] - Optional transaction object
   * @return {Promise<Object>} Created item
   */
  async create(data, transaction) {
    throw new Error("Method 'create' must be implemented.");
  }

  /**
   * Find item by ID
   * @abstract
   * @param {string} id - Item ID
   * @return {Promise<Object|null>} Item or null if not found
   */
  async findById(id) {
    throw new Error("Method 'findById' must be implemented.");
  }

  /**
   * Find all items matching a filter
   * @abstract
   * @param {Object} filter - Filter criteria
   * @param {Object} [options] - Query options (pagination, sorting, etc.)
   * @return {Promise<Array>} Matching items
   */
  async findAll(filter, options) {
    throw new Error("Method 'findAll' must be implemented.");
  }

  /**
   * Update an item
   * @abstract
   * @param {string} id - Item ID
   * @param {Object} data - Updated item data
   * @param {Object} [transaction] - Optional transaction object
   * @return {Promise<Object|null>} Updated item or null if not found
   */
  async update(id, data, transaction) {
    throw new Error("Method 'update' must be implemented.");
  }

  /**
   * Delete an item
   * @abstract
   * @param {string} id - Item ID
   * @param {Object} [transaction] - Optional transaction object
   * @return {Promise<boolean>} True if deleted, false if not found
   */
  async delete(id, transaction) {
    throw new Error("Method 'delete' must be implemented.");
  }

  /**
   * Search for items by text
   * @abstract
   * @param {string} text - Text to search for
   * @param {Object} [options] - Search options
   * @return {Promise<Array>} Matching items
   */
  async search(text, options) {
    throw new Error("Method 'search' must be implemented.");
  }

  /**
   * Count items matching a filter
   * @abstract
   * @param {Object} filter - Filter criteria
   * @return {Promise<number>} Count of matching items
   */
  async count(filter) {
    throw new Error("Method 'count' must be implemented.");
  }

  /**
   * Check if an item exists
   * @abstract
   * @param {Object} filter - Filter criteria
   * @return {Promise<boolean>} True if exists, false otherwise
   */
  async exists(filter) {
    throw new Error("Method 'exists' must be implemented.");
  }

  /**
   * Find one item matching a filter
   * @abstract
   * @param {Object} filter - Filter criteria
   * @return {Promise<Object|null>} Item or null if not found
   */
  async findOne(filter) {
    throw new Error("Method 'findOne' must be implemented.");
  }

  /**
   * Find items by a specific query
   * @abstract
   * @param {Object} query - Complex query object
   * @param {Object} [options] - Query options
   * @return {Promise<Array>} Matching items
   */
  async findByQuery(query, options) {
    throw new Error("Method 'findByQuery' must be implemented.");
  }

  /**
   * Bulk create items
   * @abstract
   * @param {Array<Object>} items - Array of item data
   * @param {Object} [transaction] - Optional transaction object
   * @return {Promise<Array>} Created items
   */
  async bulkCreate(items, transaction) {
    throw new Error("Method 'bulkCreate' must be implemented.");
  }

  /**
   * Bulk update items
   * @abstract
   * @param {Object} filter - Filter criteria
   * @param {Object} update - Update to apply
   * @param {Object} [transaction] - Optional transaction object
   * @return {Promise<number>} Number of updated items
   */
  async bulkUpdate(filter, update, transaction) {
    throw new Error("Method 'bulkUpdate' must be implemented.");
  }

  /**
   * Bulk delete items
   * @abstract
   * @param {Object} filter - Filter criteria
   * @param {Object} [transaction] - Optional transaction object
   * @return {Promise<number>} Number of deleted items
   */
  async bulkDelete(filter, transaction) {
    throw new Error("Method 'bulkDelete' must be implemented.");
  }
}

module.exports = BaseItemInterface;