/**
 * Repository Factory Module
 *
 * This module implements a factory pattern for creating and managing repository
 * instances with proper dependency injection. It centralizes the creation of
 * repositories and ensures all dependencies between repositories are properly
 * configured.
 *
 * @module repositoryFactory
 * @requires ./registry
 * @requires ./providerFactory
 * @requires ./config
 * @requires ../utils/transactionUtils
 */
const ProviderFactory = require("./providerFactory");
const config = require("./config");
const {
  enhanceRepository,
} = require("../utils/transactionUtils");

/**
 * In-memory cache for storing repository instances to avoid recreating them
 * @type {Map<string, Object>}
 * @private
 */
const repositoryCache = new Map();

/**
 * Common repository methods that should use transactions when available
 * This serves as a default list of method names to check for in repositories
 * @type {string[]}
 * @private
 */
const commonTransactionalMethodNames = [
  "create", "update", "delete", "batchUpdate", "addItems", "removeItems", 
  "updateInventory", "createDerivedItems", "processShipment", "updatePaymentStatus",
  "linkAssets", "unlinkAssets", "processReceive", "depreciate"
];

/**
 * Determines which methods in a repository should use transactions
 * 
 * @param {Object} repository - The repository instance to analyze
 * @param {string} repoType - The type of repository (e.g., "item", "purchase")
 * @returns {string[]} - Array of method names that should be transactional
 * @private
 */
const determineTransactionalMethods = (repository, repoType) => {
  // Start with common methods that modify data
  const methodsToCheck = [...commonTransactionalMethodNames];
  
  // Add repository-specific methods that might exist
  if (repoType === "relationship") {
    methodsToCheck.push("createRelationship", "updateRelationship", "deleteRelationship");
  }
  
  // Filter the list to only include methods that actually exist on the repository
  return methodsToCheck.filter(methodName => 
    typeof repository[methodName] === "function"
  );
};

/**
 * Gets the provider factory instance for a specific provider type and name
 *
 * @param {string} [type="database"] - Provider type
 * @param {string} [name=null] - Provider name, uses configured default if null
 * @return {Object} Provider factory instance
 */
const getProviderFactory = (type = "database", name = null) => {
  // Use configured provider type if none specified
  const providerName = name || config.DATABASE_TYPE || "mongodb";

  // Get provider from registry
  return ProviderFactory.getDatabaseProvider(providerName);
};

/**
 * Get a repository by type with dependency injection
 * @param {string} type - Repository type (asset, item, purchase, etc.)
 * @param {Object} options - Additional options
 * @param {boolean} useCache - Whether to use cached repository instances
 * @return {Object} Repository instance
 */
const getRepository = (type, options = {}, useCache = true) => {
  // Create cache key based on type and options
  const cacheKey = `${type}-${JSON.stringify(options)}`;

  // Return cached instance if available
  if (useCache && repositoryCache.has(cacheKey)) {
    return repositoryCache.get(cacheKey);
  }

  // Get provider factory
  const providerFactory = getProviderFactory();

  // Create repository using factory
  let repository;
  const repoType = type.toLowerCase();

  switch (repoType) {
    case "purchase":
      repository = providerFactory.createPurchaseRepository(null, options);
      break;
    case "item":
      repository = providerFactory.createItemRepository(null, options);
      break;
    case "sale":
      repository = providerFactory.createSaleRepository(null, options);
      break;
    case "asset":
      repository = providerFactory.createAssetRepository(null, options);
      break;
    case "relationship":
      repository = providerFactory.createRelationshipRepository(null, options);
      break;
    default:
      throw new Error(`Unknown repository type: ${type}`);
  }

  // Enhance repository with error handling and transactions if methods defined
  const transactionalMethods = determineTransactionalMethods(repository, repoType);
  if (transactionalMethods.length > 0) {
    repository = enhanceRepository(
        repository,
        transactionalMethods,
        type,
    );
  }

  // Cache repository instance
  if (useCache) {
    repositoryCache.set(cacheKey, repository);
  }

  return repository;
};

/**
 * Get a purchase repository with dependencies injected
 * @param {Object} options - Additional options
 * @return {Object} Purchase repository
 */
const getPurchaseRepository = (options = {}) => {
  const repository = getRepository("purchase", options);

  // Inject dependencies if they're not already set
  if (!repository.itemRepository) {
    const itemRepo = getRepository("item", options);
    repository.setItemRepository(itemRepo);
  }

  if (!repository.assetRepository) {
    const assetRepo = getRepository("asset", options);
    repository.setAssetRepository(assetRepo);
  }

  if (!repository.relationshipRepository) {
    const relationshipRepo = getRepository("relationship", options);
    repository.setRelationshipRepository(relationshipRepo);
  }

  if (!repository.transactionProvider) {
    const providerFactory = getProviderFactory();
    const transactionProvider = providerFactory.getTransactionProvider();
    repository.setTransactionProvider(transactionProvider);
  }

  return repository;
};

