/**
 * Firebase Storage Provider Module
 * 
 * Implementation of Firebase Storage provider using Admin SDK with connection management
 * and verification similar to the MongoDB provider pattern.
 * 
 * @module firebase-storage-provider
 * @requires firebase-admin
 */
const admin = require("firebase-admin");
const ProviderRegistry = require("../../registry");

// Track connection state
let isConnected = false;
let connectionAttempts = 0;
const MAX_RETRIES = 3;
const RETRY_INTERVAL = 3000; // 3 seconds

// Log level: 0 = none, 1 = essential, 2 = verbose
const LOG_LEVEL = 1;

/**
 * Firebase Storage Provider implementation using Admin SDK
 *
 * @class FirebaseStorageProvider
 */
class FirebaseStorageProvider {
  /**
   * Creates an instance of FirebaseStorageProvider.
   *
   * @param {Object} config - Configuration object
   */
  constructor(config = {}) {
    this.name = "firebase";
    this.type = "storage";
    this.bucket = null;
    this.config = config;
    this.initialized = false;
    this.isConnected = false;
  }

  /**
   * Initialize the Firebase Admin storage provider
   *
   * @param {Object} [config] - Configuration options
   * @param {string} [instanceId="main"] - Instance identifier for logging
   * @return {Promise<FirebaseStorageProvider>} This provider instance for chaining
   */
  async initialize(config = {}, instanceId = "main") {
    try {
      // Merge config with existing
      if (config) {
        this.config = { ...this.config, ...config };
      }

      if (!this.initialized) {
        // Basic initialization
        // if (LOG_LEVEL > 0) {
        //   console.log(`[${instanceId}] 🔄 Initializing Firebase Storage provider...`);
        // }

        // Setup the Firebase admin app if not already initialized
        await this.setupAdminApp(instanceId);
        
        this.bucket = admin.storage().bucket();
        this.initialized = true;
        
        if (LOG_LEVEL > 0) {
          console.log(
            `[${instanceId}] ✅ Firebase Storage provider initialized with bucket: ${this.bucket.name}`
          );
        }
      }

      // Establish connection if not already connected
      if (!this.isConnected) {
        await this.connect(instanceId);
      }

      return this;
    } catch (error) {
      console.error(`[${instanceId}] ❌ Error initializing Firebase Storage provider:`, error);
      throw error;
    }
  }

