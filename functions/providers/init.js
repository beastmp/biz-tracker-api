const {createDatabaseProvider, createStorageProvider} = require("./index");
const config = require("../config/providers");

// Initialize database provider
const dbConfig = config.database.providers[config.database.default];
const dbProvider = createDatabaseProvider(config.database.default, dbConfig);

// Initialize storage provider
const storageConfig = config.storage.providers[config.storage.default];
const storageProvider = createStorageProvider(config.storage.default, storageConfig);

// Initialize both providers
const initializeProviders = async () => {
  try {
    await dbProvider.connect();
    await storageProvider.initialize();
    return true;
  } catch (error) {
    console.error("Failed to initialize providers:", error);
    throw error;
  }
};

module.exports = {
  dbProvider,
  storageProvider,
  initializeProviders,
};
