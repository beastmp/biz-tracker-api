/**
 * Provider Interfaces Module
 * Exports all provider interfaces for abstraction and dependency inversion
 */

const DatabaseProvider = require("./databaseProvider");
const ItemInterface = require("./itemInterface");
const SaleInterface = require("./saleInterface");
const PurchaseInterface = require("./purchaseInterface");
const AssetInterface = require("./assetInterface");
const RelationshipInterface = require("./relationshipInterface");
const TransactionProvider = require("./transactionProvider");
const StorageProvider = require("./storageProvider");

module.exports = {
  // Database interfaces
  DatabaseProvider,
  ItemInterface,
  SaleInterface,
  PurchaseInterface,
  AssetInterface,
  RelationshipInterface,
  TransactionProvider,

  // Storage interfaces
  StorageProvider,
};
