const FirestoreDBProvider = require("./provider");
const FirestoreItemRepository = require("./itemRepository");
const FirestoreSalesRepository = require("./salesRepository");
const FirestorePurchaseRepository = require("./purchaseRepository");
const FirestoreTransactionProvider = require("./transactionProvider");
const {initializeFirestore, checkFirestoreHealth, createIndexes} =
  require("./connection");

module.exports = {
  FirestoreDBProvider,
  FirestoreItemRepository,
  FirestoreSalesRepository,
  FirestorePurchaseRepository,
  FirestoreTransactionProvider,
  connection: {
    initializeFirestore,
    checkFirestoreHealth,
    createIndexes,
  },
};
