/**
 * @interface ItemRepository
 * Interface that defines methods
 * each item repository implementation must provide
 */
class ItemRepository {
  /**
   * Find all items matching filter criteria
   * @param {Object} filter Query filters (e.g., {businessId})
   * @return {Promise<Array>} List of items
   */
  async findAll(filter = {}) {
    throw new Error("Method not implemented");
  }

  /**
   * Find item by ID
   * @param {string} id Item ID
   * @return {Promise<Object|null>} Item object or null if not found
   */
  async findById(id) {
    throw new Error("Method not implemented");
  }

  /**
   * Create a new item
   * @param {Object} itemData Item data
   * @return {Promise<Object>} Created item
   */
  async create(itemData) {
    throw new Error("Method not implemented");
  }

  /**
   * Update an existing item
   * @param {string} id Item ID
   * @param {Object} itemData Updated item data
   * @return {Promise<Object|null>} Updated item or null if not found
   */
  async update(id, itemData) {
    throw new Error("Method not implemented");
  }

  /**
   * Update item image
   * @param {string} id Item ID
   * @param {string} imageUrl URL to the uploaded image
   * @return {Promise<Object|null>} Updated item or null if not found
   */
  async updateImage(id, imageUrl) {
    throw new Error("Method not implemented");
  }

  /**
   * Delete an item
   * @param {string} id Item ID
   * @return {Promise<boolean>} True if deleted, false if not found
   */
  async delete(id) {
    throw new Error("Method not implemented");
  }

  /**
   * Get the next available SKU
   * @return {Promise<string>} Next available SKU
   */
  async getNextSku() {
    throw new Error("Method not implemented");
  }

  /**
   * Get all unique categories
   * @return {Promise<Array<string>>} List of categories
   */
  async getCategories() {
    throw new Error("Method not implemented");
  }

  /**
   * Get all unique tags
   * @return {Promise<Array<string>>} List of tags
   */
  async getTags() {
    throw new Error("Method not implemented");
  }

  /**
   * Rebuild relationships between items
   * @return {Promise<Object>} Result summary
   */
  async rebuildRelationships() {
    throw new Error("Method not implemented");
  }

  /**
   * Get relationships for a specific item
   * @param {string} id Item ID
   * @return {Promise<Object>} Relationship data
   */
  async getItemRelationships(id) {
    throw new Error("Method not implemented");
  }

  /**
   * Find items using a complex query
   * @param {Object} query Complex query object with filters and operators
   * @return {Promise<Array>} List of matching items
   */
  async findByQuery(query = {}) {
    throw new Error("Method not implemented");
  }

  /**
   * Update item relationships
   * @param {string} itemId Item ID
   * @param {Array<string>} relatedItems IDs of related items
   * @param {string} relationType Type of relationship (e.g. 'usedIn')
   * @return {Promise<Object>} Updated item
   */
  async updateRelationships(itemId, relatedItems, relationType) {
    throw new Error("Method not implemented");
  }

  /**
   * Create derived items from a source/generic item
   * @param {string} sourceItemId ID of the source item
   * @param {Array} derivedItems Array of derived item data
   * @param {Object} [transaction] Optional transaction
   * @return {Promise<Object>} Object containing source item and derived items
   */
  async createDerivedItems(sourceItemId, derivedItems, transaction) {
    throw new Error("Method not implemented");
  }

  /**
   * Get derived items for a source item
   * @param {string} sourceItemId ID of the source item
   * @return {Promise<Array>} Array of derived items
   */
  async getDerivedItems(sourceItemId) {
    throw new Error("Method not implemented");
  }

  /**
   * Get the parent item for a derived item
   * @param {string} derivedItemId ID of the derived item
   * @return {Promise<Object|null>} Parent item or null
   */
  async getParentItem(derivedItemId) {
    throw new Error("Method not implemented");
  }
}

module.exports = ItemRepository;
