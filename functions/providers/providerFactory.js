/**
 * Provider Factory Module
 *
 * This module implements a factory pattern for creating and managing provider
 * instances and repositories. It centralizes the creation of database providers
 * and their repositories, handling dependencies between them.
 *
 * @module ProviderFactory
 * @requires ./config
 * @requires ./registry
 * @requires ./operationsFactory
 */
const config = require("./config");
const ProviderRegistry = require("./registry");

/**
 * Factory class for creating and managing provider instances and repositories
 *
 * @class ProviderFactory
 */
class ProviderFactory {
  /**
   * Creates a new ProviderFactory instance
   *
   * @constructor
   */
  constructor() {
    this.config = config;
    this.registry = ProviderRegistry;
    this.activeProviders = {};
    this.repositories = {};

    // Structure the configuration properly for easier access
    this.config.database = {
      uri: this.config.DB_URI,
      provider: this.config.DB_PROVIDER,
    };

    this.config.storage = {
      provider: this.config.STORAGE_PROVIDER,
      bucket: this.config.STORAGE_BUCKET,
    };
  }

  /**
   * Initializes the factory with optional custom configuration
   *
   * @param {Object} [customConfig=null] - Custom configuration to override defaults
   * @return {ProviderFactory} This factory instance for method chaining
   */
  initialize(customConfig = null) {
    if (customConfig) {
      this.config = {...this.config, ...customConfig};
    }
    return this;
  }

  /**
   * Initializes all providers including database and storage
   *
   * @async
   * @param {Object} [customConfig=null] - Optional custom configuration
   * @param {string} [instanceId="main"] - Instance identifier for logging
   * @return {Promise<ProviderFactory>} This factory instance
   */
  async initializeProviders(customConfig = null, instanceId = "main") {
    // Initialize the factory configuration
    this.initialize(customConfig);

    // Initialize database provider
    await this.initializeDatabaseProvider(instanceId);
    
    // Initialize storage provider
    await this.initializeStorageProvider(instanceId);

    return this;
  }
  
  /**
   * Initializes the database provider
   *
   * @async
   * @param {string} [instanceId="main"] - Instance identifier for logging
   * @return {Promise<Object>} The initialized database provider
   */
  async initializeDatabaseProvider(instanceId = "main") {
    // Get the configured database provider ID
    const dbProviderId = (this.config.database && this.config.database.provider) || "mongodb";
    const dbProvider = this.getProvider("database", dbProviderId);

    // If the provider has an initialize method, call it
    if (dbProvider && typeof dbProvider.initialize === "function") {
      console.log(`[${instanceId}] 🔄 Initializing database provider: ${dbProviderId}...`);
      await dbProvider.initialize(this.config.database, instanceId);
      console.log(`[${instanceId}] ✅ Database provider ${dbProviderId} initialized successfully`);
    } else {
      console.warn(`[${instanceId}] ⚠️ Database provider ${dbProviderId} has no initialize method`);

      // Try to connect directly if there's a connect method
      if (dbProvider && typeof dbProvider.connect === "function") {
        console.log(`[${instanceId}] 🔄 Connecting to database using provider: ${dbProviderId}...`);
        await dbProvider.connect(instanceId);
        console.log(`[${instanceId}] ✅ Database connection established using ${dbProviderId}`);
      }
    }
    
    return dbProvider;
  }
  
  /**
   * Initializes the storage provider
   *
   * @async
   * @param {string} [instanceId="main"] - Instance identifier for logging
   * @return {Promise<Object>} The initialized storage provider
   */
  async initializeStorageProvider(instanceId = "main") {
    // Get the configured storage provider ID
    const storageProviderId = (this.config.storage && this.config.storage.provider) || "firebase";
    const storageProvider = this.getProvider("storage", storageProviderId);
    
    // If the provider has an initialize method, call it
    if (storageProvider && typeof storageProvider.initialize === "function") {
      console.log(`[${instanceId}] 🔄 Initializing storage provider: ${storageProviderId}...`);
      await storageProvider.initialize(this.config.storage, instanceId);
      console.log(`[${instanceId}] ✅ Storage provider ${storageProviderId} initialized successfully`);
    } else {
      console.warn(
        `[${instanceId}] ⚠️ Storage provider ${storageProviderId} has no initialize method`
      );
      
      // Try to connect directly if there's a connect method
      if (storageProvider && typeof storageProvider.connect === "function") {
        console.log(`[${instanceId}] 🔄 Connecting to storage using provider: ${storageProviderId}...`);
        await storageProvider.connect(instanceId);
        console.log(`[${instanceId}] ✅ Storage connection established using ${storageProviderId}`);
      }
    }
    
    return storageProvider;
  }

