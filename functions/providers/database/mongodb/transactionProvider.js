const mongoose = require("mongoose");

/**
 * MongoDB Transaction Provider
 * Provides transaction handling for MongoDB operations
 */
class MongoTransactionProvider {
  /**
   * MongoDB Transaction Provider constructor
   * @param {Object} config - Configuration options
   */
  constructor(config) {
    this.config = config || {};
    this.session = null;
    this.isActive = false;
  }

  /**
   * Start a new transaction
   * @return {Promise<Object>} Transaction object
   */
  async begin() {
    if (this.isActive) {
      throw new Error("Transaction already in progress");
    }

    // Create a new session
    this.session = await mongoose.startSession();

    // Start a transaction
    this.session.startTransaction();
    this.isActive = true;

    return {
      session: this.session,
      isActive: this.isActive,
    };
  }

  /**
   * Commit the current transaction
   * @return {Promise<boolean>} Success indicator
   */
  async commit() {
    if (!this.isActive || !this.session) {
      throw new Error("No active transaction to commit");
    }

    try {
      await this.session.commitTransaction();
      return true;
    } catch (error) {
      console.error("Error committing transaction:", error);
      throw error;
    } finally {
      await this.session.endSession();
      this.session = null;
      this.isActive = false;
    }
  }

  /**
   * Rollback the current transaction
   * @return {Promise<boolean>} Success indicator
   */
  async rollback() {
    if (!this.isActive || !this.session) {
      throw new Error("No active transaction to rollback");
    }

    try {
      await this.session.abortTransaction();
      return true;
    } catch (error) {
      console.error("Error aborting transaction:", error);
      throw error;
    } finally {
      await this.session.endSession();
      this.session = null;
      this.isActive = false;
    }
  }

  /**
   * Check if transaction is active
   * @return {boolean} Transaction active status
   */
  isTransactionActive() {
    return this.isActive;
  }

  /**
   * Get the active session
   * @return {Object|null} Current MongoDB session or null
   */
  getSession() {
    return this.session;
  }

  /**
   * Execute a function within a transaction
   * @param {Function} fn Function to execute within transaction
   * @return {Promise<*>} Result of the function
   */
  async executeWithTransaction(fn) {
    if (!fn || typeof fn !== "function") {
      throw new Error("Function required for transaction execution");
    }

    // Create transaction if not already active
    const needsNewTransaction = !this.isActive;

    try {
      if (needsNewTransaction) {
        await this.begin();
      }

      // Execute the function with the transaction
      const result = await fn(this.session);

      // Commit only if we started a new transaction
      if (needsNewTransaction) {
        await this.commit();
      }

      return result;
    } catch (error) {
      // Rollback only if we started a new transaction
      if (needsNewTransaction && this.isActive) {
        await this.rollback();
      }
      throw error;
    }
  }
}

module.exports = MongoTransactionProvider;
