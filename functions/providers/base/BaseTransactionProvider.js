const TransactionProvider = require("../interfaces/transactionProvider");

/**
 * Base implementation of TransactionProvider with common functionality
 * @abstract
 */
class BaseTransactionProvider extends TransactionProvider {
  /**
   * Execute a function within a transaction
   * @param {Function} callback Function to execute with transaction
   * @param {Object} [options] Transaction options
   * @return {Promise<*>} Result of the callback function
   */
  async withTransaction(callback, options = {}) {
    const transaction = await this.startTransaction(options);
    try {
      const result = await callback(transaction);
      await this.commitTransaction(transaction);
      return result;
    } catch (error) {
      await this.rollbackTransaction(transaction);
      throw error;
    } finally {
      if (options.logTransactions) {
        console.log(`Transaction ${transaction &&
          transaction.id || "unknown"} completed`);
      }
    }
  }
}

module.exports = BaseTransactionProvider;
