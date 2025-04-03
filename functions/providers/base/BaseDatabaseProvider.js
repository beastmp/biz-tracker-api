const DatabaseProvider = require("../interfaces/databaseProvider");

/**
 * Base implementation of DatabaseProvider with common functionality
 * @abstract
 */
class BaseDatabaseProvider extends DatabaseProvider {
  /**
   * Creates a new instance of BaseDatabaseProvider
   * @param {Object} config - Configuration settings for the database provider
   */
  constructor(config) {
    super();
    this.config = config;
    this.isConnected = false;
    this.supportedRepositories = [];
  }

  /**
   * Create an item repository
   * @throws {Error} When method not implemented by subclass
   */
  createItemRepository() {
    throw new Error(`Each database provider must implement
      createItemRepository()`);
  }

  /**
   * Create a sales repository
   * @throws {Error} When method not implemented by subclass
   */
  createSalesRepository() {
    throw new Error(`Each database provider must implement
      createSalesRepository()`);
  }

  /**
   * Create a purchase repository
   * @throws {Error} When method not implemented by subclass
   */
  createPurchaseRepository() {
    throw new Error(`Each database provider must implement
      createPurchaseRepository()`);
  }

  /**
   * Create a transaction provider
   * @throws {Error} When method not implemented by subclass
   */
  createTransactionProvider() {
    throw new Error(`Each database provider must implement
      createTransactionProvider()`);
  }

  /**
   * Check if this provider supports a specific repository type
   * @param {string} repositoryType - Type of repository to check
   * @return {boolean} True if supported
   */
  supportsRepository(repositoryType) {
    return this.supportedRepositories.includes(repositoryType);
  }

  /**
   * Get provider name - should be overridden by subclasses
   * @return {string} Provider name
   */
  getProviderName() {
    return "base";
  }
}

module.exports = BaseDatabaseProvider;
