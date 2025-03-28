require("dotenv").config();

// Database provider configs
const databaseConfig = {
  // Default provider
  default: process.env.DATABASE_PROVIDER || "mongodb",

  // Provider-specific configurations
  providers: {
    mongodb: {
      uri: process.env.MONGODB_URI,
      options: {
        serverSelectionTimeoutMS: 60000,
        socketTimeoutMS: 120000,
        connectTimeoutMS: 60000,
      },
    },
    // Add DynamoDB config here when needed
  },
};

// Storage provider configs
const storageConfig = {
  // Default provider
  default: process.env.STORAGE_PROVIDER || "firebase",

  // Provider-specific configurations
  providers: {
    firebase: {
      bucketName: process.env.STORAGE_BUCKET,
      storagePath: "inventory",
      // Service account path for local development
      serviceAccount: process.env.NODE_ENV === "development" ?
        require("../../firebase-credentials.json") : null,
    },
    // Add S3 config here when needed
  },
};

module.exports = {
  database: databaseConfig,
  storage: storageConfig,
};
