/**
 * Storage Providers Module
 * Central export point for storage provider implementations
 * 
 * @module storage-providers
 */

const FirebaseStorageProvider = require("./firebase/provider");

// Note: Provider registration is now handled in provider.js

module.exports = {
  FirebaseStorageProvider,
};
