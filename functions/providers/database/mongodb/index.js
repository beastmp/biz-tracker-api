/**
 * MongoDB Provider Module
 * Exports MongoDB implementations using composition pattern
 */

const MongoDBProvider = require("./provider");
const MongoDBItemRepository = require("./itemRepository");
const MongoDBSaleRepository = require("./saleRepository");
const MongoDBPurchaseRepository = require("./purchaseRepository");
const MongoDBAssetRepository = require("./assetRepository");
const MongoDBRelationshipRepository = require("./relationshipRepository");
const MongoTransactionProvider = require("./transactionProvider");
const {connectToMongo, checkConnectionHealth} = require("./connection");

module.exports = {
  // Provider implementation
  MongoDBProvider,

  // Repository implementations
  MongoDBItemRepository,
  MongoDBSaleRepository,
  MongoDBPurchaseRepository,
  MongoDBAssetRepository,
  MongoDBRelationshipRepository,

  // Transaction provider
  MongoTransactionProvider,

  // Connection utilities
  connectToMongo,
  checkConnectionHealth,
};
