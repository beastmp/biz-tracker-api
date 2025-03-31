const DynamoDBProvider = require("./provider");
const DynamoItemRepository = require("./itemRepository");
const DynamoSalesRepository = require("./salesRepository");
const DynamoPurchaseRepository = require("./purchaseRepository");
const DynamoTransactionProvider = require("./transactionProvider");
const {connectToDynamo, checkDynamoHealth, initializeTables} =
  require("./connection");
const {createItemTable, createSalesTable, createPurchasesTable} =
  require("./schema");

module.exports = {
  DynamoDBProvider,
  DynamoItemRepository,
  DynamoSalesRepository,
  DynamoPurchaseRepository,
  DynamoTransactionProvider,
  connection: {
    connectToDynamo,
    checkDynamoHealth,
    initializeTables,
  },
  schema: {
    createItemTable,
    createSalesTable,
    createPurchasesTable,
  },
};
