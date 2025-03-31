const {BaseStorageProvider} = require("../../base");
const {S3Client, PutObjectCommand,
  DeleteObjectCommand, HeadObjectCommand,
  GetObjectCommand} = require("@aws-sdk/client-s3");
const {getSignedUrl} = require("@aws-sdk/s3-request-presigner");
const ProviderRegistry = require("../../registry");
const config = require("../../config");
const path = require("path");
const {Readable} = require("stream");

/**
 * S3 implementation of StorageProvider
 */
class S3StorageProvider extends BaseStorageProvider {
  /**
   * Create a new S3StorageProvider
   * @param {Object} config - Configuration settings
   */
  constructor(config = {}) {
    super(config);
    this.s3Client = null;
    this.isInitialized = false;
    this.bucket = config.S3_BUCKET || process.env.S3_BUCKET;
    this.region = config.AWS_REGION || process.env.AWS_REGION || "us-east-1";
    this.baseUrl = config.S3_BASE_URL || process.env.S3_BASE_URL || null;
    this.acl = config.S3_ACL || process.env.S3_ACL || "public-read";
    this.uploadFolder = config.S3_UPLOAD_FOLDER ||
      process.env.S3_UPLOAD_FOLDER || "uploads";
  }

  /**
   * Initialize the storage provider
   * @param {Object} [config] Configuration options
   * @return {Promise<void>}
   */
  async initialize(config = {}) {
    if (this.isInitialized) return;

    try {
      // Override any config settings passed in
      if (config.bucket) this.bucket = config.bucket;
      if (config.region) this.region = config.region;
      if (config.baseUrl) this.baseUrl = config.baseUrl;
      if (config.acl) this.acl = config.acl;
      if (config.uploadFolder) this.uploadFolder = config.uploadFolder;

      // Create S3 client
      this.s3Client = new S3Client({
        region: this.region,
        credentials: {
          accessKeyId: config.AWS_ACCESS_KEY_ID ||
            process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: config.AWS_SECRET_ACCESS_KEY ||
            process.env.AWS_SECRET_ACCESS_KEY,
        },
      });

      // Verify connection by checking if bucket exists
      if (this.bucket) {
        try {
          await this.s3Client.send(new HeadObjectCommand({
            Bucket: this.bucket,
            Key: ".verify-connection",
          }));
        } catch (error) {
          if (error.name !== "NotFound") {
            console.warn(`S3 connection verification warning:
              ${error.message}`);
            // Continue even if the test file doesn't exist
          }
        }
      }

      this.isInitialized = true;
      console.log(`✅ S3 storage provider initialized
        successfully with bucket: ${this.bucket}`);
    } catch (error) {
      console.error("❌ Failed to initialize S3 storage provider:", error);
      throw error;
    }
  }

  /**
   * Upload a file to S3 storage
   * @param {Buffer|ReadStream} fileBuffer File data buffer
   * @param {string} fileName Original filename
   * @param {string} mimeType File MIME type
   * @param {Object} [options] Additional options
   * @return {Promise<string>} Public URL to the uploaded file
   */
  async uploadFile(fileBuffer, fileName, mimeType, options = {}) {
    if (!this.isInitialized) await this.initialize();

    if (!this.bucket) {
      throw new Error("S3 bucket name is not configured");
    }

    try {
      // Generate a safe filename to avoid conflicts and special characters
      const safeFileName = this.generateSafeFileName(fileName);

      // Determine the S3 key (path)
      const folderPath = options.folder || this.uploadFolder || "";
      const key = path.join(folderPath, safeFileName).replace(/\\/g, "/");

      // Create upload parameters
      const uploadParams = {
        Bucket: this.bucket,
        Key: key,
        Body: fileBuffer instanceof Readable ?
          fileBuffer : Buffer.from(fileBuffer),
        ContentType: mimeType,
        ACL: options.acl || this.acl,
      };

      // Set metadata if provided
      if (options.metadata) {
        uploadParams.Metadata = options.metadata;
      }

      // Upload to S3
      await this.s3Client.send(new PutObjectCommand(uploadParams));

      // Return the URL to the uploaded file
      return await this.getUrl(key);
    } catch (error) {
      console.error(`❌ S3 upload error for file ${fileName}:`, error);
      throw error;
    }
  }