  /**
   * Set up the Firebase Admin app
   *
   * @param {string} [instanceId="main"] - Instance identifier for logging
   * @return {Promise<void>}
   * @private
   */
  async setupAdminApp(instanceId = "main") {
    // Check if running in Firebase Functions environment
    if (process.env.FIREBASE_CONFIG) {
      // Use default app if it exists
      if (!admin.apps.length) {
        admin.initializeApp();
      }
    } else {
      // Use service account when running locally
      try {
        const serviceAccount = require("../../../firebase-credentials.json");
        if (!admin.apps.length) {
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            storageBucket: this.config.STORAGE_BUCKET,
          });
        }
      } catch (error) {
        console.error(`[${instanceId}] ❌ Error loading service account:`, error);
        if (!admin.apps.length) {
          admin.initializeApp();
        }
      }
    }
  }

  /**
   * Connect to Firebase Storage and verify connection by performing a test operation
   *
   * @param {string} [instanceId="main"] - Instance identifier for logging
   * @return {Promise<void>}
   */
  async connect(instanceId = "main") {
    if (this.isConnected) {
      if (LOG_LEVEL > 0) {
        console.log(`[${instanceId}] ✅ Using existing Firebase Storage connection`);
      }
      return;
    }

    try {
      if (LOG_LEVEL > 0) {
        console.log(`[${instanceId}] 🔄 Connecting to Firebase Storage...`);
      }

      // Ensure initialization first
      if (!this.initialized) {
        await this.setupAdminApp(instanceId);
        this.bucket = admin.storage().bucket();
        this.initialized = true;
      }

      // Test connection by performing a metadata retrieval
      await this.testConnection(instanceId);
      
      this.isConnected = true;
      connectionAttempts = 0;
      
      if (LOG_LEVEL > 0) {
        console.log(`[${instanceId}] ✅ Firebase Storage provider connected successfully`);
      }
    } catch (error) {
      connectionAttempts++;
      console.error(
        `[${instanceId}] ❌ Firebase Storage connection attempt ${connectionAttempts} failed:`, 
        error.message
      );

      if (connectionAttempts < MAX_RETRIES) {
        console.log(`[${instanceId}] ⏱️ Retrying in ${RETRY_INTERVAL/1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_INTERVAL));
        return this.connect(instanceId); // Recursive retry with same instance ID
      } else {
        console.error(
          `[${instanceId}] ❌ Failed to connect to Firebase Storage after ${MAX_RETRIES} attempts`
        );
        throw error;
      }
    }
  }

  /**
   * Test the Firebase Storage connection by retrieving bucket metadata
   *
   * @param {string} [instanceId="main"] - Instance identifier for logging
   * @return {Promise<void>}
   * @private
   */
  async testConnection(instanceId = "main") {
    try {
      if (LOG_LEVEL > 1) {
        console.log(`[${instanceId}] 🔍 Testing Firebase Storage connection...`);
      }
      
      // Get bucket metadata as a simple test operation
      const [metadata] = await this.bucket.getMetadata();
      
      if (LOG_LEVEL > 1) {
        console.log(
          `[${instanceId}] ✓ Firebase Storage connection test successful. Bucket: ${metadata.name}`
        );
      }
    } catch (error) {
      console.error(`[${instanceId}] ❌ Firebase Storage connection test failed:`, error);
      throw new Error(`Firebase Storage connection test failed: ${error.message}`);
    }
  }

  /**
   * Check connection health for Firebase Storage
   *
   * @param {string} [instanceId="main"] - Instance identifier for logging
   * @return {Promise<Object>} Health status object
   */
  async checkHealth(instanceId = "main") {
    try {
      if (!this.initialized || !this.bucket) {
        return {
          status: "not_initialized",
          isConnected: false,
        };
      }

      // Test connection
      await this.testConnection(instanceId);
      
      return {
        status: "connected",
        isConnected: true,
        bucketName: this.bucket.name,
        provider: "firebase",
      };
    } catch (error) {
      return {
        status: "error",
        isConnected: false,
        error: error.message,
        provider: "firebase",
      };
    }
  }

  /**
   * Generate a safe filename for storage
   * 
   * @param {string} originalFilename - Original filename
   * @return {string} Safe filename with timestamp prefix
   * @private
   */
  generateSafeFileName(originalFilename) {
    // Extract file extension
    const fileExt = originalFilename.split(".").pop().toLowerCase();
    
    // Create a timestamp-based prefix
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    
    // Replace unsafe characters in the original name
    const safeName = originalFilename
      .split(".")
      .slice(0, -1)
      .join("-")
      .replace(/[^a-z0-9]/gi, "-")
      .toLowerCase();
    
    return `${timestamp}-${safeName}.${fileExt}`;
  }

  /**
   * Upload a file to Firebase Storage
   * 
   * @param {Buffer|Uint8Array} fileBuffer - File data buffer
   * @param {string} fileName - Original filename
   * @param {string} mimeType - File MIME type
   * @param {Object} options - Additional options
   * @param {string} [instanceId="main"] - Instance identifier for logging
   * @return {Promise<string>} Public URL to the uploaded file
   */
  async uploadFile(fileBuffer, fileName, mimeType, options = {}, instanceId = "main") {
    // Ensure connection before upload
    if (!this.isConnected) {
      await this.connect(instanceId);
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
      const downloadUrl = `https://storage.googleapis.com/${this.bucket.name}/${filePath}`;

      if (LOG_LEVEL > 1) {
        console.log(`[${instanceId}] ✅ File uploaded successfully: ${filePath}`);
      }

      return downloadUrl;
    } catch (error) {
      console.error(`[${instanceId}] ❌ Firebase Storage upload error:`, error);
      throw error;
    }
  }

  /**
   * Delete a file from Firebase Storage
   * 
   * @param {string} url - URL of file to delete
   * @param {string} [instanceId="main"] - Instance identifier for logging
   * @return {Promise<boolean>} True if deleted successfully
   */
  async deleteFile(url, instanceId = "main") {
    // Ensure connection before delete
    if (!this.isConnected) {
      await this.connect(instanceId);
    }

    try {
      // Extract file path from URL
      const filePath = this.getPathFromUrl(url);
      const file = this.bucket.file(filePath);

      await file.delete();
      
      if (LOG_LEVEL > 1) {
        console.log(`[${instanceId}] ✅ File deleted successfully: ${filePath}`);
      }
      
      return true;
    } catch (error) {
      console.error(`[${instanceId}] ❌ Firebase Storage delete error:`, error);
      return false;
    }
  }

  /**
   * Get public URL for a file
   * 
   * @param {string} filePath - Path of file
   * @param {string} [instanceId="main"] - Instance identifier for logging
   * @return {Promise<string>} Public URL
   */
  async getUrl(filePath, instanceId = "main") {
    // Ensure connection
    if (!this.isConnected) {
      await this.connect(instanceId);
    }

    try {
      const file = this.bucket.file(filePath);
      const [exists] = await file.exists();

      if (!exists) {
        throw new Error(`File does not exist: ${filePath}`);
      }

      return `https://storage.googleapis.com/${this.bucket.name}/${filePath}`;
    } catch (error) {
      console.error(`[${instanceId}] ❌ Firebase Storage getUrl error:`, error);
      throw error;
    }
  }

  /**
   * Extract path from Firebase Storage URL
   * 
   * @param {string} url - Firebase Storage URL
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
        /https:\/\/storage\.googleapis\.com\/([^/]+)\/(.+)/
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
   * 
   * @return {boolean} True if configured correctly
   */
  isConfigured() {
    return !!this.bucket;
  }

  /**
   * Get provider name
   *
   * @return {string} Provider name
   */
  getProviderName() {
    return "firebase";
  }

  /**
   * Static method to register this provider with the registry
   *
   * @static
   * @param {string} [instanceId="main"] - Instance identifier for logging
   * @return {FirebaseStorageProvider} The registered provider instance
   */
  static register(instanceId = "main") {
    // Create a new instance
    const provider = new FirebaseStorageProvider();

    // Register with the registry
    ProviderRegistry.register("storage", "firebase", provider, instanceId);

    return provider;
  }
}

// Self-register the provider with the registry on module load
// This can be disabled by setting an environment variable if needed for testing
if (process.env.DISABLE_AUTO_PROVIDER_REGISTRATION !== "true") {
  FirebaseStorageProvider.register();
}

module.exports = FirebaseStorageProvider;
