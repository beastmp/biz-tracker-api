const {DynamoDBClient} = require("@aws-sdk/client-dynamodb");
const {DynamoDBDocumentClient, ListTablesCommand, DescribeTableCommand} =
    require("@aws-sdk/lib-dynamodb");
const {createItemTable, createSalesTable, createPurchasesTable} =
    require("./schema");
const config = require("../../config");

let dynamoClient = null;
let documentClient = null;
let isConnected = false;
let connectionAttempts = 0;
const MAX_RETRIES = 5;
const RETRY_INTERVAL = 5000; // 5 seconds

/**
 * Connect to DynamoDB with retry logic
 * @return {Promise<Object>} DynamoDB client objects
 */
const connectToDynamo = async () => {
  // If already connected, return the existing clients
  if (isConnected && dynamoClient) {
    console.log("✅ Using existing DynamoDB connection");
    return {client: dynamoClient, documentClient};
  }

  try {
    console.log("🔄 Connecting to DynamoDB...");

    // Create a DynamoDB client
    const credentials = {
      region: config.AWS_REGION || "us-east-1",
      credentials: {
        accessKeyId: config.AWS_ACCESS_KEY_ID,
        secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
      },
    };

    // Check for local development mode
    if (config.DYNAMODB_LOCAL === "true") {
      credentials.endpoint = config.DYNAMODB_ENDPOINT || "http://localhost:8000";
    }

    dynamoClient = new DynamoDBClient(credentials);

    // Create a document client for easier DynamoDB interactions
    documentClient = DynamoDBDocumentClient.from(dynamoClient, {
      marshallOptions: {
        convertEmptyValues: true,
        removeUndefinedValues: true,
        convertClassInstanceToMap: true,
      },
    });

    // Verify connection with a simple operation
    await dynamoClient.send(new ListTablesCommand({}));

    isConnected = true;
    connectionAttempts = 0;
    console.log("✅ DynamoDB connected successfully");

    return {client: dynamoClient, documentClient};
  } catch (error) {
    connectionAttempts++;
    console.error(`❌ DynamoDB connection attempt ${connectionAttempts}
        failed:`, error.message);

    if (connectionAttempts < MAX_RETRIES) {
      console.log(`⏱️ Retrying in ${RETRY_INTERVAL/1000} seconds...`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_INTERVAL));
      return connectToDynamo(); // Recursive retry
    } else {
      console.error(`❌ Failed to connect to DynamoDB after ${MAX_RETRIES}
        attempts`);
      throw error;
    }
  }
};

/**
 * Check DynamoDB connection health
 * @param {DynamoDBClient} client - DynamoDB client
 * @return {Promise<Object>} Health status
 */
const checkDynamoHealth = async (client) => {
  try {
    // Try a simple operation to verify connection
    await client.send(new ListTablesCommand({}));

    return {
      status: "connected",
      isConnected: true,
      provider: "dynamodb",
      region: config.AWS_REGION || "us-east-1",
    };
  } catch (error) {
    console.error("DynamoDB health check failed:", error);
    return {
      status: "disconnected",
      isConnected: false,
      error: error.message,
      provider: "dynamodb",
    };
  }
};

/**
 * Check if a table exists
 * @param {DynamoDBClient} client - DynamoDB client
 * @param {string} tableName - Table name to check
 * @return {Promise<boolean>} True if table exists
 */
const tableExists = async (client, tableName) => {
  try {
    await client.send(new DescribeTableCommand({TableName: tableName}));
    return true;
  } catch (error) {
    if (error.name === "ResourceNotFoundException") {
      return false;
    }
    throw error;
  }
};

/**
 * Initialize required DynamoDB tables
 * @param {DynamoDBClient} client - DynamoDB client
 * @param {string} tablePrefix - Prefix for table names
 * @return {Promise<void>}
 */
const initializeTables = async (client, tablePrefix = "biztracker_") => {
  console.log("Initializing DynamoDB tables...");

  // Define table names with prefix
  const tables = {
    items: `${tablePrefix}items`,
    sales: `${tablePrefix}sales`,
    purchases: `${tablePrefix}purchases`,
  };

  // Check and create each table if it doesn't exist
  const itemsExists = await tableExists(client, tables.items);
  if (!itemsExists) {
    console.log(`Creating ${tables.items} table...`);
    await createItemTable(client, tables.items);
  }

  const salesExists = await tableExists(client, tables.sales);
  if (!salesExists) {
    console.log(`Creating ${tables.sales} table...`);
    await createSalesTable(client, tables.sales);
  }

  const purchasesExists = await tableExists(client, tables.purchases);
  if (!purchasesExists) {
    console.log(`Creating ${tables.purchases} table...`);
    await createPurchasesTable(client, tables.purchases);
  }

  console.log("✅ All DynamoDB tables initialized");
};

module.exports = {
  connectToDynamo,
  checkDynamoHealth,
  initializeTables,
};
