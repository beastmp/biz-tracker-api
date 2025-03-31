/**
 * Registry for managing database and storage providers.
 * @class
 */
class ProviderRegistry {
  /**
   * Creates an instance of ProviderRegistry.
   * Initializes empty storage for database and storage providers.
   */
  constructor() {
    this.providers = {
      database: {},
      storage: {},
    };
  }

  /**
   * Register a provider implementation
   * @param {string} type - Provider type ('database' or 'storage')
   * @param {string} name - Provider name
   * @param {Object} providerInstance - Provider instance
   */
  register(type, name, providerInstance) {
    if (!this.providers[type]) {
      this.providers[type] = {};
    }
    this.providers[type][name] = providerInstance;
    console.log(`Registered ${type} provider: ${name}`);
  }

  /**
   * Get a provider by type and name
   * @param {string} type - Provider type
   * @param {string} name - Provider name
   * @return {Object|null} Provider instance or null
   */
  getProvider(type, name) {
    if (!this.providers[type] || !this.providers[type][name]) {
      console.warn(`Provider not found: ${type}/${name}`);
      return null;
    }
    return this.providers[type][name];
  }

  /**
   * List all registered providers
   * @return {Object} Registered providers by type
   */
  listProviders() {
    const result = {};

    for (const [type, providers] of Object.entries(this.providers)) {
      result[type] = Object.keys(providers);
    }

    return result;
  }
}

// Create and export a singleton instance
const registry = new ProviderRegistry();
module.exports = registry;
