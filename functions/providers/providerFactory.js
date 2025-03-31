const config = require("./config");
const registry = require("./registry");
const {AppError} = require("../utils/errors");

/**
 * Factory class for managing and initializing
 * different providers and repositories
 * @class
 */
class ProviderFactory {
  /**
   * Creates an instance of ProviderFactory with empty provider instances
   * @constructor
   */
  constructor() {
    this.instances = {
      database: null,
      storage: null,
      repositories: {
        item: null,
        sales: null,
        purchase: null,
      },
      transactionProvider: null,
    };
  }

  /**
   * Initialize all configured providers
   * @return {Promise<ProviderFactory>} This provider factory instance
   */
  async initializeProviders() {
    try {
      // Initialize database provider
      await this.initializeDatabaseProvider();

      // Initialize storage provider
      await this.initializeStorageProvider();

      // Initialize repositories
      this.initializeRepositories();

      console.log("All providers and repositories initialized successfully");
      return this;
    } catch (error) {
      console.error("Failed to initialize providers:", error);
      throw new AppError(`Provider initialization failed:
        ${error.message}`, 500);
    }
  }

  /**
   * Initialize the database provider
   * @private
   */
  async initializeDatabaseProvider() {
    const dbProviderName = config.DB_PROVIDER;
    const dbProvider = registry.getProvider("database", dbProviderName);

    if (!dbProvider) {
      throw new AppError(`Database provider '${dbProviderName}'
        not found. Make sure it's registered correctly.`, 500);
    }

    try {
      // The provider is already an instance, no need to instantiate it
      this.instances.database = dbProvider;
      await this.instances.database.connect();
      console.log(`Database provider '${dbProviderName}'
        initialized successfully`);

      // Initialize transaction provider
      this.instances.transactionProvider =
        this.instances.database.createTransactionProvider();
    } catch (error) {
      throw new AppError(`Failed to initialize database provider
        '${dbProviderName}': ${error.message}`, 500);
    }
  }

  /**
   * Initialize the storage provider
   * @private
   */
  async initializeStorageProvider() {
    const storageProviderName = config.STORAGE_PROVIDER;
    const storageProvider =
      registry.getProvider("storage", storageProviderName);

    if (!storageProvider) {
      throw new AppError(`Storage provider '${storageProviderName}'
        not found. Make sure it's registered correctly.`, 500);
    }

    try {
      // The provider is already an instance, no need to instantiate it
      this.instances.storage = storageProvider;
      await this.instances.storage.initialize();
      console.log(`Storage provider '${storageProviderName}'
        initialized successfully`);

      if (!this.instances.storage.isConfigured()) {
        console.warn(`⚠️ Storage provider '${storageProviderName}'
          is not fully configured`);
      }
    } catch (error) {
      throw new AppError(`Failed to initialize storage provider
        '${storageProviderName}': ${error.message}`, 500);
    }
  }

  /**
   * Initialize all repositories
   * @private
   */
  initializeRepositories() {
    try {
      // Initialize repositories
      this.instances.repositories.item =
        this.instances.database.createItemRepository();
      this.instances.repositories.sales =
        this.instances.database.createSalesRepository();
      this.instances.repositories.purchase =
        this.instances.database.createPurchaseRepository();

      // Set up cross-repository references
      this.linkRepositories();

      console.log("All repositories initialized successfully");
    } catch (error) {
      throw new AppError(`Failed to initialize repositories:
        ${error.message}`, 500);
    }
  }

  /**
   * Replace a repository with a custom implementation
   * Useful for testing and mocking
   * @param {string} repositoryType Repository type ('item','sales','purchase')
   * @param {Object} customImplementation Custom repository implementation
   */
  setCustomRepository(repositoryType, customImplementation) {
    if (!this.instances.repositories[repositoryType]) {
      throw new Error(`Repository type '${repositoryType}' not found`);
    }

    console.log(`Replacing ${repositoryType}
      repository with custom implementation`);
    this.instances.repositories[repositoryType] = customImplementation;

    // Re-link dependencies if needed
    this.linkRepositories();
  }

  /**
   * Link repositories to each other (for dependencies)
   * @private
   */
  linkRepositories() {
    // Link sales and purchase repositories to item repository
    if (this.instances.repositories.sales &&
        this.instances.repositories.item) {
      if (this.instances.repositories.sales.setItemRepository) {
        this.instances.repositories.sales.
            setItemRepository(this.instances.repositories.item);
      } else {
        this.instances.repositories.sales.itemRepository =
          this.instances.repositories.item;
      }
    }

    if (this.instances.repositories.purchase &&
        this.instances.repositories.item) {
      if (this.instances.repositories.purchase.setItemRepository) {
        this.instances.repositories.purchase.
            setItemRepository(this.instances.repositories.item);
      } else {
        this.instances.repositories.purchase.itemRepository =
          this.instances.repositories.item;
      }
    }
  }

  /**
   * Get the database provider
   * @return {Object} Database provider instance
   */
  getDatabaseProvider() {
    if (!this.instances.database) {
      throw new Error("Database provider has not been initialized");
    }
    return this.instances.database;
  }

  /**
   * Get the storage provider
   * @return {Object} Storage provider instance
   */
  getStorageProvider() {
    if (!this.instances.storage) {
      throw new Error("Storage provider has not been initialized");
    }
    return this.instances.storage;
  }

  /**
   * Get the transaction provider
   * @return {Object} Transaction provider instance
   */
  getTransactionProvider() {
    if (!this.instances.transactionProvider) {
      throw new Error("Transaction provider has not been initialized");
    }
    return this.instances.transactionProvider;
  }

  /**
   * Get the item repository
   * @return {Object} Item repository instance
   */
  getItemRepository() {
    if (!this.instances.repositories.item) {
      throw new Error("Item repository has not been initialized");
    }
    return this.instances.repositories.item;
  }

  /**
   * Get the sales repository
   * @return {Object} Sales repository instance
   */
  getSalesRepository() {
    if (!this.instances.repositories.sales) {
      throw new Error("Sales repository has not been initialized");
    }
    return this.instances.repositories.sales;
  }

  /**
   * Get the purchase repository
   * @return {Object} Purchase repository instance
   */
  getPurchaseRepository() {
    if (!this.instances.repositories.purchase) {
      throw new Error("Purchase repository has not been initialized");
    }
    return this.instances.repositories.purchase;
  }

  /**
   * Shutdown all providers gracefully
   * @return {Promise<void>}
   */
  async shutdown() {
    try {
      if (this.instances.database) {
        await this.instances.database.disconnect();
      }
      console.log("All providers shut down successfully");
    } catch (error) {
      console.error("Error shutting down providers:", error);
      throw error;
    }
  }
}

module.exports = ProviderFactory;
