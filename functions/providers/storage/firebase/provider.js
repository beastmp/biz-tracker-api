const {BaseStorageProvider} = require("../../base");
const {getStorage, ref, uploadBytes,
  getDownloadURL, deleteObject} = require("firebase/storage");
const {initializeApp} = require("firebase/app");
const config = require("../../config");
const ProviderRegistry = require("../../registry");

/**
 * Firebase Storage Provider implementation
 * @extends BaseStorageProvider
 */
class FirebaseStorageProvider extends BaseStorageProvider {
  /**
   * Creates an instance of FirebaseStorageProvider.
   * Initializes the provider with default configuration.
   * @constructor
   */
  constructor() {
    super(config);
    this.name = "firebase";
    this.type = "storage";
    this.app = null;
    this.storage = null;
    this.bucket = config.STORAGE_BUCKET || null;
    this.initialized = false;
  }

  /**
   * Initialize the Firebase storage provider
   * @param {Object} [config] Configuration options
   * @return {Promise<void>}
   */
  async initialize(config = {}) {
    try {
      // Initialize Firebase if not already initialized
      if (!this.app) {
        const firebaseConfig = {
          storageBucket: this.bucket || config.STORAGE_BUCKET,
        };

        this.app = initializeApp(firebaseConfig);
        this.storage = getStorage(this.app);
        this.initialized = true;
        console.log(`Firebase Storage provider initialized
          with bucket: ${this.bucket}`);
      }
    } catch (error) {
      console.error("Error initializing Firebase Storage:", error);
      throw error;
    }
  }

  /**
   * Upload a file to Firebase Storage
   * @param {Buffer|Uint8Array} fileBuffer File data buffer
   * @param {string} fileName Original filename
   * @param {string} mimeType File MIME type
   * @param {Object} options Additional options
   * @return {Promise<string>} Public URL to the uploaded file
   */
  async uploadFile(fileBuffer, fileName, mimeType, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const safeFileName = this.generateSafeFileName(fileName);
      const folderPath = options.folder || "uploads";
      const filePath = `${folderPath}/${safeFileName}`;

      // Create a reference to the file location
      const fileRef = ref(this.storage, filePath);

      // Upload the file
      const metadata = {
        contentType: mimeType,
      };

      await uploadBytes(fileRef, fileBuffer, metadata);

      // Get the public URL
      const downloadUrl = await getDownloadURL(fileRef);
      return downloadUrl;
    } catch (error) {
      console.error("Firebase Storage upload error:", error);
      throw error;
    }
  }

  /**
   * Delete a file from Firebase Storage
   * @param {string} url URL of file to delete
   * @return {Promise<boolean>} True if deleted successfully
   */
  async deleteFile(url) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Extract file path from URL
      const fileRef = ref(this.storage, this.getPathFromUrl(url));
      await deleteObject(fileRef);
      return true;
    } catch (error) {
      console.error("Firebase Storage delete error:", error);
      return false;
    }
  }

  /**
   * Get public URL for a file
   * @param {string} filePath Path of file
   * @return {Promise<string>} Public URL
   */
  async getUrl(filePath) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const fileRef = ref(this.storage, filePath);
      return await getDownloadURL(fileRef);
    } catch (error) {
      console.error("Firebase Storage getUrl error:", error);
      throw error;
    }
  }

  /**
   * Check if Firebase Storage is properly configured
   * @return {boolean} True if configured correctly
   */
  isConfigured() {
    return !!this.bucket;
  }

  /**
   * Get provider name
   * @return {string} Provider name
   */
  getProviderName() {
    return "firebase";
  }

  /**
   * Extract path from Firebase Storage URL
   * @param {string} url Firebase Storage URL
   * @return {string} Storage path
   * @private
   */
  getPathFromUrl(url) {
    try {
      // Extract the path from the URL
      const urlObj = new URL(url);
      const pathMatch = urlObj.pathname.match(/\/o\/(.+?)(?:\?|$)/);

      if (pathMatch && pathMatch[1]) {
        return decodeURIComponent(pathMatch[1]);
      }

      throw new Error("Could not extract path from URL");
    } catch (error) {
      console.error("Error extracting path from URL:", error);
      throw error;
    }
  }
}

// Self-registration with the provider registry
ProviderRegistry.register("storage", "firebase", new FirebaseStorageProvider());

module.exports = FirebaseStorageProvider;
