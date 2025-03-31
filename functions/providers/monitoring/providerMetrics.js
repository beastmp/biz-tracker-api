/**
 * Provider monitoring and metrics
 * Tracks provider health and performance
 */
class ProviderMetrics {
  /**
   * Initialize a new instance of ProviderMetrics
   * Sets up initial metrics tracking for database and storage operations
   */
  constructor() {
    this.metrics = {
      database: {
        operations: 0,
        errors: 0,
        lastError: null,
        lastOperationTime: 0,
        averageOperationTime: 0,
      },
      storage: {
        operations: 0,
        errors: 0,
        lastError: null,
        lastOperationTime: 0,
        averageOperationTime: 0,
        bytesUploaded: 0,
        bytesDownloaded: 0,
      },
    };

    this.startTime = Date.now();
  }

  /**
   * Track database operation
   * @param {string} operation Operation name
   * @param {number} duration Operation duration in ms
   * @param {Error} [error] Error if operation failed
   */
  trackDatabaseOperation(operation, duration, error = null) {
    this.metrics.database.operations++;
    this.metrics.database.lastOperationTime = duration;

    // Update average operation time
    this.metrics.database.averageOperationTime =
        ((this.metrics.database.averageOperationTime *
            (this.metrics.database.operations - 1)) + duration) /
        this.metrics.database.operations;

    if (error) {
      this.metrics.database.errors++;
      this.metrics.database.lastError = {
        message: error.message,
        operation,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Track storage operation
   * @param {string} operation Operation name
   * @param {number} duration Operation duration in ms
   * @param {number} [bytes] Bytes transferred (upload/download)
   * @param {Error} [error] Error if operation failed
   */
  trackStorageOperation(operation, duration, bytes = 0, error = null) {
    this.metrics.storage.operations++;
    this.metrics.storage.lastOperationTime = duration;

    // Update average operation time
    this.metrics.storage.averageOperationTime =
        ((this.metrics.storage.averageOperationTime *
            (this.metrics.storage.operations - 1)) + duration) /
        this.metrics.storage.operations;

    // Track bytes transferred
    if (operation === "upload") {
      this.metrics.storage.bytesUploaded += bytes;
    } else if (operation === "download") {
      this.metrics.storage.bytesDownloaded += bytes;
    }

    if (error) {
      this.metrics.storage.errors++;
      this.metrics.storage.lastError = {
        message: error.message,
        operation,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get health status of providers
   * @return {Object} Health status
   */
  getHealthStatus() {
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);

    return {
      uptime: uptimeSeconds,
      database: {
        status: this.getDatabaseHealth(),
        operationCount: this.metrics.database.operations,
        errorRate: this.metrics.database.operations > 0 ?
            (this.metrics.database.errors /
                this.metrics.database.operations) : 0,
        averageOperationTimeMs: this.metrics.database.averageOperationTime,
      },
      storage: {
        status: this.getStorageHealth(),
        operationCount: this.metrics.storage.operations,
        errorRate: this.metrics.storage.operations > 0 ?
            (this.metrics.storage.errors / this.metrics.storage.operations) : 0,
        averageOperationTimeMs: this.metrics.storage.averageOperationTime,
        bytesUploaded: this.metrics.storage.bytesUploaded,
        bytesDownloaded: this.metrics.storage.bytesDownloaded,
      },
    };
  }

  /**
   * Get database health status
   * @return {string} Health status: "healthy", "degraded", "unhealthy"
   * @private
   */
  getDatabaseHealth() {
    if (this.metrics.database.operations === 0) {
      return "unknown";
    }

    const errorRate = this.metrics.database.errors /
        this.metrics.database.operations;

    if (errorRate > 0.1) {
      return "unhealthy";
    } else if (errorRate > 0.01) {
      return "degraded";
    } else {
      return "healthy";
    }
  }

  /**
   * Get storage health status
   * @return {string} Health status: "healthy", "degraded", "unhealthy"
   * @private
   */
  getStorageHealth() {
    if (this.metrics.storage.operations === 0) {
      return "unknown";
    }

    const errorRate = this.metrics.storage.errors /
        this.metrics.storage.operations;

    if (errorRate > 0.1) {
      return "unhealthy";
    } else if (errorRate > 0.01) {
      return "degraded";
    } else {
      return "healthy";
    }
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.metrics.database.operations = 0;
    this.metrics.database.errors = 0;
    this.metrics.database.averageOperationTime = 0;
    this.metrics.storage.operations = 0;
    this.metrics.storage.errors = 0;
    this.metrics.storage.averageOperationTime = 0;
    this.metrics.storage.bytesUploaded = 0;
    this.metrics.storage.bytesDownloaded = 0;
    this.startTime = Date.now();
  }
}

// Export singleton instance
const providerMetrics = new ProviderMetrics();
module.exports = providerMetrics;
