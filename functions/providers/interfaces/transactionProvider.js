/**
 * @interface TransactionProvider
 * Interface for handling database transactions
 */
class TransactionProvider {
  /**
   * Start a new transaction
   * @return {Promise<Object>} Transaction/session object
   */
  async startTransaction() {
    throw new Error("Method not implemented");
  }

  /**
   * Commit a transaction
   * @param {Object} transaction Transaction/session object
   * @return {Promise<void>}
   */
  async commitTransaction(transaction) {
    throw new Error("Method not implemented");
  }

  /**
   * Rollback/abort a transaction
   * @param {Object} transaction Transaction/session object
   * @return {Promise<void>}
   */
  async rollbackTransaction(transaction) {
    throw new Error("Method not implemented");
  }
}

module.exports = TransactionProvider;
