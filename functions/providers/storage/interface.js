/**
 * Storage Provider Interface
 * All storage providers must implement these methods
 */
class StorageProvider {
  /**
   * Initialize the storage provider
   * @return {Promise<void>}
   */
  async initialize() {
    throw new Error("Method 'initialize' must be implemented");
  }

  /**
   * Upload a file to storage
   * @param {Buffer} fileBuffer - The file buffer
   * @param {string} fileName - The file name
   * @param {string} contentType - The file content type
   * @return {Promise<string>} - The public URL of the uploaded file
   */
  async uploadFile(fileBuffer, fileName, contentType) {
    throw new Error("Method 'uploadFile' must be implemented");
  }

  /**
   * Delete a file from storage
   * @param {string} fileUrl - The full URL or path of the file to delete
   * @return {Promise<boolean>} - True if delete was successful
   */
  async deleteFile(fileUrl) {
    throw new Error("Method 'deleteFile' must be implemented");
  }

  /**
   * Test the storage connection
   * @return {Promise<boolean>} - True if connection is working
   */
  async testConnection() {
    throw new Error("Method 'testConnection' must be implemented");
  }
}

module.exports = StorageProvider;