  /**
   * Delete a file from S3 storage
   * @param {string} url URL or path of file to delete
   * @return {Promise<boolean>} True if deleted successfully
   */
  async deleteFile(url) {
    if (!this.isInitialized) await this.initialize();

    try {
      // Convert URL to S3 key if needed
      const key = this._extractKeyFromUrl(url);

      if (!key) {
        throw new Error(`Unable to extract key from URL: ${url}`);
      }

      // Delete the object
      await this.s3Client.send(new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }));

      return true;
    } catch (error) {
      console.error(`❌ S3 delete error for URL ${url}:`, error);
      return false;
    }
  }

  /**
   * Get public URL for a file
   * @param {string} path Path of file
   * @return {Promise<string>} Public URL
   */
  async getUrl(path) {
    if (!this.isInitialized) await this.initialize();

    // If baseUrl is provided, use it to construct the URL
    if (this.baseUrl) {
      const cleanPath = path.startsWith("/") ? path.substring(1) : path;
      return `${this.baseUrl.replace(/\/+$/, "")}/${cleanPath}`;
    }

    // Otherwise generate a signed URL (which will expire)
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: path,
      });

      // Generate URL that expires in 1 hour (3600 seconds)
      return await getSignedUrl(this.s3Client, command, {expiresIn: 3600});
    } catch (error) {
      console.error(`❌ S3 getUrl error for path ${path}:`, error);
      throw error;
    }
  }

  /**
   * Check if the provider is properly configured
   * @return {boolean} True if configured correctly
   */
  isConfigured() {
    const requiredConfig = [
      process.env.AWS_ACCESS_KEY_ID || config.AWS_ACCESS_KEY_ID,
      process.env.AWS_SECRET_ACCESS_KEY || config.AWS_SECRET_ACCESS_KEY,
      this.bucket,
    ];

    return requiredConfig.every(Boolean);
  }

  /**
   * Get provider name
   * @return {string} Provider name
   */
  getProviderName() {
    return "s3";
  }

  /**
   * Extract S3 key from a URL
   * @param {string} url File URL
   * @return {string|null} S3 key or null if can't be extracted
   * @private
   */
  _extractKeyFromUrl(url) {
    // First check if it's already a key (not a URL)
    if (!url.startsWith("http")) {
      return url;
    }

    try {
      // Try to extract key from URL
      let key;

      if (this.baseUrl && url.startsWith(this.baseUrl)) {
        // Extract from custom domain URL
        key = url.substring(this.baseUrl.length).replace(/^\/+/, "");
      } else {
        // Extract from standard S3 URL
        const urlObj = new URL(url);
        if (urlObj.hostname.includes("amazonaws.com")) {
          // Standard S3 URL: https://<bucket>.s3.<region>.amazonaws.com/<key>
          key = urlObj.pathname.substring(1); // Remove leading slash
        } else if (this.bucket && urlObj.hostname === this.bucket) {
          // Virtual-hosted style: https://<bucket>.s3.amazonaws.com/<key>
          key = urlObj.pathname.substring(1);
        } else {
          // Path style: https://s3.<region>.amazonaws.com/<bucket>/<key>
          const pathParts = urlObj.pathname.split("/").filter(Boolean);
          if (pathParts.length >= 2 && pathParts[0] === this.bucket) {
            key = pathParts.slice(1).join("/");
          }
        }
      }

      return key || null;
    } catch (error) {
      console.error(`❌ Failed to extract key from URL ${url}:`, error);
      return null;
    }
  }
}

// Register the provider with the registry
const s3Provider = new S3StorageProvider(config);
ProviderRegistry.register("storage", "s3", s3Provider);

module.exports = S3StorageProvider;
