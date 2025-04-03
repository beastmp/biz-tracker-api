const {BaseDatabaseProvider} = require("../../base");
const DynamoItemRepository = require("./itemRepository");
const DynamoSalesRepository = require("./salesRepository");
const DynamoPurchaseRepository = require("./purchaseRepository");
const DynamoTransactionProvider = require("./transactionProvider");
const {connectToDynamo, checkDynamoHealth, initializeTables} =
  require("./connection");
const ProviderRegistry = require("../../registry");
const config = require("../../config");

/**
 * DynamoDB implementation of DatabaseProvider
 */
class DynamoDBProvider extends BaseDatabaseProvider {
  /**
   * Creates a new instance of DynamoDBProvider
   * @constructor
   */
  constructor() {
    super(config);
    this.client = null;
    this.documentClient = null;
    this.isConnected = false;
    this.supportedRepositories = ["item", "sales", "purchase"];
    this.tablePrefix = config.DYNAMODB_TABLE_PREFIX || "biztracker_";
  }

  /**
   * Connect to DynamoDB
   * @return {Promise<void>}
   */
  async connect() {
    try {
      console.log("Connecting to DynamoDB...");
      const connection = await connectToDynamo();
      this.client = connection.client;
      this.documentClient = connection.documentClient;

      // Initialize tables
      await initializeTables(this.client, this.tablePrefix);

      this.isConnected = true;
      console.log("✅ DynamoDB provider connected successfully");
    } catch (error) {
      this.isConnected = false;
      console.error("❌ DynamoDB provider connection failed:", error);
      throw error;
    }
  }

  /**
   * Disconnect from DynamoDB
   * @return {Promise<void>}
   */
  async disconnect() {
    // DynamoDB doesn't need explicit disconnection
    this.isConnected = false;
    console.log("✅ DynamoDB provider disconnected successfully");
  }

  /**
   * Check DynamoDB connection health
   * @return {Promise<Object>} Connection status object
   */
  async checkHealth() {
    return await checkDynamoHealth(this.client);
  }

  /**
   * Create an item repository
   * @return {Object} DynamoDB item repository implementation
   */
  createItemRepository() {
    return new DynamoItemRepository(this.documentClient, this.tablePrefix);
  }

  /**
   * Create a sales repository
   * @return {Object} DynamoDB sales repository implementation
   */
  createSalesRepository() {
    return new DynamoSalesRepository(this.documentClient, this.tablePrefix);
  }

  /**
   * Create a purchase repository
   * @return {Object} DynamoDB purchase repository implementation
   */
  createPurchaseRepository() {
    return new DynamoPurchaseRepository(this.documentClient, this.tablePrefix);
  }

  /**
   * Create a transaction provider
   * @return {Object} DynamoDB transaction provider implementation
   */
  createTransactionProvider() {
    return new DynamoTransactionProvider(this.documentClient, this.tablePrefix);
  }

  /**
   * Get provider name
   * @return {string} Provider name
   */
  getProviderName() {
    return "dynamodb";
  }
}

// Register the provider with the registry
ProviderRegistry.register("database", "dynamodb", new DynamoDBProvider());

module.exports = DynamoDBProvider;
