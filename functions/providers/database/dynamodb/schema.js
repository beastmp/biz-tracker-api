const {CreateTableCommand, DescribeTableCommand} =
  require("@aws-sdk/client-dynamodb");

/**
 * Create the Items table in DynamoDB
 * @param {DynamoDBClient} client - DynamoDB client
 * @param {string} tableName - Name of the table to create
 * @return {Promise<Object>} Creation result
 */
const createItemTable = async (client, tableName) => {
  const params = {
    TableName: tableName,
    KeySchema: [
      {AttributeName: "id", KeyType: "HASH"}, // Partition key
    ],
    AttributeDefinitions: [
      {AttributeName: "id", AttributeType: "S"},
      {AttributeName: "sku", AttributeType: "S"},
      {AttributeName: "category", AttributeType: "S"},
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "SkuIndex",
        KeySchema: [
          {AttributeName: "sku", KeyType: "HASH"},
        ],
        Projection: {ProjectionType: "ALL"},
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5,
        },
      },
      {
        IndexName: "CategoryIndex",
        KeySchema: [
          {AttributeName: "category", KeyType: "HASH"},
        ],
        Projection: {ProjectionType: "ALL"},
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5,
        },
      },
    ],
    BillingMode: "PROVISIONED",
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5,
    },
  };

  try {
    const command = new CreateTableCommand(params);
    const result = await client.send(command);
    console.log(`✅ Created table ${tableName}`);

    // Wait for table to become active
    let tableStatus = result.TableDescription.TableStatus;
    while (tableStatus !== "ACTIVE") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const describeCommand = new DescribeTableCommand({TableName: tableName});
      const tableDescription = await client.send(describeCommand);
      tableStatus = tableDescription.Table.TableStatus;
    }

    return result;
  } catch (error) {
    console.error(`Error creating table ${tableName}:`, error);
    throw error;
  }
};

/**
 * Create the Sales table in DynamoDB
 * @param {DynamoDBClient} client - DynamoDB client
 * @param {string} tableName - Name of the table to create
 * @return {Promise<Object>} Creation result
 */
const createSalesTable = async (client, tableName) => {
  const params = {
    TableName: tableName,
    KeySchema: [
      {AttributeName: "id", KeyType: "HASH"}, // Partition key
    ],
    AttributeDefinitions: [
      {AttributeName: "id", AttributeType: "S"},
      {AttributeName: "createdAt", AttributeType: "S"},
      {AttributeName: "customerEmail", AttributeType: "S"},
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "CreatedAtIndex",
        KeySchema: [
          {AttributeName: "createdAt", KeyType: "HASH"},
        ],
        Projection: {ProjectionType: "ALL"},
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5,
        },
      },
      {
        IndexName: "CustomerEmailIndex",
        KeySchema: [
          {AttributeName: "customerEmail", KeyType: "HASH"},
        ],
        Projection: {ProjectionType: "ALL"},
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5,
        },
      },
    ],
    BillingMode: "PROVISIONED",
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5,
    },
  };

  try {
    const command = new CreateTableCommand(params);
    const result = await client.send(command);
    console.log(`✅ Created table ${tableName}`);

    // Wait for table to become active
    let tableStatus = result.TableDescription.TableStatus;
    while (tableStatus !== "ACTIVE") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const describeCommand = new DescribeTableCommand({TableName: tableName});
      const tableDescription = await client.send(describeCommand);
      tableStatus = tableDescription.Table.TableStatus;
    }

    return result;
  } catch (error) {
    console.error(`Error creating table ${tableName}:`, error);
    throw error;
  }
};

/**
 * Create the Purchases table in DynamoDB
 * @param {DynamoDBClient} client - DynamoDB client
 * @param {string} tableName - Name of the table to create
 * @return {Promise<Object>} Creation result
 */
const createPurchasesTable = async (client, tableName) => {
  const params = {
    TableName: tableName,
    KeySchema: [
      {AttributeName: "id", KeyType: "HASH"}, // Partition key
    ],
    AttributeDefinitions: [
      {AttributeName: "id", AttributeType: "S"},
      {AttributeName: "purchaseDate", AttributeType: "S"},
      {AttributeName: "supplierName", AttributeType: "S"},
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "PurchaseDateIndex",
        KeySchema: [
          {AttributeName: "purchaseDate", KeyType: "HASH"},
        ],
        Projection: {ProjectionType: "ALL"},
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5,
        },
      },
      {
        IndexName: "SupplierNameIndex",
        KeySchema: [
          {AttributeName: "supplierName", KeyType: "HASH"},
        ],
        Projection: {ProjectionType: "ALL"},
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5,
        },
      },
    ],
    BillingMode: "PROVISIONED",
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5,
    },
  };

  try {
    const command = new CreateTableCommand(params);
    const result = await client.send(command);
    console.log(`✅ Created table ${tableName}`);

    // Wait for table to become active
    let tableStatus = result.TableDescription.TableStatus;
    while (tableStatus !== "ACTIVE") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const describeCommand = new DescribeTableCommand({TableName: tableName});
      const tableDescription = await client.send(describeCommand);
      tableStatus = tableDescription.Table.TableStatus;
    }

    return result;
  } catch (error) {
    console.error(`Error creating table ${tableName}:`, error);
    throw error;
  }
};

module.exports = {
  createItemTable,
  createSalesTable,
  createPurchasesTable,
};
