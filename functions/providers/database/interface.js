/**
 * Database Provider Interface
 * All database providers must implement these methods
 */
class DatabaseProvider {
  /**
   * Initialize the database connection
   * @return {Promise<void>}
   */
  async connect() {
    throw new Error("Method 'connect' must be implemented");
  }

  /**
   * Close the database connection
   * @return {Promise<void>}
   */
  async disconnect() {
    throw new Error("Method 'disconnect' must be implemented");
  }

  /**
   * Get the database client/instance
   * @return {any} The database client
   */
  getClient() {
    throw new Error("Method 'getClient' must be implemented");
  }

  /**
   * Check if the database connection is active
   * @return {Promise<boolean>}
   */
  async isConnected() {
    throw new Error("Method 'isConnected' must be implemented");
  }
}

module.exports = DatabaseProvider;
