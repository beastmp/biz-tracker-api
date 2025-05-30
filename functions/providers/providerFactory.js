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
   * Creates a base item repository with the specified database provider
   *
   * @param {string} [databaseProviderId=null] - Optional database provider ID
   * @param {Object} [options={}] - Additional options for repository creation
   * @return {Object} BaseItem repository instance
   */
  createBaseItemRepository(databaseProviderId = null, options = {}) {
    const providerId = databaseProviderId ||
                      this.config.database.provider ||
                      "mongodb";
    const cacheKey = `baseItem-${providerId}`;

    // If we have a cached repository, return it
    if (this.repositories[cacheKey]) {
      return this.repositories[cacheKey];
    }

    // Get the database provider
    const dbProvider = this.getDatabaseProvider(providerId);

    // Create repository based on provider
    const baseItemRepository = dbProvider.createBaseItemRepository 
      ? dbProvider.createBaseItemRepository(options)
      : dbProvider.createItemRepository(options); // Fallback for backward compatibility

    // Cache the repository instance
    this.repositories[cacheKey] = baseItemRepository;

    return baseItemRepository;
  }

  /**
   * Creates a base transaction repository with the specified database provider
   *
   * @param {string} [databaseProviderId=null] - Optional database provider ID
   * @param {Object} [options={}] - Additional options for repository creation
   * @return {Object} BaseTransaction repository instance
   */
  createBaseTransactionRepository(databaseProviderId = null, options = {}) {
    const providerId = databaseProviderId ||
                      this.config.database.provider ||
                      "mongodb";
    const cacheKey = `baseTransaction-${providerId}`;

    // If we have a cached repository, return it
    if (this.repositories[cacheKey]) {
      return this.repositories[cacheKey];
    }

    // Get the database provider
    const dbProvider = this.getDatabaseProvider(providerId);

    // Create repository based on provider
    let baseTransactionRepository;
    
    if (dbProvider.createBaseTransactionRepository) {
      baseTransactionRepository = dbProvider.createBaseTransactionRepository(options);
    } else {
      // Fallback for backward compatibility - use a general repository
      console.warn("Database provider does not have createBaseTransactionRepository method. Using fallback implementation.");
      
      // Import the base repository and create an instance
      const BaseTransactionRepository = require("./repositories/baseTransactionRepository");
      baseTransactionRepository = new BaseTransactionRepository();
      
      // Set the provider to ensure it can perform database operations
      baseTransactionRepository.setTransactionProvider(dbProvider);
    }

    // Cache the repository instance
    this.repositories[cacheKey] = baseTransactionRepository;

    return baseTransactionRepository;
  }

  /**
   * Creates a purchase transaction repository with the specified database provider
   *
   * @param {string} [databaseProviderId=null] - Optional database provider ID
   * @param {Object} [options={}] - Additional options for repository creation
   * @return {Object} PurchaseTransaction repository instance
   */
  createPurchaseTransactionRepository(databaseProviderId = null, options = {}) {
    const providerId = databaseProviderId ||
                      this.config.database.provider ||
                      "mongodb";
    const cacheKey = `purchaseTransaction-${providerId}`;

    // If we have a cached repository, return it
    if (this.repositories[cacheKey]) {
      return this.repositories[cacheKey];
    }

    // Get the database provider
    const dbProvider = this.getDatabaseProvider(providerId);

    // Create repository based on provider
    let purchaseTransactionRepository;
    
    if (dbProvider.createPurchaseTransactionRepository) {
      purchaseTransactionRepository = dbProvider.createPurchaseTransactionRepository(options);
    } else {
      // Fallback for backward compatibility - use a base transaction repository with type filter
      console.warn("Database provider does not have createPurchaseTransactionRepository method. Using BaseTransactionRepository with purchase type filter.");
      
      // Get or create base transaction repository
      const baseTransactionRepository = this.createBaseTransactionRepository(providerId, options);
      
      // Create a type-filtered repository that delegates to the base repository
      purchaseTransactionRepository = {
        // Default type for new transactions
        defaultType: "purchase",
        
        // Create with purchase type added
        create: async (data, transaction) => {
          return baseTransactionRepository.create({
            ...data,
            type: data.type || this.defaultType
          }, transaction);
        },
        
        // Find by ID without filter (single entity)
        findById: async (id) => baseTransactionRepository.findById(id),
        
        // Add purchase type filter to all filter operations
        findAll: async (filter = {}, options = {}) => {
          return baseTransactionRepository.findAll({
            ...filter,
            type: filter.type || this.defaultType
          }, options);
        },
        
        // Delegate other methods to base repository
        update: async (id, data, transaction) => baseTransactionRepository.update(id, data, transaction),
        delete: async (id, transaction) => baseTransactionRepository.delete(id, transaction),
        search: async (text, options) => baseTransactionRepository.search(text, { 
          ...options,
          filter: { ...options?.filter, type: this.defaultType }
        }),
        count: async (filter = {}) => baseTransactionRepository.count({
          ...filter,
          type: filter.type || this.defaultType
        }),
        exists: async (filter = {}) => baseTransactionRepository.exists({
          ...filter,
          type: filter.type || this.defaultType
        }),
        findOne: async (filter = {}) => baseTransactionRepository.findOne({
          ...filter,
          type: filter.type || this.defaultType
        }),
        findByQuery: async (query, options) => baseTransactionRepository.findByQuery(query, options),
        bulkCreate: async (items, transaction) => {
          items = items.map(item => ({ ...item, type: item.type || this.defaultType }));
          return baseTransactionRepository.bulkCreate(items, transaction);
        },
        bulkUpdate: async (filter, update, transaction) => baseTransactionRepository.bulkUpdate({
          ...filter,
          type: filter.type || this.defaultType
        }, update, transaction),
        bulkDelete: async (filter, transaction) => baseTransactionRepository.bulkDelete({
          ...filter,
          type: filter.type || this.defaultType
        }, transaction),
        findByPattern: async (pattern, options) => baseTransactionRepository.findByPattern(pattern, options),
        findWithRelations: async (filter = {}, relations, options) => baseTransactionRepository.findWithRelations({
          ...filter,
          type: filter.type || this.defaultType
        }, relations, options),
        
        // Set provider dependency
        setTransactionProvider: (provider) => {
          if (baseTransactionRepository.setTransactionProvider) {
            baseTransactionRepository.setTransactionProvider(provider);
          }
        }
      };
    }

    // Cache the repository instance
    this.repositories[cacheKey] = purchaseTransactionRepository;

    return purchaseTransactionRepository;
  }

  /**
   * Creates a sale transaction repository with the specified database provider
   *
   * @param {string} [databaseProviderId=null] - Optional database provider ID
   * @param {Object} [options={}] - Additional options for repository creation
   * @return {Object} SaleTransaction repository instance
   */
  createSaleTransactionRepository(databaseProviderId = null, options = {}) {
    const providerId = databaseProviderId ||
                      this.config.database.provider ||
                      "mongodb";
    const cacheKey = `saleTransaction-${providerId}`;

    // If we have a cached repository, return it
    if (this.repositories[cacheKey]) {
      return this.repositories[cacheKey];
    }

    // Get the database provider
    const dbProvider = this.getDatabaseProvider(providerId);

    // Create repository based on provider
    let saleTransactionRepository;
    
    if (dbProvider.createSaleTransactionRepository) {
      saleTransactionRepository = dbProvider.createSaleTransactionRepository(options);
    } else {
      // Fallback for backward compatibility - use a base transaction repository with type filter
      console.warn("Database provider does not have createSaleTransactionRepository method. Using BaseTransactionRepository with sale type filter.");
      
      // Get or create base transaction repository
      const baseTransactionRepository = this.createBaseTransactionRepository(providerId, options);
      
      // Create a type-filtered repository that delegates to the base repository
      saleTransactionRepository = {
        // Default type for new transactions
        defaultType: "sale",
        
        // Create with sale type added
        create: async (data, transaction) => {
          return baseTransactionRepository.create({
            ...data,
            type: data.type || this.defaultType
          }, transaction);
        },
        
        // Find by ID without filter (single entity)
        findById: async (id) => baseTransactionRepository.findById(id),
        
        // Add sale type filter to all filter operations
        findAll: async (filter = {}, options = {}) => {
          return baseTransactionRepository.findAll({
            ...filter,
            type: filter.type || this.defaultType
          }, options);
        },
        
        // Delegate other methods to base repository
        update: async (id, data, transaction) => baseTransactionRepository.update(id, data, transaction),
        delete: async (id, transaction) => baseTransactionRepository.delete(id, transaction),
        search: async (text, options) => baseTransactionRepository.search(text, { 
          ...options,
          filter: { ...options?.filter, type: this.defaultType }
        }),
        count: async (filter = {}) => baseTransactionRepository.count({
          ...filter,
          type: filter.type || this.defaultType
        }),
        exists: async (filter = {}) => baseTransactionRepository.exists({
          ...filter,
          type: filter.type || this.defaultType
        }),
        findOne: async (filter = {}) => baseTransactionRepository.findOne({
          ...filter,
          type: filter.type || this.defaultType
        }),
        findByQuery: async (query, options) => baseTransactionRepository.findByQuery(query, options),
        bulkCreate: async (items, transaction) => {
          items = items.map(item => ({ ...item, type: item.type || this.defaultType }));
          return baseTransactionRepository.bulkCreate(items, transaction);
        },
        bulkUpdate: async (filter, update, transaction) => baseTransactionRepository.bulkUpdate({
          ...filter,
          type: filter.type || this.defaultType
        }, update, transaction),
        bulkDelete: async (filter, transaction) => baseTransactionRepository.bulkDelete({
          ...filter,
          type: filter.type || this.defaultType
        }, transaction),
        findByPattern: async (pattern, options) => baseTransactionRepository.findByPattern(pattern, options),
        findWithRelations: async (filter = {}, relations, options) => baseTransactionRepository.findWithRelations({
          ...filter,
          type: filter.type || this.defaultType
        }, relations, options),
        
        // Set provider dependency
        setTransactionProvider: (provider) => {
          if (baseTransactionRepository.setTransactionProvider) {
            baseTransactionRepository.setTransactionProvider(provider);
          }
        }
      };
    }

    // Cache the repository instance
    this.repositories[cacheKey] = saleTransactionRepository;

    return saleTransactionRepository;
  }

  /**
   * Creates an asset item repository with the specified database provider
   *
   * @param {string} [databaseProviderId=null] - Optional database provider ID
   * @param {Object} [options={}] - Additional options for repository creation
   * @return {Object} AssetItem repository instance
   */
  createAssetItemRepository(databaseProviderId = null, options = {}) {
    const providerId = databaseProviderId ||
                      this.config.database.provider ||
                      "mongodb";
    const cacheKey = `assetItem-${providerId}`;

    // If we have a cached repository, return it
    if (this.repositories[cacheKey]) {
      return this.repositories[cacheKey];
    }

    // Get the database provider
    const dbProvider = this.getDatabaseProvider(providerId);

    // Create repository based on provider
    let assetItemRepository;
    
    if (dbProvider.createAssetItemRepository) {
      assetItemRepository = dbProvider.createAssetItemRepository(options);
    } else {
      // Fallback for backward compatibility - use a base item repository with type filter
      console.warn("Database provider does not have createAssetItemRepository method. Using BaseItemRepository with asset type filter.");
      
      // Get or create base item repository
      const baseItemRepository = this.createBaseItemRepository(providerId, options);
      
      // Create a type-filtered repository that delegates to the base repository
      assetItemRepository = {
        // Default type for new items
        defaultType: "asset",
        
        // Create with asset type added
        create: async (data, transaction) => {
          return baseItemRepository.create({
            ...data,
            type: data.type || this.defaultType
          }, transaction);
        },
        
        // Find by ID without filter (single entity)
        findById: async (id) => baseItemRepository.findById(id),
        
        // Add asset type filter to all filter operations
        findAll: async (filter = {}, options = {}) => {
          return baseItemRepository.findAll({
            ...filter,
            type: filter.type || this.defaultType
          }, options);
        },
        
        // Delegate other methods to base repository with type filters
        update: async (id, data, transaction) => baseItemRepository.update(id, data, transaction),
        delete: async (id, transaction) => baseItemRepository.delete(id, transaction),
        search: async (text, options) => baseItemRepository.search(text, { 
          ...options,
          filter: { ...options?.filter, type: this.defaultType }
        }),
        count: async (filter = {}) => baseItemRepository.count({
          ...filter,
          type: filter.type || this.defaultType
        }),
        exists: async (filter = {}) => baseItemRepository.exists({
          ...filter,
          type: filter.type || this.defaultType
        }),
        findOne: async (filter = {}) => baseItemRepository.findOne({
          ...filter,
          type: filter.type || this.defaultType
        }),
        findByQuery: async (query, options) => baseItemRepository.findByQuery(query, options),
        bulkCreate: async (items, transaction) => {
          items = items.map(item => ({ ...item, type: item.type || this.defaultType }));
          return baseItemRepository.bulkCreate(items, transaction);
        },
        bulkUpdate: async (filter, update, transaction) => baseItemRepository.bulkUpdate({
          ...filter,
          type: filter.type || this.defaultType
        }, update, transaction),
        bulkDelete: async (filter, transaction) => baseItemRepository.bulkDelete({
          ...filter,
          type: filter.type || this.defaultType
        }, transaction)
      };
    }

    // Cache the repository instance
    this.repositories[cacheKey] = assetItemRepository;

    return assetItemRepository;
  }

  /**
   * Creates an updated business layer with all repositories including the new model types
   *
   * @param {string} [databaseProviderId=null] - Optional database provider ID
   * @param {Object} [options={}] - Additional options for repositories
   * @return {Object} Object containing all repository instances
   */
  createExtendedBusinessLayer(databaseProviderId = null, options = {}) {
    const providerId = databaseProviderId ||
                      this.config.database.provider ||
                      "mongodb";

    // Create existing repositories
    const businessLayer = this.createBusinessLayer(providerId, options);
    
    // Create new model repositories
    const baseItemRepository = this.createBaseItemRepository(providerId, options);
    const baseTransactionRepository = this.createBaseTransactionRepository(providerId, options);
    const purchaseTransactionRepository = this.createPurchaseTransactionRepository(providerId, options);
    const saleTransactionRepository = this.createSaleTransactionRepository(providerId, options);
    const assetItemRepository = this.createAssetItemRepository(providerId, options);

    // Inject dependencies between repositories if they support it
    if (baseItemRepository.setTransactionProvider) {
      baseItemRepository.setTransactionProvider(this.getTransactionProvider(providerId));
    }
    
    if (baseTransactionRepository.setTransactionProvider) {
      baseTransactionRepository.setTransactionProvider(this.getTransactionProvider(providerId));
    }
    
    if (purchaseTransactionRepository.setTransactionProvider) {
      purchaseTransactionRepository.setTransactionProvider(this.getTransactionProvider(providerId));
    }
    
    if (saleTransactionRepository.setTransactionProvider) {
      saleTransactionRepository.setTransactionProvider(this.getTransactionProvider(providerId));
    }

    // Return the complete extended business layer
    return {
      ...businessLayer,
      baseItem: baseItemRepository,
      assetItem: assetItemRepository,
      baseTransaction: baseTransactionRepository,
      purchaseTransaction: purchaseTransactionRepository,
      saleTransaction: saleTransactionRepository,
    };
  }
}

/**
 * Clears cached providers and repositories
 *
 * @return {void}
 */
ProviderFactory.prototype.clearCache = function() {
  this.activeProviders = {};
  this.repositories = {};
};

/**
 * Gets the transaction provider from the database provider
 * 
 * @param {string} [databaseProviderId=null] - Optional database provider ID
 * @return {Object} Transaction provider instance
 */
ProviderFactory.prototype.getTransactionProvider = function(databaseProviderId = null) {
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
};

// Export singleton instance
module.exports = new ProviderFactory();
