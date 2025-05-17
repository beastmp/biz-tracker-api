/**
 * Provider Configuration Module
 *
 * This module centralizes all configuration settings for database and storage
 * providers. It validates required environment variables, provides sensible
 * defaults for optional settings, and exports a unified configuration object.
 *
 * @module config
 * @requires dotenv
 */
require("dotenv").config();

/**
 * List of environment variables that must be defined for the application
 * to function correctly
 * @type {string[]}
 */
const requiredVars = [
  "DB_URI",
  "DB_PROVIDER",
  "STORAGE_PROVIDER",
  "STORAGE_BUCKET",
];

/**
 * Default configuration values for optional settings
 * @type {Object}
 */
const defaultConfig = {
  DB_PROVIDER: "mongodb",
  STORAGE_PROVIDER: "firebase",
  NODE_ENV: "development",
  PORT: 3000,
  SKIP_AUTH: false,
  ENABLE_TRANSACTION_LOGGING: false,
};

// Check for missing required variables
const missingVars = requiredVars.filter((varName) => !process.env[varName]);
if (missingVars.length > 0) {
  console.error(`❌ Missing required environment variables:
    ${missingVars.join(", ")}`);
  console.error("Please check your .env file or environment configuration");
  process.exit(1);
}

/**
 * Complete application configuration with values from environment variables
 * and defaults for missing optional values
 * @type {Object}
 */
const config = {
  // Database configuration
  DB_URI: process.env.DB_URI,
  DB_PROVIDER: process.env.DB_PROVIDER || defaultConfig.DB_PROVIDER,

  // Storage configuration
  STORAGE_PROVIDER: process.env.STORAGE_PROVIDER ||
    defaultConfig.STORAGE_PROVIDER,
  STORAGE_BUCKET: process.env.STORAGE_BUCKET,

  // AWS S3 configuration (if using S3 provider)
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  AWS_REGION: process.env.AWS_REGION || "us-east-1",

  // Application configuration
  NODE_ENV: process.env.NODE_ENV || defaultConfig.NODE_ENV,
  PORT: parseInt(process.env.PORT || defaultConfig.PORT, 10),

  // Security configuration
  SKIP_AUTH: process.env.SKIP_AUTH === "true" || defaultConfig.SKIP_AUTH,

  // Feature flags
  ENABLE_TRANSACTION_LOGGING:
    process.env.ENABLE_TRANSACTION_LOGGING === "true" ||
      defaultConfig.ENABLE_TRANSACTION_LOGGING,
};

// Validate provider-specific required config
if (config.STORAGE_PROVIDER === "s3") {
  const requiredS3Vars = ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY",
    "STORAGE_BUCKET"];
  const missingS3Vars = requiredS3Vars.filter((varName) =>
    !process.env[varName]);

  if (missingS3Vars.length > 0) {
    console.warn(`⚠️ Using S3 storage provider but
      missing: ${missingS3Vars.join(", ")}`);
    console.warn(`S3 storage operations may fail.
      Please check your configuration.`);
  }
}

if (config.STORAGE_PROVIDER === "firebase" &&
    !process.env.STORAGE_BUCKET) {
  console.warn(`⚠️ Using Firebase storage provider
    but STORAGE_BUCKET is not set`);
  console.warn(`Firebase storage operations may fail.
    Please check your configuration.`);
}

module.exports = config;
