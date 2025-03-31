const {BaseDatabaseProvider} = require("../../base");
const FirestoreItemRepository = require("./itemRepository");
const FirestoreSalesRepository = require("./salesRepository");
const FirestorePurchaseRepository = require("./purchaseRepository");
const FirestoreTransactionProvider = require("./transactionProvider");
const {initializeFirestore, checkFirestoreHealth} = require("./connection");
const ProviderRegistry = require("../../registry");
const config = require("../../config");

/**
 * Firestore implementation of DatabaseProvider
 */
class FirestoreDBProvider extends BaseDatabaseProvider {
  /**
   * Creates an instance of FirestoreDBProvider.
   */
  constructor() {
    super(config);
    this.db = null;
    this.admin = null;
    this.isConnected = false;
    this.supportedRepositories = ["item", "sales", "purchase"];
    this.collectionPrefix = config.FIRESTORE_COLLECTION_PREFIX || "";
  }

  /**
   * Connect to Firestore
   * @return {Promise<void>}
   */
  async connect() {
    try {
      console.log("Connecting to Firestore...");
      const connection = await initializeFirestore();
      this.db = connection.db;
      this.admin = connection.admin;
      this.isConnected = true;
      console.log("✅ Firestore provider connected successfully");
    } catch (error) {
      this.isConnected = false;
      console.error("❌ Firestore provider connection failed:", error);
      throw error;
    }
  }

  /**
   * Disconnect from Firestore
   * @return {Promise<void>}
   */
  async disconnect() {
    try {
      if (this.admin) {
        await this.admin.app().delete();
        this.isConnected = false;
        console.log("✅ Firestore provider disconnected successfully");
      }
    } catch (error) {
      console.error("❌ Error disconnecting from Firestore:", error);
      throw error;
    }
  }

  /**
   * Check Firestore connection health
   * @return {Promise<Object>} Connection status object
   */
  async checkHealth() {
    return await checkFirestoreHealth(this.db);
  }

  /**
   * Create an item repository
   * @return {Object} Firestore item repository implementation
   */
  createItemRepository() {
    return new FirestoreItemRepository(this.db, this.collectionPrefix);
  }

  /**
   * Create a sales repository
   * @return {Object} Firestore sales repository implementation
   */
  createSalesRepository() {
    return new FirestoreSalesRepository(this.db, this.collectionPrefix);
  }

  /**
   * Create a purchase repository
   * @return {Object} Firestore purchase repository implementation
   */
  createPurchaseRepository() {
    return new FirestorePurchaseRepository(this.db, this.collectionPrefix);
  }

  /**
   * Create a transaction provider
   * @return {Object} Firestore transaction provider implementation
   */
  createTransactionProvider() {
    return new FirestoreTransactionProvider(this.db, this.collectionPrefix);
  }

  /**
   * Get provider name
   * @return {string} Provider name
   */
  getProviderName() {
    return "firestore";
  }
}

// Register the provider with the registry
ProviderRegistry.register("database", "firestore", new FirestoreDBProvider());

module.exports = FirestoreDBProvider;
