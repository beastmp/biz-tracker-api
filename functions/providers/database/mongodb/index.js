/**
 * MongoDB Provider Module
 * Exports MongoDB implementations using composition pattern
 *
 * @module mongodb-provider
 */

const MongoDBProvider = require("./provider");
const MongoDBItemRepository = require("./itemRepository");
const MongoDBSaleRepository = require("./saleRepository");
const MongoDBPurchaseRepository = require("./purchaseRepository");
const MongoDBAssetRepository = require("./assetRepository");
const MongoDBRelationshipRepository = require("./relationshipRepository");
const MongoTransactionProvider = require("./transactionProvider");
const {connectToMongo, checkConnectionHealth} = require("./connection");

// Note: Provider registration is now handled in provider.js

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
