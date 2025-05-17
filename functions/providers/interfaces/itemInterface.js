/**
 * Item Interface
 * Defines the provider-agnostic contract that all item repository
 * implementations must follow
 */

/**
 * Item Interface class defining the contract for item operations
 */
class ItemInterface {
  /**
   * Find all items matching filter criteria
   * @param {Object} filter - Query filters
   * @param {Object} options - Query options (sorting, pagination, etc.)
   * @return {Promise<Array>} - List of items
   */
  async findAll(filter = {}, options = {}) {
    throw new Error("Method 'findAll' must be implemented");
  }

  /**
   * Find item by ID
   * @param {string} id - Item ID
   * @return {Promise<Object|null>} - Item object or null if not found
   */
  async findById(id) {
    throw new Error("Method 'findById' must be implemented");
  }

  /**
   * Find items by multiple IDs
   * @param {Array<string>} ids - Array of item IDs
   * @return {Promise<Array>} - Array of found items
   */
  async findByIds(ids) {
    throw new Error("Method 'findByIds' must be implemented");
  }

  /**
   * Create a new item
   * @param {Object} itemData - Item data
   * @param {Object} [transaction] - Optional transaction
   * @return {Promise<Object>} - Created item
   */
  async create(itemData, transaction = null) {
    throw new Error("Method 'create' must be implemented");
  }

  /**
   * Update an existing item
   * @param {string} id - Item ID
   * @param {Object} itemData - Updated item data
   * @param {Object} [transaction] - Optional transaction
   * @return {Promise<Object|null>} - Updated item or null if not found
   */
  async update(id, itemData, transaction = null) {
    throw new Error("Method 'update' must be implemented");
  }

  /**
   * Delete an item
   * @param {string} id - Item ID
   * @param {Object} [transaction] - Optional transaction
   * @return {Promise<boolean>} - True if deleted, false if not found
   */
  async delete(id, transaction = null) {
    throw new Error("Method 'delete' must be implemented");
  }

  /**
   * Count items
   * @param {Object} filter - Filter criteria
   * @return {Promise<number>} - Count of matching items
   */
  async count(filter = {}) {
    throw new Error("Method 'count' must be implemented");
  }

  /**
   * Search items
   * @param {string} searchText - Search text
   * @param {Object} options - Search options
   * @return {Promise<Array>} - List of matching items
   */
  async search(searchText, options = {}) {
    throw new Error("Method 'search' must be implemented");
  }

  /**
   * Get items with inventory quantities
   * @param {Object} options - Query options
   * @return {Promise<Array>} - Items with quantities
   */
  async getItemsWithQuantities(options = {}) {
    throw new Error("Method 'getItemsWithQuantities' must be implemented");
  }

  /**
   * Get all unique categories
   * @return {Promise<Array<string>>} - List of categories
   */
  async getCategories() {
    throw new Error("Method 'getCategories' must be implemented");
  }

  /**
   * Get all unique tags
   * @return {Promise<Array<string>>} - List of tags
   */
  async getTags() {
    throw new Error("Method 'getTags' must be implemented");
  }

  /**
   * Get the next available SKU
   * @return {Promise<string>} - Next available SKU
   */
  async getNextSku() {
    throw new Error("Method 'getNextSku' must be implemented");
  }

  /**
   * Find items using a complex query
   * @param {Object} query - Complex query object with filters and operators
   * @return {Promise<Array>} - List of matching items
   */
  async findByQuery(query = {}) {
    throw new Error("Method 'findByQuery' must be implemented");
  }

  /**
   * Update item inventory quantities
   * @param {string} id - Item ID
   * @param {Object} quantities - Object with quantity changes keyed by tracking type
   * @param {Object} [transaction] - Optional transaction
   * @return {Promise<Object|null>} - Updated item or null if not found
   */
  async updateInventory(id, quantities, transaction = null) {
    throw new Error("Method 'updateInventory' must be implemented");
  }

  /**
   * Batch update multiple items
   * @param {Array<Object>} items - Array of items with id and update data
   * @param {Object} [transaction] - Optional transaction
   * @return {Promise<Array>} - Array of updated items
   */
  async batchUpdate(items, transaction = null) {
    throw new Error("Method 'batchUpdate' must be implemented");
  }
}

module.exports = ItemInterface;
