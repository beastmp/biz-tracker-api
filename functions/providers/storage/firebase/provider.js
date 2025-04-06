const {BaseStorageProvider} = require("../../base");
const admin = require("firebase-admin");
const config = require("../../config");
const ProviderRegistry = require("../../registry");

/**
 * Firebase Storage Provider implementation using Admin SDK
 * @extends BaseStorageProvider
 */
class FirebaseStorageProvider extends BaseStorageProvider {
  /**
   * Creates an instance of FirebaseStorageProvider.
   * @constructor
   */
  constructor() {
    super(config);
    this.name = "firebase";
    this.type = "storage";
    this.bucket = null;
    this.initialized = false;
  }

  /**
   * Initialize the Firebase Admin storage provider
   * @param {Object} [config] Configuration options
   * @return {Promise<void>}
   */
  async initialize(config = {}) {
    try {
      if (!this.initialized) {
        // Check if running in Firebase Functions environment
        if (process.env.FIREBASE_CONFIG) {
          // Use default app if it exists
          if (!admin.apps.length) {
            admin.initializeApp();
          }
        } else {
          // Use service account when running locally
          try {
            const serviceAccount =
              require("../../../firebase-credentials.json");
            if (!admin.apps.length) {
              admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                storageBucket: this.bucket || config.STORAGE_BUCKET,
              });
            }
          } catch (error) {
            console.error("Error loading service account:", error);
            if (!admin.apps.length) {
              admin.initializeApp();
            }
          }
        }

        this.bucket = admin.storage().bucket();
        this.initialized = true;
        console.log(`Firebase Admin Storage provider initialized with bucket: ${
          this.bucket.name}`);
      }
    } catch (error) {
      console.error("Error initializing Firebase Admin Storage:", error);
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

      // Create a file object in the bucket
      const file = this.bucket.file(filePath);

      // Upload the file with admin privileges
      const uploadOptions = {
        metadata: {
          contentType: mimeType,
          metadata: {
            uploadedByAdmin: "true",
            timestamp: new Date().toISOString(),
          },
        },
        resumable: false,
      };

      await file.save(fileBuffer, uploadOptions);

      // Make the file publicly accessible
      await file.makePublic();

      // Get the public URL
      const downloadUrl = `https://storage.googleapis.com/${
        this.bucket.name}/${filePath}`;

      return downloadUrl;
    } catch (error) {
      console.error("Firebase Admin Storage upload error:", error);
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
      const filePath = this.getPathFromUrl(url);
      const file = this.bucket.file(filePath);

      await file.delete();
      return true;
    } catch (error) {
      console.error("Firebase Admin Storage delete error:", error);
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
      const file = this.bucket.file(filePath);
      const [exists] = await file.exists();

      if (!exists) {
        throw new Error(`File does not exist: ${filePath}`);
      }

      return `https://storage.googleapis.com/${this.bucket.name}/${filePath}`;
    } catch (error) {
      console.error("Firebase Admin Storage getUrl error:", error);
      throw error;
    }
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

      // Check alternative URL format
      const gcsMatch = url.match(
          /https:\/\/storage\.googleapis\.com\/([^/]+)\/(.+)/,
      );
      if (gcsMatch) {
        return gcsMatch[2];
      }

      throw new Error("Could not extract path from URL");
    } catch (error) {
      console.error("Error extracting path from URL:", error);
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
}

// Self-registration with the provider registry
ProviderRegistry.register("storage", "firebase", new FirebaseStorageProvider());

module.exports = FirebaseStorageProvider;
