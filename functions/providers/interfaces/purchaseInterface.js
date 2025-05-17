/**
 * Purchase Interface
 * Defines the provider-agnostic contract that all purchase repository
 * implementations must follow
 */

/**
 * Purchase Interface class defining the contract for purchase operations
 */
class PurchaseInterface {
  /**
   * Find all purchases matching filter criteria
   * @param {Object} filter - Query filters
   * @param {Object} options - Query options (sorting, pagination, etc.)
   * @return {Promise<Array>} - List of purchases
   */
  async findAll(filter = {}, options = {}) {
    throw new Error("Method 'findAll' must be implemented");
  }

  /**
   * Find purchase by ID
   * @param {string} id - Purchase ID
   * @return {Promise<Object|null>} - Purchase object or null if not found
   */
  async findById(id) {
    throw new Error("Method 'findById' must be implemented");
  }

  /**
   * Find purchases by multiple IDs
   * @param {Array<string>} ids - Array of purchase IDs
   * @return {Promise<Array>} - Array of found purchases
   */
  async findByIds(ids) {
    throw new Error("Method 'findByIds' must be implemented");
  }

  /**
   * Create a new purchase
   * @param {Object} purchaseData - Purchase data
   * @param {Object} [transaction] - Optional transaction
   * @return {Promise<Object>} - Created purchase
   */
  async create(purchaseData, transaction = null) {
    throw new Error("Method 'create' must be implemented");
  }

  /**
   * Update an existing purchase
   * @param {string} id - Purchase ID
   * @param {Object} purchaseData - Updated purchase data
   * @param {Object} [transaction] - Optional transaction
   * @return {Promise<Object|null>} - Updated purchase or null if not found
   */
  async update(id, purchaseData, transaction = null) {
    throw new Error("Method 'update' must be implemented");
  }

  /**
   * Delete a purchase
   * @param {string} id - Purchase ID
   * @param {Object} [transaction] - Optional transaction
   * @return {Promise<boolean>} - True if deleted, false if not found
   */
  async delete(id, transaction = null) {
    throw new Error("Method 'delete' must be implemented");
  }

  /**
   * Count purchases
   * @param {Object} filter - Filter criteria
   * @return {Promise<number>} - Count of matching purchases
   */
  async count(filter = {}) {
    throw new Error("Method 'count' must be implemented");
  }

  /**
   * Search purchases
   * @param {string} searchText - Search text
   * @param {Object} options - Search options
   * @return {Promise<Array>} - List of matching purchases
   */
  async search(searchText, options = {}) {
    throw new Error("Method 'search' must be implemented");
  }

  /**
   * Get all unique suppliers
   * @return {Promise<Array<string>>} - List of suppliers
   */
  async getSuppliers() {
    throw new Error("Method 'getSuppliers' must be implemented");
  }

  /**
   * Get all unique tags
   * @return {Promise<Array<string>>} - List of tags
   */
  async getTags() {
    throw new Error("Method 'getTags' must be implemented");
  }

  /**
   * Generate the next purchase number
   * @return {Promise<string>} - Next purchase number
   */
  async generatePurchaseNumber() {
    throw new Error("Method 'generatePurchaseNumber' must be implemented");
  }

  /**
   * Receive items for a purchase
   * @param {string} id - Purchase ID
   * @param {Array} receivedItems - Array of received items with quantities
   * @param {Object} [transaction] - Optional transaction
   * @return {Promise<Object|null>} - Updated purchase or null if not found
   */
  async receiveItems(id, receivedItems, transaction = null) {
    throw new Error("Method 'receiveItems' must be implemented");
  }

  /**
   * Record payment for a purchase
   * @param {string} id - Purchase ID
   * @param {Object} paymentData - Payment data
   * @param {Object} [transaction] - Optional transaction
   * @return {Promise<Object|null>} - Updated purchase or null if not found
   */
  async recordPayment(id, paymentData, transaction = null) {
    throw new Error("Method 'recordPayment' must be implemented");
  }

  /**
   * Mark purchase as ordered
   * @param {string} id - Purchase ID
   * @param {Object} [transaction] - Optional transaction
   * @return {Promise<Object|null>} - Updated purchase or null if not found
   */
  async markAsOrdered(id, transaction = null) {
    throw new Error("Method 'markAsOrdered' must be implemented");
  }

  /**
   * Mark purchase as completed
   * @param {string} id - Purchase ID
   * @param {Object} [transaction] - Optional transaction
   * @return {Promise<Object|null>} - Updated purchase or null if not found
   */
  async markAsCompleted(id, transaction = null) {
    throw new Error("Method 'markAsCompleted' must be implemented");
  }

  /**
   * Cancel a purchase
   * @param {string} id - Purchase ID
   * @param {string} reason - Cancellation reason
   * @param {Object} [transaction] - Optional transaction
   * @return {Promise<Object|null>} - Updated purchase or null if not found
   */
  async cancelPurchase(id, reason, transaction = null) {
    throw new Error("Method 'cancelPurchase' must be implemented");
  }

  /**
   * Get purchases by supplier
   * @param {string} supplierId - Supplier ID
   * @return {Promise<Array>} - List of purchases from the supplier
   */
  async getPurchasesBySupplier(supplierId) {
    throw new Error("Method 'getPurchasesBySupplier' must be implemented");
  }

  /**
   * Get purchases by item
   * @param {string} itemId - Item ID
   * @return {Promise<Array>} - List of purchases containing the item
   */
  async getPurchasesByItem(itemId) {
    throw new Error("Method 'getPurchasesByItem' must be implemented");
  }

  /**
   * Generate purchase report
   * @param {Object} options - Report options
   * @return {Promise<Object>} - Purchase report data
   */
  async generateReport(options = {}) {
    throw new Error("Method 'generateReport' must be implemented");
  }

  /**
   * Find purchases using a complex query
   * @param {Object} query - Complex query object with filters and operators
   * @return {Promise<Array>} - List of matching purchases
   */
  async findByQuery(query = {}) {
    throw new Error("Method 'findByQuery' must be implemented");
  }

  /**
   * Add document to purchase
   * @param {string} id - Purchase ID
   * @param {string} documentUrl - URL to the document
   * @return {Promise<Object|null>} - Updated purchase or null if not found
   */
  async addDocument(id, documentUrl) {
    throw new Error("Method 'addDocument' must be implemented");
  }
}

module.exports = PurchaseInterface;