  /**
   * Retrieves a provider instance by type and ID, creating it if necessary
   *
   * @param {string} type - Provider category (e.g., 'database', 'storage')
   * @param {string} id - Provider identifier (e.g., 'mongodb', 'postgres')
   * @throws {Error} When the requested provider is not registered
   * @return {Object} The provider instance
   */
  getProvider(type, id) {
    const key = `${type}-${id}`;

    // Check if we already have an active provider instance
    if (this.activeProviders[key]) {
      return this.activeProviders[key];
    }

    // Get the provider from registry
    const provider = this.registry.getProvider(type, id);
    if (!provider) {
      throw new Error(`Provider ${id} of type ${type} not found in registry`);
    }

    // Cache the provider instance
    this.activeProviders[key] = provider;

    return provider;
  }

  /**
   * Gets the configured database provider or a specified alternative
   *
   * @param {string} [id=null] - Optional database provider ID to override config
   * @return {Object} The database provider instance
   */
  getDatabaseProvider(id = null) {
    // Use configured provider ID if not specified
    const providerId = id || this.config.database.provider || "mongodb";
    return this.getProvider("database", providerId);
  }
  
  /**
   * Gets the configured storage provider or a specified alternative
   *
   * @param {string} [id=null] - Optional storage provider ID to override config
   * @return {Object} The storage provider instance
   */
  getStorageProvider(id = null) {
    // Use configured provider ID if not specified
    const providerId = id || this.config.storage.provider || "firebase";
    return this.getProvider("storage", providerId);
  }

  /**
   * Creates an item repository with the specified database provider
   *
   * @param {string} [databaseProviderId=null] - Optional database provider ID
   * @param {Object} [options={}] - Additional options for repository creation
   * @return {Object} Item repository instance
   */
  createItemRepository(databaseProviderId = null, options = {}) {
    const providerId = databaseProviderId ||
                      this.config.database.provider ||
                      "mongodb";
    const cacheKey = `item-${providerId}`;

    // If we have a cached repository, return it
    if (this.repositories[cacheKey]) {
      return this.repositories[cacheKey];
    }

    // Get the database provider
    const dbProvider = this.getDatabaseProvider(providerId);

    // Create repository based on provider
    const itemRepository = dbProvider.createItemRepository(options);

    // Cache the repository instance
    this.repositories[cacheKey] = itemRepository;

    return itemRepository;
  }

  /**
   * Creates a relationship repository with the specified database provider
   *
   * @param {string} [databaseProviderId=null] - Optional database provider ID
   * @param {Object} [options={}] - Additional options for repository creation
   * @return {Object} Relationship repository instance
   */
  createRelationshipRepository(databaseProviderId = null, options = {}) {
    const providerId = databaseProviderId ||
                      this.config.database.provider ||
                      "mongodb";
    const cacheKey = `relationship-${providerId}`;

    // If we have a cached repository, return it
    if (this.repositories[cacheKey]) {
      return this.repositories[cacheKey];
    }

    // Get the database provider
    const dbProvider = this.getDatabaseProvider(providerId);

    // Create repository
    const relationshipRepository = dbProvider.createRelationshipRepository(options);

    // Cache the repository instance
    this.repositories[cacheKey] = relationshipRepository;

    return relationshipRepository;
  }

  /**
   * Creates an asset repository with the specified database provider
   *
   * @param {string} [databaseProviderId=null] - Optional database provider ID
   * @param {Object} [options={}] - Additional options for repository creation
   * @return {Object} Asset repository instance
   */
  createAssetRepository(databaseProviderId = null, options = {}) {
    const providerId = databaseProviderId ||
                      this.config.database.provider ||
                      "mongodb";
    const cacheKey = `asset-${providerId}`;

    // If we have a cached repository, return it
    if (this.repositories[cacheKey]) {
      return this.repositories[cacheKey];
    }

    // Get the database provider
    const dbProvider = this.getDatabaseProvider(providerId);

    // Create repository
    const assetRepository = dbProvider.createAssetRepository(options);

    // Cache the repository instance
    this.repositories[cacheKey] = assetRepository;

    return assetRepository;
  }

