const admin = require("firebase-admin");
const path = require("path");
const StorageProvider = require("./interface");

class FirebaseStorageProvider extends StorageProvider {
  constructor(config) {
    super();
    this.bucketName = config.bucketName;
    this.storagePath = config.storagePath || "inventory";
    this.adminConfig = {
      storageBucket: this.bucketName,
    };

    // If service account credentials are provided
    if (config.serviceAccount) {
      this.adminConfig.credential = admin.credential.cert(config.serviceAccount);
    }
  }

  async initialize() {
    try {
      // Check if already initialized
      if (admin.apps.length === 0) {
        admin.initializeApp(this.adminConfig);
      }
      this.bucket = admin.storage().bucket();
      return true;
    } catch (error) {
      console.error("❌ Failed to initialize Firebase Storage:", error);
      throw error;
    }
  }

  async uploadFile(fileBuffer, fileName, contentType) {
    try {
      // Create a unique filename
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
      const ext = path.extname(fileName) || ".jpg";
      const finalFileName = uniqueSuffix + ext;
      const fullPath = `${this.storagePath}/${finalFileName}`;

      // Create file reference
      const fileUpload = this.bucket.file(fullPath);

      // Set metadata
      const metadata = {
        contentType,
        metadata: {
          firebaseStorageDownloadTokens: uniqueSuffix,
        },
      };

      // Upload file
      await new Promise((resolve, reject) => {
        const blobStream = fileUpload.createWriteStream({
          metadata,
          resumable: false,
        });

        blobStream.on("error", reject);
        blobStream.on("finish", resolve);
        blobStream.end(fileBuffer);
      });

      // Make file public
      await fileUpload.makePublic();

      // Return public URL
      const publicUrl = `https://storage.googleapis.com/${this.bucket.name}/${fullPath}`;
      console.log("Firebase upload successful. URL:", publicUrl);
      return publicUrl;
    } catch (error) {
      console.error("❌ Firebase upload error:", error);
      throw error;
    }
  }

  async deleteFile(fileUrl) {
    try {
      // Extract file path from URL
      const urlObj = new URL(fileUrl);
      const filePath = urlObj.pathname.split(`/${this.bucket.name}/`)[1];

      if (!filePath) {
        throw new Error("Invalid file URL");
      }

      // Delete the file
      await this.bucket.file(filePath).delete();
      console.log(`File ${filePath} deleted successfully`);
      return true;
    } catch (error) {
      console.error("❌ Firebase delete error:", error);
      throw error;
    }
  }

  async testConnection() {
    try {
      const [metadata] = await this.bucket.getMetadata();
      console.log(`✅ Connected to Firebase Storage: ${metadata.name}`);
      console.log(`   - Location: ${metadata.location}`);
      console.log(`   - Storage class: ${metadata.storageClass}`);
      return true;
    } catch (error) {
      console.error("❌ Failed to connect to Firebase Storage:", error);
      return false;
    }
  }
}

module.exports = FirebaseStorageProvider;
