/**
 * Storage Provider Interface
 * Defines the contract for all storage provider implementations
 */
class StorageProvider {
  /**
   * Initialize the storage provider
   * @param {Object} config Configuration options
   * @return {Promise<void>}
   */
  async initialize(config = {}) {
    throw new Error("Method 'initialize' must be implemented");
  }

  /**
   * Upload a file to storage
   * @param {Buffer|string} fileData File data or path
   * @param {string} destinationPath Path where the file should be stored
   * @param {Object} options Upload options
   * @return {Promise<string>} URL or path to the uploaded file
   */
  async uploadFile(fileData, destinationPath, options = {}) {
    throw new Error("Method 'uploadFile' must be implemented");
  }

  /**
   * Download a file from storage
   * @param {string} filePath Path to the file in storage
   * @param {string} [destinationPath] Optional local destination path
   * @return {Promise<Buffer|string>} File data or local path
   */
  async downloadFile(filePath, destinationPath = null) {
    throw new Error("Method 'downloadFile' must be implemented");
  }

  /**
   * Delete a file from storage
   * @param {string} filePath Path to the file in storage
   * @return {Promise<boolean>} Success indicator
   */
  async deleteFile(filePath) {
    throw new Error("Method 'deleteFile' must be implemented");
  }

  /**
   * Check if a file exists in storage
   * @param {string} filePath Path to the file in storage
   * @return {Promise<boolean>} True if exists, false otherwise
   */
  async fileExists(filePath) {
    throw new Error("Method 'fileExists' must be implemented");
  }

  /**
   * Get a list of files in a directory
   * @param {string} directoryPath Path to directory in storage
   * @param {Object} options Listing options
   * @return {Promise<Array<Object>>} List of file metadata
   */
  async listFiles(directoryPath, options = {}) {
    throw new Error("Method 'listFiles' must be implemented");
  }

  /**
   * Get file metadata
   * @param {string} filePath Path to the file in storage
   * @return {Promise<Object>} File metadata
   */
  async getFileMetadata(filePath) {
    throw new Error("Method 'getFileMetadata' must be implemented");
  }

  /**
   * Generate a signed URL for temporary access to a file
   * @param {string} filePath Path to the file in storage
   * @param {number} expiresInSeconds URL expiration time in seconds
   * @param {Object} options Additional options
   * @return {Promise<string>} Signed URL
   */
  async getSignedUrl(filePath, expiresInSeconds = 3600, options = {}) {
    throw new Error("Method 'getSignedUrl' must be implemented");
  }

  /**
   * Copy a file within the storage
   * @param {string} sourcePath Source file path
   * @param {string} destinationPath Destination file path
   * @return {Promise<string>} URL or path to the copied file
   */
  async copyFile(sourcePath, destinationPath) {
    throw new Error("Method 'copyFile' must be implemented");
  }

  /**
   * Move/rename a file within the storage
   * @param {string} sourcePath Source file path
   * @param {string} destinationPath Destination file path
   * @return {Promise<string>} URL or path to the moved file
   */
  async moveFile(sourcePath, destinationPath) {
    throw new Error("Method 'moveFile' must be implemented");
  }

  /**
   * Get the provider name
   */
  getProviderName() {
    throw new Error("Method 'getProviderName' must be implemented");
  }
}

module.exports = StorageProvider;
