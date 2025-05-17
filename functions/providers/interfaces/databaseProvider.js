/**
 * Database Provider Interface
 * Defines the contract for all database providers
 */
class DatabaseProvider {
  /**
   * Connect to the database
   * @return {Promise<void>}
   */
  async connect() {
    throw new Error("Method 'connect' must be implemented");
  }

  /**
   * Disconnect from the database
   * @return {Promise<void>}
   */
  async disconnect() {
    throw new Error("Method 'disconnect' must be implemented");
  }

  /**
   * Check database connection health
   * @return {Promise<Object>} Connection status object
   */
  async checkHealth() {
    throw new Error("Method 'checkHealth' must be implemented");
  }

  /**
   * Create an item repository
   * @param {Object} options Configuration options
   */
  createItemRepository(options = {}) {
    throw new Error("Method 'createItemRepository' must be implemented");
  }

  /**
   * Create a purchase repository
   * @param {Object} options Configuration options
   */
  createPurchaseRepository(options = {}) {
    throw new Error("Method 'createPurchaseRepository' must be implemented");
  }

  /**
   * Create a sales repository
   * @param {Object} options Configuration options
   */
  createSalesRepository(options = {}) {
    throw new Error("Method 'createSalesRepository' must be implemented");
  }

  /**
   * Create an asset repository
   * @param {Object} options Configuration options
   */
  createAssetRepository(options = {}) {
    throw new Error("Method 'createAssetRepository' must be implemented");
  }

  /**
   * Create a relationship repository
   * @param {Object} options Configuration options
   */
  createRelationshipRepository(options = {}) {
    throw new Error("Method 'createRelationshipRepository' must be implemented");
  }

  /**
   * Create a transaction provider
   * @param {Object} options Configuration options
   */
  createTransactionProvider(options = {}) {
    throw new Error("Method 'createTransactionProvider' must be implemented");
  }

  /**
   * Get the name of this provider implementation
   */
  getProviderName() {
    throw new Error("Method 'getProviderName' must be implemented");
  }
}

module.exports = DatabaseProvider;
