const {BaseTransactionProvider} = require("../../base");
const mongoose = require("mongoose");

/**
 * MongoDB implementation of TransactionProvider
 */
class MongoTransactionProvider extends BaseTransactionProvider {
  /**
   * Start a new transaction
   * @return {Promise<Object>} Transaction/session object
   */
  async startTransaction() {
    const session = await mongoose.startSession();
    session.startTransaction();
    return session;
  }

  /**
   * Commit a transaction
   * @param {Object} transaction Transaction/session object
   * @return {Promise<void>}
   */
  async commitTransaction(transaction) {
    if (!transaction) return;
    await transaction.commitTransaction();
    await transaction.endSession();
  }

  /**
   * Rollback/abort a transaction
   * @param {Object} transaction Transaction/session object
   * @return {Promise<void>}
   */
  async rollbackTransaction(transaction) {
    if (!transaction) return;
    try {
      await transaction.abortTransaction();
    } catch (error) {
      console.error("Error aborting transaction:", error);
      // Continue to end session even if abort fails
    } finally {
      await transaction.endSession();
    }
  }
}

module.exports = MongoTransactionProvider;
