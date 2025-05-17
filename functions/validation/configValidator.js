/**
 * Provider Configuration Validator
 * Ensures all required configuration is present for providers
 */

/**
 * Validate database provider configuration
 * @param {Object} config - Configuration object
 * @param {string} providerName - Provider name
 * @return {Object} Validation results {valid, missingKeys}
 */
const validateDatabaseConfig = (config, providerName) => {
  const requiredKeys = {
    mongodb: ["DB_URI"],
    dynamodb: ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_REGION"],
    // Add other providers as they become available
  };

  return validateKeys(config, requiredKeys[providerName] || []);
};

/**
 * Validate storage provider configuration
 * @param {Object} config - Configuration object
 * @param {string} providerName - Provider name
 * @return {Object} Validation results {valid, missingKeys}
 */
const validateStorageConfig = (config, providerName) => {
  const requiredKeys = {
    firebase: ["STORAGE_BUCKET"],
    s3: ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY",
      "AWS_REGION", "STORAGE_BUCKET"],
    // Add other providers as they become available
  };

  return validateKeys(config, requiredKeys[providerName] || []);
};

/**
 * Validate if all required keys are present in config
 * @param {Object} config - Configuration object
 * @param {Array<string>} requiredKeys - List of required keys
 * @return {Object} Validation results {valid, missingKeys}
 * @private
 */
const validateKeys = (config, requiredKeys) => {
  const missingKeys = requiredKeys.filter((key) => !config[key]);
  return {
    valid: missingKeys.length === 0,
    missingKeys,
  };
};

module.exports = {
  validateDatabaseConfig,
  validateStorageConfig,
};
