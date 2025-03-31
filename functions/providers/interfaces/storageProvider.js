/**
 * @interface StorageProvider
 * Interface that defines methods
 * each storage provider implementation must provide
 */
class StorageProvider {
  /**
   * Initialize the storage provider
   * @param {Object} [config] Configuration options
   * @return {Promise<void>}
   */
  async initialize(config = {}) {
    throw new Error("Method not implemented");
  }

  /**
   * Upload a file to storage
   * @param {Buffer|ReadStream} fileBuffer File data buffer
   * @param {string} fileName Original filename
   * @param {string} mimeType File MIME type
   * @param {Object} [options] Additional options
   * @return {Promise<string>} Public URL to the uploaded file
   */
  async uploadFile(fileBuffer, fileName, mimeType, options = {}) {
    throw new Error("Method not implemented");
  }

  /**
   * Delete a file from storage
   * @param {string} url URL or path of file to delete
   * @return {Promise<boolean>} True if deleted successfully
   */
  async deleteFile(url) {
    throw new Error("Method not implemented");
  }

  /**
   * Get public URL for a file
   * @param {string} path Path of file
   * @return {Promise<string>} Public URL
   */
  async getUrl(path) {
    throw new Error("Method not implemented");
  }

  /**
   * Check if the provider is properly configured
   * @return {boolean} True if configured correctly
   */
  isConfigured() {
    return false;
  }

  /**
   * Get provider name
   * @throws {Error} Method not implemented
   */
  getProviderName() {
    throw new Error("Method not implemented");
  }
}

module.exports = StorageProvider;
