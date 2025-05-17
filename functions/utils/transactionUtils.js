/**
 * Transaction Utilities Module
 *
 * This module provides utility functions for working with database transactions
 * and standardized error handling. It helps ensure data consistency for operations
 * that modify multiple entities and provides a consistent approach to error handling
 * throughout the application.
 *
 * @module transactionUtils
 * @requires ../providers/providerFactory
 * @requires ../validation/errors
 */

const {getProviderFactory} = require("../providers/providerFactory");
const {AppError} = require("../validation/errors");

/**
 * Executes a function within a database transaction, automatically handling
 * commit and rollback operations based on whether the function succeeds or fails.
 *
 * @async
 * @param {Function} callback - Function to execute within the transaction
 * @param {Object} callback.transaction - Transaction object passed to the callback
 * @return {Promise<*>} Result returned by the callback function
 * @throws {Error} Re-throws any error that occurs in the callback after rolling back
 *
 * @example
 * // Using withTransaction to update multiple entities atomically
 * const result = await withTransaction(async (transaction) => {
 *   const item = await itemRepository.update(itemId, itemData, transaction);
 *   await relationshipRepository.create(relationshipData, transaction);
 *   return item;
 * });
 */
const withTransaction = async (callback) => {
  const transactionProvider = getProviderFactory().getTransactionProvider();

  // Use the provider's withTransaction method
  // if available (from BaseTransactionProvider)
  if (typeof transactionProvider.withTransaction === "function") {
    return await transactionProvider.withTransaction(callback);
  }

  // Fallback implementation if withTransaction is not available on the provider
  // Start a transaction
  const transaction = await transactionProvider.startTransaction();

  try {
    // Execute the callback with the transaction object
    const result = await callback(transaction);

    // If successful, commit the transaction
    await transactionProvider.commitTransaction(transaction);

    return result;
  } catch (error) {
    // If an error occurred, roll back the transaction
    await transactionProvider.rollbackTransaction(transaction);

    // Re-throw the error
    throw error;
  }
};

/**
 * Creates a transactional version of a repository method that automatically
 * wraps the method execution in a transaction.
 *
 * @param {Object} repository - Repository instance containing the method
 * @param {string} methodName - Name of the method to make transactional
 * @throws {Error} When the specified method doesn't exist on the repository
 * @return {Function} Transactional version of the method that automatically
 *                   creates and manages a transaction
 *
 * @example
 * // Making a single repository method transactional
 * repository.createTransactional = createTransactionalMethod(repository, 'create');
 * const item = await repository.createTransactional(itemData);
 */
const createTransactionalMethod = (repository, methodName) => {
  const originalMethod = repository[methodName];

  if (typeof originalMethod !== "function") {
    throw new Error(`Method '${methodName}' does not exist on repository`);
  }

  return async (...args) => {
    return withTransaction(async (transaction) => {
      // Add transaction as the last argument if not already provided
      if (args.length > 0 && args[args.length - 1] === transaction) {
        return originalMethod.apply(repository, args);
      } else {
        return originalMethod.apply(repository, [...args, transaction]);
      }
    });
  };
};

/**
 * Creates a version of a repository with multiple methods wrapped in transactions.
 * This is a higher-level utility that applies createTransactionalMethod to
 * multiple methods at once.
 *
 * @param {Object} repository - Repository instance to enhance
 * @param {Array<string>} methodNames - Array of method names to make transactional
 * @return {Object} A new repository object with the specified methods made transactional
 *
 * @example
 * // Making multiple repository methods transactional
 * const transactionalRepo = makeRepositoryTransactional(itemRepository, [
 *   'create', 'update', 'delete'
 * ]);
 * const item = await transactionalRepo.create(itemData);
 */
const makeRepositoryTransactional = (repository, methodNames) => {
  const transactionalRepository = Object.create(repository);

  methodNames.forEach((methodName) => {
    transactionalRepository[methodName] = createTransactionalMethod(
        repository,
        methodName,
    );
  });

  return transactionalRepository;
};

/**
 * Creates a transaction function that handles operations involving multiple
 * entity repositories. The resulting function creates a context object with
 * all repositories and the transaction object.
 *
 * @param {Array<Object>} repositories - Array of repository instances to include
 * @return {Function} Function that executes operations with all repositories in a transaction
 *
 * @example
 * // Creating a multi-entity transaction
 * const performComplexOperation = createMultiEntityTransaction([
 *   itemRepository,
 *   relationshipRepository
 * ]);
 *
 * // Using the created function
 * const result = await performComplexOperation(async (context) => {
 *   const { transaction, repositories } = context;
 *   const item = await repositories.ItemRepository.create(data, transaction);
 *   // ... other operations
 *   return item;
 * });
 */
