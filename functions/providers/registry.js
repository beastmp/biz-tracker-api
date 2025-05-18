/**
 * Provider Registry Module
 *
 * This module implements a registry pattern for managing different provider
 * implementations throughout the application. It allows for runtime registration
 * and retrieval of various provider types (database, storage, monitoring, etc.)
 * and their specific implementations.
 *
 * @module ProviderRegistry
 */

/**
 * Internal storage for registered providers, organized by type and name
 * @private
 * @type {Object.<string, Object.<string, Object>>}
 */
const registry = {
  database: {},
  storage: {},
  monitoring: {},
  cache: {},
};

/**
 * Track registrations to prevent duplicate logs for the same provider
 * @private
 * @type {Set<string>}
 */
const registeredProviders = new Set();

/**
 * Provider Registry singleton that manages the registration and retrieval
 * of provider implementations
 *
 * @class ProviderRegistry
 */
class ProviderRegistry {
  /**
   * Register a provider implementation in the registry
   *
   * @static
   * @param {string} type - Provider category (database, storage, etc.)
   * @param {string} name - Unique identifier for the provider implementation
   * @param {Object} provider - The provider implementation
   * @param {string} [instanceId="main"] - Instance identifier for logging
   * @throws {Error} If required parameters are missing
   * @return {void}
   */
  static register(type, name, provider, instanceId = "main") {
    if (!type || !name || !provider) {
      throw new Error("Type, name, and provider are required for registration");
    }

    if (!registry[type]) {
      registry[type] = {};
    }

    // Generate a unique key for this provider registration
    const providerKey = `${type}-${name}`;

    // Store the provider
    registry[type][name] = provider;

    // Only log if we haven't seen this provider before
    if (!registeredProviders.has(providerKey)) {
      console.log(
        `[${instanceId}] 📝 Provider '${name}' registered for type '${type}'`
      );
      registeredProviders.add(providerKey);
    }
  }

  /**
   * Retrieve a specific provider implementation by type and name
   *
   * @static
   * @param {string} type - Provider category to look in
   * @param {string} name - Name of the provider to retrieve
   * @throws {Error} If required parameters are missing
   * @return {Object|null} The provider implementation or null if not found
   */
  static getProvider(type, name) {
    if (!type || !name) {
      throw new Error("Type and name are required to get a provider");
    }

    return (registry[type] && registry[type][name]) || null;
  }

  /**
   * Get all provider implementations of a specific type
   *
   * @static
   * @param {string} type - Provider category to retrieve
   * @throws {Error} If type parameter is missing
   * @return {Object.<string, Object>} Object mapping provider names to implementations
   */
  static getProviders(type) {
    if (!type) {
      throw new Error("Type is required to get providers");
    }

    return registry[type] || {};
  }

  /**
   * Get a summary of all registered providers organized by type
   *
   * @static
   * @return {Object.<string, string[]>} Object mapping provider types to arrays
   * of provider names
   */
  static getAllProviders() {
    const result = {};

    Object.keys(registry).forEach((type) => {
      result[type] = Object.keys(registry[type]);
    });

    return result;
  }

  /**
   * Check if a specific provider is registered
   *
   * @static
   * @param {string} type - Provider category to check
   * @param {string} name - Name of the provider to check for
   * @return {boolean} True if the provider is registered, false otherwise
   */
  static isRegistered(type, name) {
    if (!type || !name) {
      return false;
    }

    return !!(registry[type] && registry[type][name]);
  }
}

module.exports = ProviderRegistry;
