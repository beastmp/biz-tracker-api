const {BaseTransactionProvider} = require("../../base");
const {v4: uuidv4} = require("uuid");

/**
 * Firestore implementation of TransactionProvider
 */
class FirestoreTransactionProvider extends BaseTransactionProvider {
  /**
   * Create a new FirestoreTransactionProvider
   * @param {Object} db - Firestore database instance
   * @param {string} collectionPrefix - Prefix for collection names
   */
  constructor(db, collectionPrefix) {
    super();
    this.db = db;
    this.collectionPrefix = collectionPrefix;
  }

  /**
   * Start a new transaction
   * @return {Promise<Object>} Transaction object
   */
  async startTransaction() {
    const transactionId = uuidv4();
    // In Firestore, the transaction is created when runTransaction is called
    // Here we just prepare an object to track our transaction
    return {
      id: transactionId,
      operations: [],
      status: "pending",
    };
  }

  /**
   * Add a write operation to the transaction
   * Note: This isn't used by Firestore directly
   * as operations are performed within runTransaction
   * @param {Object} transaction - Transaction object
   * @param {string} collectionName - Collection name without prefix
   * @param {string} operation - Operation type ('Put', 'Update', 'Delete')
   * @param {Object} item - Item to write
   */
  addWriteOperation(transaction, collectionName, operation, item) {
    if (!transaction || transaction.status !== "pending") {
      throw new Error(`Invalid transaction
        or transaction already committed/aborted`);
    }

    transaction.operations.push({
      collection: `${this.collectionPrefix}${collectionName}`,
      operation,
      item,
    });
  }

  /**
   * Commit a transaction - not used directly in Firestore
   * @param {Object} transaction Transaction object
   * @return {Promise<void>}
   */
  async commitTransaction(transaction) {
    // For Firestore, actual committing is handled in withTransaction
    // This is a no-op as Firestore handles commits internally
    if (!transaction) return;
    transaction.status = "committed";
  }

  /**
   * Rollback/abort a transaction - not used directly in Firestore
   * @param {Object} transaction Transaction object
   * @return {Promise<void>}
   */
  async rollbackTransaction(transaction) {
    // For Firestore, actual rollback is handled in withTransaction
    // This is a no-op as Firestore handles rollbacks internally
    if (!transaction) return;
    transaction.status = "aborted";
  }

  /**
   * Execute a function within a transaction
   * @param {Function} callback Function to execute with transaction
   * @param {Object} [options] Transaction options
   * @return {Promise<*>} Result of the callback function
   */
  async withTransaction(callback, options = {}) {
    try {
      // Firestore's native transaction API
      return await this.db.runTransaction(async (firestoreTransaction) => {
        // Create our transaction tracking object
        const transaction = {
          id: uuidv4(),
          status: "active",
          firestoreTransaction,
          // Helper methods for common operations
          getDoc: async (collectionName, id) => {
            const fullCollection = `${this.collectionPrefix}${collectionName}`;
            const ref = this.db.collection(fullCollection).doc(id);
            const doc = await firestoreTransaction.get(ref);
            return doc.exists ? {id: doc.id, ...doc.data()} : null;
          },
          setDoc: (collectionName, id, data) => {
            const fullCollection = `${this.collectionPrefix}${collectionName}`;
            const ref = this.db.collection(fullCollection).doc(id);
            firestoreTransaction.set(ref, data);
          },
          updateDoc: (collectionName, id, data) => {
            const fullCollection = `${this.collectionPrefix}${collectionName}`;
            const ref = this.db.collection(fullCollection).doc(id);
            firestoreTransaction.update(ref, data);
          },
          deleteDoc: (collectionName, id) => {
            const fullCollection = `${this.collectionPrefix}${collectionName}`;
            const ref = this.db.collection(fullCollection).doc(id);
            firestoreTransaction.delete(ref);
          },
        };

        // Execute the callback with our transaction wrapper
        const result = await callback(transaction);

        // Firestore will handle commit or rollback automatically
        return result;
      });
    } catch (error) {
      console.error("Firestore transaction error:", error);
      throw error;
    }
  }
}

module.exports = FirestoreTransactionProvider;
