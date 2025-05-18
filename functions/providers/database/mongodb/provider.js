const mongoose = require("mongoose");
const {connectToMongo, checkConnectionHealth} = require("./connection");
const MongoDBItemRepository = require("./itemRepository");
const MongoDBSaleRepository = require("./saleRepository");
const MongoDBPurchaseRepository = require("./purchaseRepository");
const MongoTransactionProvider = require("./transactionProvider");
const MongoDBAssetRepository = require("./assetRepository");
const MongoDBRelationshipRepository = require("./relationshipRepository");
const ProviderRegistry = require("../../registry");

/**
 * MongoDB implementation of DatabaseProvider using composition pattern
 *
 * @class MongoDBProvider
 */
class MongoDBProvider {
  /**
   * Creates a new instance of MongoDBProvider
   *
   * @param {Object} config - Configuration object
   */
  constructor(config = {}) {
    this.name = "mongodb";
    this.type = "database";
    this.isConnected = false;
    this.config = config;
    this.supportedRepositories = [
      "item",
      "sales",
      "purchase",
      "asset",
      "relationship",
    ];

    // Store repository instances for reuse
    this.repositories = {};
  }

  /**
   * Initialize provider with configuration and establish connection
   *
   * @param {Object} config - Configuration object
   * @param {string} [instanceId="main"] - Instance identifier for logging
   * @return {Promise<MongoDBProvider>} This provider instance for chaining
   */
  async initialize(config = {}, instanceId = "main") {
    try {
      // Merge config with existing
      if (config) {
        this.config = {...this.config, ...config};
      }

      // Explicitly establish MongoDB connection
      if (!this.isConnected) {
        await this.connect(instanceId);
      }

      return this;
    } catch (error) {
      console.error(`[${instanceId}] ❌ MongoDB provider initialization failed:`, error);
      throw error;
    }
  }

  /**
   * Connect to the MongoDB database
   * @param {string} [instanceId="main"] - Instance identifier for logging
   * @return {Promise<void>}
   */
  async connect(instanceId = "main") {
    try {
      await connectToMongo(instanceId);
      this.isConnected = true;
      console.log(`[${instanceId}] ✅ MongoDB provider connected successfully`);
    } catch (error) {
      this.isConnected = false;
      console.error(`[${instanceId}] ❌ MongoDB provider connection failed:`, error);
      throw error;
    }
  }

