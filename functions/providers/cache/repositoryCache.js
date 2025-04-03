/**
 * Repository cache wrapper
 * Adds caching capability to any repository implementation
 */
class RepositoryCache {
  /**
   * Create a repository cache wrapper
   * @param {Object} repository Repository to wrap
   * @param {Object} options Cache options
   */
  constructor(repository, options = {}) {
    this.repository = repository;
    this.cache = new Map();
    this.options = {
      ttl: 60 * 1000, // Default 1 minute TTL
      idField: "_id", // Default ID field
      enabledMethods: ["findById", "findAll"], // Methods to cache
      ...options,
    };

    // Create proxy to intercept method calls
    return new Proxy(this, {
      get: (target, prop) => {
        // If the property exists on the cache wrapper, return it
        if (prop in target) {
          return target[prop];
        }

        // If it's a method on the repository, check if we should cache it
        if (typeof target.repository[prop] === "function") {
          if (target.options.enabledMethods.includes(prop)) {
            return (...args) => target.withCache(prop, ...args);
          }
          // Otherwise pass through to repository
          return target.repository[prop].bind(target.repository);
        }

        // Default to repository property
        return target.repository[prop];
      },
    });
  }

  /**
   * Execute repository method with caching
   * @param {string} method Method name
   * @param {...any} args Method arguments
   * @return {Promise<any>} Method result
   * @private
   */
  async withCache(method, ...args) {
    const cacheKey = this.getCacheKey(method, ...args);

    // Check if cached value exists and is fresh
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.options.ttl) {
        return cached.value;
      }
    }

    // Execute repository method
    const result = await this.repository[method](...args);

    // Cache the result
    this.cache.set(cacheKey, {
      value: result,
      timestamp: Date.now(),
    });

    return result;
  }

  /**
   * Generate a cache key for a method call
   * @param {string} method Method name
   * @param {...any} args Method arguments
   * @return {string} Cache key
   * @private
   */
  getCacheKey(method, ...args) {
    return `${method}:${JSON.stringify(args)}`;
  }

  /**
   * Clear the entire cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Invalidate cache for a specific entity
   * @param {string|Object} id Entity ID or object with ID
   */
  invalidate(id) {
    const entityId = typeof id === "object" ? id[this.options.idField] : id;

    // Clear by partial key match (any key containing this ID)
    for (const key of this.cache.keys()) {
      if (key.includes(entityId)) {
        this.cache.delete(key);
      }
    }
  }
}

module.exports = RepositoryCache;
