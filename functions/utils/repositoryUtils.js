/**
 * Repository utilities for easier access
 * to repositories throughout the application
 */
const {getProviderFactory} = require("../providers");

/**
 * Get the item repository
 * @return {ItemRepository} Item repository instance
 */
const getItemRepository = () => {
  return getProviderFactory().getItemRepository();
};

/**
 * Get the sales repository
 * @return {SalesRepository} Sales repository instance
 */
const getSalesRepository = () => {
  return getProviderFactory().getSalesRepository();
};

/**
 * Get the purchase repository
 * @return {PurchaseRepository} Purchase repository instance
 */
const getPurchaseRepository = () => {
  return getProviderFactory().getPurchaseRepository();
};

/**
 * Get the storage provider
 * @return {StorageProvider} Storage provider instance
 */
const getStorageProvider = () => {
  return getProviderFactory().getStorageProvider();
};

/**
 * Get the database provider
 * @return {DatabaseProvider} Database provider instance
 */
const getDatabaseProvider = () => {
  return getProviderFactory().getDatabaseProvider();
};

module.exports = {
  getItemRepository,
  getSalesRepository,
  getPurchaseRepository,
  getStorageProvider,
  getDatabaseProvider,
};