  /**
   * Disconnect from the MongoDB database
   * @param {string} [instanceId="main"] - Instance identifier for logging
   * @return {Promise<void>}
   */
  async disconnect(instanceId = "main") {
    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
        this.isConnected = false;
        console.log(`[${instanceId}] ✅ MongoDB provider disconnected successfully`);
      }
    } catch (error) {
      console.error(`[${instanceId}] ❌ MongoDB provider disconnect failed:`, error);
      throw error;
    }
  }

  /**
   * Check MongoDB connection health
   * @return {Promise<Object>} Connection status object
   */
  async checkHealth() {
    return checkConnectionHealth();
  }

  /**
   * Create an item repository
   * @return {MongoDBItemRepository} MongoDB item repository implementation
   */
  createItemRepository() {
    if (!this.repositories.item) {
      this.repositories.item = new MongoDBItemRepository(this.config);

      // Set dependencies if available
      if (this.repositories.relationship) {
        this.repositories.item.setRelationshipRepository(
            this.repositories.relationship,
        );
      }

      // Set transaction provider if needed
      const transactionProvider = this.createTransactionProvider();
      this.repositories.item.setTransactionProvider(transactionProvider);
    }
    return this.repositories.item;
  }

  /**
   * Create a sale repository
   *
   * @return {MongoDBSaleRepository} MongoDB sale repository implementation
   */
  createSaleRepository() {
    if (!this.repositories.sale) {
      this.repositories.sale = new MongoDBSaleRepository(
          {db: mongoose.connection},
          this.config
      );

      // Set item repository dependency if it exists
      if (this.repositories.item) {
        this.repositories.sale.setItemRepository(this.repositories.item);
      }

      // Set relationship repository dependency if it exists
      if (this.repositories.relationship) {
        this.repositories.sale.setRelationshipRepository(
            this.repositories.relationship
        );
      }

      // Set transaction provider
      const transactionProvider = this.createTransactionProvider();
      this.repositories.sale.setTransactionProvider(transactionProvider);
    }
    return this.repositories.sale;
  }

  /**
   * Create a purchase repository
   * @return {MongoDBPurchaseRepository} MongoDB purchase repository implementation
   */
  createPurchaseRepository() {
    if (!this.repositories.purchase) {
      this.repositories.purchase = new MongoDBPurchaseRepository(this.config);

      // Set item repository dependency if it exists
      if (this.repositories.item) {
        this.repositories.purchase.setItemRepository(this.repositories.item);
      }

      // Set relationship repository dependency if it exists
      if (this.repositories.relationship) {
        this.repositories.purchase.setRelationshipRepository(
            this.repositories.relationship,
        );
      }

      // Set asset repository dependency if it exists
      if (this.repositories.asset) {
        this.repositories.purchase.setAssetRepository(this.repositories.asset);
      }

      // Set transaction provider
      const transactionProvider = this.createTransactionProvider();
      this.repositories.purchase.setTransactionProvider(transactionProvider);
    }
    return this.repositories.purchase;
  }

  /**
   * Create a transaction provider
   * @return {MongoTransactionProvider} MongoDB transaction implementation
   */
  createTransactionProvider() {
    return new MongoTransactionProvider(this.config);
  }

  /**
   * Create an asset repository
   * @return {MongoDBAssetRepository} MongoDB asset repository implementation
   */
  createAssetRepository() {
    if (!this.repositories.asset) {
      this.repositories.asset = new MongoDBAssetRepository(this.config);

      // Set dependencies if available
      if (this.repositories.relationship) {
        this.repositories.asset.setRelationshipRepository(
            this.repositories.relationship,
        );
      }

      if (this.repositories.purchase) {
        this.repositories.asset.setPurchaseRepository(this.repositories.purchase);
      }

      // Set transaction provider if needed
      const transactionProvider = this.createTransactionProvider();
      this.repositories.asset.setTransactionProvider(transactionProvider);
    }
    return this.repositories.asset;
  }

  /**
   * Create a relationship repository
   * @return {MongoDBRelationshipRepository} MongoDB relationship repository implementation
   */
  createRelationshipRepository() {
    if (!this.repositories.relationship) {
      this.repositories.relationship = new MongoDBRelationshipRepository(this.config);

      // Set dependencies to other repositories
      const repositories = {
        item: this.createItemRepository(),
        purchase: this.createPurchaseRepository(),
        sale: this.createSaleRepository(),
        asset: this.createAssetRepository(),
      };

      this.repositories.relationship.setRepositories(
          repositories.item,
          repositories.purchase,
          repositories.sale,
          repositories.asset
      );
    }
    return this.repositories.relationship;
  }

  /**
   * Get the name of this provider implementation
   *
   * @return {string} Provider name/identifier
   */
  getProviderName() {
    return "mongodb";
  }

  /**
   * Static method to register this provider with the registry
   *
   * @static
   * @param {string} [instanceId="main"] - Instance identifier for logging
   * @return {MongoDBProvider} The registered provider instance
   */
  static register(instanceId = "main") {
    // Create a new instance
    const provider = new MongoDBProvider();

    // Register with the registry
    ProviderRegistry.register("database", "mongodb", provider, instanceId);

    return provider;
  }
}

// Self-register the provider with the registry on module load
// This can be disabled by setting an environment variable if needed for testing
if (process.env.DISABLE_AUTO_PROVIDER_REGISTRATION !== "true") {
  MongoDBProvider.register();
}

module.exports = MongoDBProvider;
