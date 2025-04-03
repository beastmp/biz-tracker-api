const ProviderFactory = require("./providerFactory");
const registerProvidersModule = require("./registerProviders");

// Make sure we correctly extract the function
const registerAllProviders = registerProvidersModule.registerAllProviders;

// Declare the instance variable
let providerFactoryInstance = null;

/**
 * Get the provider factory instance
 * @return {ProviderFactory} Provider factory instance
 * @throws {Error} If providers haven't been initialized
 */
const getProviderFactoryInstance = () => {
  if (!providerFactoryInstance) {
    throw new Error(`Providers have not been initialized.
      Call initializeProviders() first`);
  }
  return providerFactoryInstance;
};

// Export the factory before registering providers
module.exports = {
  getProviderFactory: getProviderFactoryInstance,
  initializeProviders: async () => {
    try {
      // Register all available providers
      registerAllProviders();

      // Create and initialize provider factory
      providerFactoryInstance = new ProviderFactory();
      await providerFactoryInstance.initializeProviders();

      return providerFactoryInstance;
    } catch (error) {
      console.error("Failed to initialize providers:", error);
      throw error;
    }
  },
};
