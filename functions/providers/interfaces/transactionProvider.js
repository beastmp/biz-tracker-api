/**
 * Transaction Provider Interface
 * Defines the contract for all transaction provider implementations
 */
class TransactionProvider {
  /**
   * Start a new transaction
   * @return {Promise<Object>} Transaction object
   */
  async begin() {
    throw new Error("Method 'begin' must be implemented");
  }

  /**
   * Commit the current transaction
   * @return {Promise<boolean>} Success indicator
   */
  async commit() {
    throw new Error("Method 'commit' must be implemented");
  }

  /**
   * Rollback the current transaction
   * @return {Promise<boolean>} Success indicator
   */
  async rollback() {
    throw new Error("Method 'rollback' must be implemented");
  }

  /**
   * Check if transaction is active
   */
  isTransactionActive() {
    throw new Error("Method 'isTransactionActive' must be implemented");
  }

  /**
   * Get the active session
   */
  getSession() {
    throw new Error("Method 'getSession' must be implemented");
  }

  /**
   * Execute a function within a transaction
   * @param {Function} fn Function to execute within transaction
   * @return {Promise<*>} Result of the function
   */
  async executeWithTransaction(fn) {
    throw new Error("Method 'executeWithTransaction' must be implemented");
  }
}

module.exports = TransactionProvider;
