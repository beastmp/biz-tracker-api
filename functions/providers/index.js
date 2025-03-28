const MongoDBProvider = require("./database/mongodb");
const FirebaseStorageProvider = require("./storage/firebase");

/**
 * Factory to create database providers
 */
const createDatabaseProvider = (type, config) => {
  switch (type.toLowerCase()) {
    case "mongodb":
      return new MongoDBProvider(config);
    // Add other database providers here
    // case 'dynamodb':
    //   return new DynamoDBProvider(config);
    default:
      throw new Error(`Unsupported database provider: ${type}`);
  }
};

/**
 * Factory to create storage providers
 */
const createStorageProvider = (type, config) => {
  switch (type.toLowerCase()) {
    case "firebase":
      return new FirebaseStorageProvider(config);
    // Add other storage providers here
    // case 's3':
    //   return new S3StorageProvider(config);
    default:
      throw new Error(`Unsupported storage provider: ${type}`);
  }
};

module.exports = {
  createDatabaseProvider,
  createStorageProvider,
};
