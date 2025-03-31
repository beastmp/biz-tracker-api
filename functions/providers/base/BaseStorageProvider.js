const StorageProvider = require("../interfaces/storageProvider");

/**
 * Base implementation of StorageProvider with common functionality
 * @abstract
 */
class BaseStorageProvider extends StorageProvider {
  /**
   * Creates a new instance of BaseStorageProvider
   * @param {Object} config - Configuration settings for the storage provider
   */
  constructor(config) {
    super();
    this.config = config;
  }

  /**
   * Generate a safe filename for storage
   * @param {string} fileName Original filename
   * @return {string} Safe filename
   */
  generateSafeFileName(fileName) {
    // Remove invalid characters and spaces
    const safeFileName = fileName
        .replace(/[^a-zA-Z0-9_.-]/g, "_")
        .toLowerCase();

    // Add timestamp to ensure uniqueness
    const timestamp = Date.now();
    const extension = safeFileName.includes(".") ?
      safeFileName.substring(safeFileName.lastIndexOf(".")) :
      "";
    const baseName = safeFileName.includes(".") ?
      safeFileName.substring(0, safeFileName.lastIndexOf(".")) :
      safeFileName;

    return `${baseName}-${timestamp}${extension}`;
  }

  /**
   * Check if the provider is properly configured
   * @return {boolean} True if configured correctly
   */
  isConfigured() {
    return true; // Override in specific providers
  }

  /**
   * Get provider name
   * @return {string} Provider name
   */
  getProviderName() {
    return "base";
  }
}

module.exports = BaseStorageProvider;