/**
 * Get an item repository with dependencies injected
 * @param {Object} options - Additional options
 * @return {Object} Item repository
 */
const getItemRepository = (options = {}) => {
  const repository = getRepository("item", options);

  // Inject dependencies
  if (!repository.relationshipRepository) {
    const relationshipRepo = getRepository("relationship", options);
    repository.setRelationshipRepository(relationshipRepo);
  }

  if (!repository.transactionProvider) {
    const providerFactory = getProviderFactory();
    const transactionProvider = providerFactory.getTransactionProvider();
    repository.setTransactionProvider(transactionProvider);
  }

  return repository;
};

/**
 * Get a sale repository with dependencies injected
 * @param {Object} options - Additional options
 * @return {Object} Sale repository
 */
const getSaleRepository = (options = {}) => {
  const repository = getRepository("sale", options);

  // Inject dependencies
  if (!repository.itemRepository) {
    const itemRepo = getRepository("item", options);
    repository.setItemRepository(itemRepo);
  }

  if (!repository.relationshipRepository) {
    const relationshipRepo = getRepository("relationship", options);
    repository.setRelationshipRepository(relationshipRepo);
  }

  if (!repository.transactionProvider) {
    const providerFactory = getProviderFactory();
    const transactionProvider = providerFactory.getTransactionProvider();
    repository.setTransactionProvider(transactionProvider);
  }

  return repository;
};

/**
 * Get an asset repository with dependencies injected
 * @param {Object} options - Additional options
 * @return {Object} Asset repository
 */
const getAssetRepository = (options = {}) => {
  const repository = getRepository("asset", options);

  // Inject dependencies
  if (!repository.relationshipRepository) {
    const relationshipRepo = getRepository("relationship", options);
    repository.setRelationshipRepository(relationshipRepo);
  }

  if (!repository.purchaseRepository) {
    const purchaseRepo = getRepository("purchase", options);
    repository.setPurchaseRepository(purchaseRepo);
  }

  if (!repository.transactionProvider) {
    const providerFactory = getProviderFactory();
    const transactionProvider = providerFactory.getTransactionProvider();
    repository.setTransactionProvider(transactionProvider);
  }

  return repository;
};

/**
 * Get a relationship repository with dependencies injected
 * 
 * @param {Object} options - Additional options
 * @return {Object} Relationship repository
 */
const getRelationshipRepository = (options = {}) => {
  const repository = getRepository("relationship", options);

  try {
    // Register entity repositories that relationship repository needs to validate
    repository.registerEntityRepository("Purchase", getPurchaseRepository(options));
    repository.registerEntityRepository("Item", getItemRepository(options));
    repository.registerEntityRepository("Asset", getAssetRepository(options));
    repository.registerEntityRepository("Sale", getSaleRepository(options));

    // Inject transaction provider safely
    if (!repository.transactionProvider) {
      // Get the transaction provider directly from ProviderFactory
      // This avoids dependency cycles in our factory methods
      if (ProviderFactory && typeof ProviderFactory.getTransactionProvider === "function") {
        const transactionProvider = ProviderFactory.getTransactionProvider();
        repository.setTransactionProvider(transactionProvider);
      } else {
        // Create a no-op transaction provider as fallback
        repository.setTransactionProvider({
          beginTransaction: async () => null,
          commitTransaction: async () => true,
          rollbackTransaction: async () => true,
          isTransactionActive: () => false,
        });
      }
    }
  } catch (error) {
    console.warn(`Warning: Error while setting up relationship repository dependencies: ${error.message}`);
    // Continue with the repository even if dependency injection fails
  }

  return repository;
};

/**
 * Initialize the repository system
 * Ensures all dependencies are properly set up
 * @return {Object} Object containing all repository instances
 */
const initializeRepositories = () => {
  // Create repositories with dependencies
  const relationshipRepo = getRelationshipRepository();
  const purchaseRepo = getPurchaseRepository();
  const itemRepo = getItemRepository();
  const saleRepo = getSaleRepository();
  const assetRepo = getAssetRepository();

  // Perform any additional initialization as needed
  console.log("Repository system initialized successfully");

  return {
    purchaseRepository: purchaseRepo,
    itemRepository: itemRepo,
    saleRepository: saleRepo,
    assetRepository: assetRepo,
    relationshipRepository: relationshipRepo,
  };
};

/**
 * Clear the repository cache
 * Used when reconfiguring the system
 */
const clearRepositoryCache = () => {
  repositoryCache.clear();
};

module.exports = {
  getProviderFactory,
  getRepository,
  getPurchaseRepository,
  getItemRepository,
  getSaleRepository,
  getAssetRepository,
  getRelationshipRepository,
  initializeRepositories,
  clearRepositoryCache,
};