const createMultiEntityTransaction = (repositories) => {
  return async (operationFn) => {
    return withTransaction(async (transaction) => {
      // Create context object with repositories and transaction
      const context = {
        transaction,
        repositories: {},
      };

      // Add all repositories to context
      repositories.forEach((repo, index) => {
        const name = repo.constructor.name || `repository${index}`;
        context.repositories[name] = repo;
      });

      // Execute the operation function with context
      return operationFn(context);
    });
  };
};

/**
 * Wraps a repository method with standardized error handling to transform
 * various error types into consistent AppError instances. This ensures that
 * all errors across the application have a consistent format and contain
 * appropriate HTTP status codes.
 *
 * @param {Function} method - Repository method to wrap with error handling
 * @param {string} operationName - Name of the operation for error messages
 * @param {string} entityType - Type of entity being operated on
 * @return {Function} Wrapped method with standardized error handling
 *
 * @example
 * // Adding error handling to a repository method
 * repository.safeCreate = withErrorHandling(
 *   repository.create.bind(repository),
 *   'create',
 *   'Item'
 * );
 * try {
 *   const item = await repository.safeCreate(itemData);
 * } catch (error) {
 *   // Error will be an AppError instance with appropriate status code
 * }
 */
const withErrorHandling = (method, operationName, entityType) => {
  return async (...args) => {
    try {
      return await method(...args);
    } catch (error) {
      console.error(`Error in ${operationName} for ${entityType}:`, error);

      // If it's already an AppError, just rethrow it
      if (error instanceof AppError) {
        throw error;
      }

      // For MongoDB duplicate key errors
      if (error.code === 11000) {
        throw new AppError(
            `${entityType} with duplicate ${Object.keys(error.keyValue)[0]} exists`,
            409,
        );
      }

      // For validation errors
      if (error.name === "ValidationError") {
        throw new AppError(
            `Invalid ${entityType.toLowerCase()} data: ${error.message}`,
            400,
        );
      }

      // For connection errors
      if (error.name === "MongoNetworkError" ||
          error.name === "MongoTimeoutError") {
        throw new AppError(
            `Database connection error: ${error.message}`,
            503,
        );
      }

      // Default error
      throw new AppError(
          `Failed to ${operationName} ${entityType.toLowerCase()}: ${error.message}`,
          500,
      );
    }
  };
};

/**
 * Creates a version of a repository with multiple methods wrapped in standardized
 * error handling. Similar to makeRepositoryTransactional but for error handling.
 *
 * @param {Object} repository - Repository instance to enhance
 * @param {Array<string>} methodNames - Array of method names to add error handling to
 * @param {string} entityType - Type of entity this repository handles (e.g., 'Item')
 * @return {Object} A new repository object with the specified methods wrapped in
 *                 error handling
 *
 * @example
 * // Making multiple repository methods use standardized error handling
 * const safeRepo = makeRepositoryErrorHandled(itemRepository, [
 *   'create', 'update', 'delete'
 * ], 'Item');
 *
 * // All errors will now be properly formatted AppError instances
 * const item = await safeRepo.create(itemData);
 */
const makeRepositoryErrorHandled = (repository, methodNames, entityType) => {
  const errorHandledRepository = Object.create(repository);

  methodNames.forEach((methodName) => {
    const operationName = methodName
        .replace(/^(create|update|delete|get|find)/, (match) => match)
        .replace(/([A-Z])/g, " $1")
        .toLowerCase()
        .trim();

    errorHandledRepository[methodName] = withErrorHandling(
        repository[methodName].bind(repository),
        operationName,
        entityType,
    );
  });

  return errorHandledRepository;
};

/**
 * Combines both transaction support and error handling for repository methods.
 * This is a convenience method that applies both makeRepositoryTransactional
 * and makeRepositoryErrorHandled to create a repository that has both atomic
 * operations and consistent error handling.
 *
 * @param {Object} repository - Repository instance to enhance
 * @param {Array<string>} methodNames - Array of method names to enhance
 * @param {string} entityType - Type of entity this repository handles (e.g., 'Item')
 * @return {Object} Repository with both transaction support and error handling
 *
 * @example
 * // Creating a fully enhanced repository with transactions and error handling
 * const enhancedRepo = enhanceRepository(
 *   itemRepository,
 *   ['create', 'update', 'delete', 'batchUpdate'],
 *   'Item'
 * );
 *
 * // Methods now use transactions and have standardized error handling
 * const item = await enhancedRepo.create(itemData);
 */
const enhanceRepository = (repository, methodNames, entityType) => {
  // First add transactions
  const transactionalRepo = makeRepositoryTransactional(repository, methodNames);

  // Then add error handling
  return makeRepositoryErrorHandled(transactionalRepo, methodNames, entityType);
};

module.exports = {
  withTransaction,
  createTransactionalMethod,
  makeRepositoryTransactional,
  createMultiEntityTransaction,
  withErrorHandling,
  makeRepositoryErrorHandled,
  enhanceRepository,
};
