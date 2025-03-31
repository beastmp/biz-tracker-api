/**
 * @interface DatabaseProvider
 * Interface for database provider operations
 */
class DatabaseProvider {
  /**
   * Connect to the database
   * @return {Promise<void>}
   */
  async connect() {
    throw new Error("Method not implemented");
  }

  /**
   * Disconnect from the database
   * @return {Promise<void>}
   */
  async disconnect() {
    throw new Error("Method not implemented");
  }

  /**
   * Check connection health
   * @return {Promise<Object>} Connection status object
   */
  async checkHealth() {
    throw new Error("Method not implemented");
  }

  /**
   * Create an item repository
   * @abstract
   * @throws {Error} When method is not implemented
   * @return {Object} Item repository implementation
   */
  createItemRepository() {
    throw new Error("Method not implemented");
  }

  /**
   * Create a sales repository
   * @abstract
   * @throws {Error} When method is not implemented
   * @return {Object} Sales repository implementation
   */
  createSalesRepository() {
    throw new Error("Method not implemented");
  }

  /**
   * Create a purchase repository
   * @abstract
   * @throws {Error} When method is not implemented
   * @return {Object} Purchase repository implementation
   */
  createPurchaseRepository() {
    throw new Error("Method not implemented");
  }

  /**
   * Create a transaction provider
   * @abstract
   * @throws {Error} When method is not implemented
   * @return {Object} Transaction provider implementation
   */
  createTransactionProvider() {
    throw new Error("Method not implemented");
  }

  /**
   * Check if this provider supports a specific repository type
   * @param {string} repositoryType - Type of repository to check
   * @abstract
   * @throws {Error} When method is not implemented
  * @return {boolean} True if supported
   */
  supportsRepository(repositoryType) {
    throw new Error("Method not implemented");
  }

  /**
   * Get the name of this provider implementation
   * @abstract
   * @throws {Error} When method is not implemented
   * @return {string} Provider name/identifier
   */
  getProviderName() {
    throw new Error("Method not implemented");
  }
}

module.exports = DatabaseProvider;
