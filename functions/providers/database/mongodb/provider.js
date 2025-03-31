const {BaseDatabaseProvider} = require("../../base");
const {connectToMongo, checkConnectionHealth} = require("./connection");
const MongoItemRepository = require("./itemRepository");
const MongoSalesRepository = require("./salesRepository");
const MongoPurchaseRepository = require("./purchaseRepository");
const MongoTransactionProvider = require("./transactionProvider");
const ProviderRegistry = require("../../registry");

/**
 * MongoDB implementation of DatabaseProvider
 */
class MongoDBProvider extends BaseDatabaseProvider {
  /**
   * Creates a new instance of MongoDBProvider
   */
  constructor() {
    super({}); // Pass empty config object for now
    this.name = "mongodb";
    this.type = "database";
    this.supportedRepositories = ["item", "sales", "purchase"];
  }

  /**
   * Connect to the MongoDB database
   * @return {Promise<void>}
   */
  async connect() {
    try {
      await connectToMongo();
      this.isConnected = true;
      console.log("✅ MongoDB provider connected successfully");
    } catch (error) {
      this.isConnected = false;
      console.error("❌ MongoDB provider connection failed:", error);
      throw error;
    }
  }

  /**
   * Disconnect from the MongoDB database
   * @return {Promise<void>}
   */
  async disconnect() {
    try {
      const mongoose = require("mongoose");
      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
        this.isConnected = false;
        console.log("✅ MongoDB provider disconnected successfully");
      }
    } catch (error) {
      console.error("❌ MongoDB provider disconnect failed:", error);
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
   * @return {MongoItemRepository} MongoDB item repository implementation
   */
  createItemRepository() {
    return new MongoItemRepository();
  }

  /**
   * Create a sales repository
   * @return {MongoSalesRepository} MongoDB sales repository implementation
   */
  createSalesRepository() {
    return new MongoSalesRepository();
  }

  /**
   * Create a purchase repository
   * @return {MongoPurchaseRepository} MongoDB purchase repo implementation
   */
  createPurchaseRepository() {
    return new MongoPurchaseRepository();
  }

  /**
   * Create a transaction provider
   * @return {MongoTransactionProvider} MongoDB transaction implementation
   */
  createTransactionProvider() {
    return new MongoTransactionProvider();
  }

  /**
   * Get the name of this provider implementation
   * @return {string} Provider name/identifier
   */
  getProviderName() {
    return "mongodb";
  }
}

// Register the provider with the registry
ProviderRegistry.register("database", "mongodb", new MongoDBProvider());

module.exports = MongoDBProvider;
