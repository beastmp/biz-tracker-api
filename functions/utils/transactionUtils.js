const {getProviderFactory} = require("../providers");

/**
 * Execute a function within a database transaction
 * @param {Function} callback Function to execute with transaction object
 * @return {Promise<*>} Result of the callback function
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

module.exports = {
  withTransaction,
};