  /**
   * Creates a sale repository with the specified database provider
   *
   * @param {string} [databaseProviderId=null] - Optional database provider ID
   * @param {Object} [options={}] - Additional options for repository creation
   * @return {Object} Sale repository instance
   */
  createSaleRepository(databaseProviderId = null, options = {}) {
    const providerId = databaseProviderId ||
                      this.config.database.provider ||
                      "mongodb";
    const cacheKey = `sale-${providerId}`;

    // If we have a cached repository, return it
    if (this.repositories[cacheKey]) {
      return this.repositories[cacheKey];
    }

    // Get the database provider
    const dbProvider = this.getDatabaseProvider(providerId);

    // Create repository
    const saleRepository = dbProvider.createSaleRepository(options);

    // Cache the repository instance
    this.repositories[cacheKey] = saleRepository;

    return saleRepository;
  }

  /**
   * Creates a purchase repository with the specified database provider
   *
   * @param {string} [databaseProviderId=null] - Optional database provider ID
   * @param {Object} [options={}] - Additional options for repository creation
   * @return {Object} Purchase repository instance
   */
  createPurchaseRepository(databaseProviderId = null, options = {}) {
    const providerId = databaseProviderId ||
                      this.config.database.provider ||
                      "mongodb";
    const cacheKey = `purchase-${providerId}`;

    // If we have a cached repository, return it
    if (this.repositories[cacheKey]) {
      return this.repositories[cacheKey];
    }

    // Get the database provider
    const dbProvider = this.getDatabaseProvider(providerId);

    // Create repository
    const purchaseRepository = dbProvider.createPurchaseRepository(options);

    // Cache the repository instance
    this.repositories[cacheKey] = purchaseRepository;

    return purchaseRepository;
  }

  /**
   * Creates a complete business layer with all repositories and their dependencies
   *
   * @param {string} [databaseProviderId=null] - Optional database provider ID
   * @param {Object} [options={}] - Additional options for repositories
   * @return {Object} Object containing all repository instances
   */
  createBusinessLayer(databaseProviderId = null, options = {}) {
    const providerId = databaseProviderId ||
                      this.config.database.provider ||
                      "mongodb";

    // Create repositories
    const itemRepository = this.createItemRepository(providerId, options);
    const relationshipRepository = this.createRelationshipRepository(
        providerId,
        options,
    );
    const assetRepository = this.createAssetRepository(providerId, options);
    const saleRepository = this.createSaleRepository(providerId, options);
    const purchaseRepository = this.createPurchaseRepository(providerId, options);

    // Inject dependencies between repositories
    itemRepository.setRelationshipRepository(relationshipRepository);

    if (saleRepository.setItemRepository) {
      saleRepository.setItemRepository(itemRepository);
    }

    if (saleRepository.setRelationshipRepository) {
      saleRepository.setRelationshipRepository(relationshipRepository);
    }

    if (purchaseRepository.setItemRepository) {
      purchaseRepository.setItemRepository(itemRepository);
    }

    if (purchaseRepository.setRelationshipRepository) {
      purchaseRepository.setRelationshipRepository(relationshipRepository);
    }

    // Return the complete business layer
    return {
      item: itemRepository,
      relationship: relationshipRepository,
      asset: assetRepository,
      sale: saleRepository,
      purchase: purchaseRepository,
    };
  }

  /**
   * Clears cached providers and repositories
   *
   * @return {void}
   */
  clearCache() {
    this.activeProviders = {};
    this.repositories = {};
  }

  /**
   * Gets the transaction provider from the database provider
   * 
   * @param {string} [databaseProviderId=null] - Optional database provider ID
   * @return {Object} Transaction provider instance
   */
  getTransactionProvider(databaseProviderId = null) {
    // Get the database provider
    const dbProvider = this.getDatabaseProvider(databaseProviderId);
    
    // Get transaction provider from database provider
    if (dbProvider && typeof dbProvider.getTransactionProvider === "function") {
      return dbProvider.getTransactionProvider();
    }
    
    // Return a no-op transaction provider if not available
    return {
      beginTransaction: async () => null,
      commitTransaction: async () => true,
      rollbackTransaction: async () => true,
      isTransactionActive: () => false,
    };
  }
}

// Export singleton instance
module.exports = new ProviderFactory();
