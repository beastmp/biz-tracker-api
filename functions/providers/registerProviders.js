/**
 * Handles provider registration with the registry
 */
const fs = require("fs");
const path = require("path");
const ProviderRegistry = require("./registry");

/**
 * Dynamically loads all providers from a directory and its subdirectories
 * @param {string} dir Directory to scan for providers
 * @param {boolean} isRoot Whether this is the root directory call
 */
const loadProvidersFromDirectory = (dir, isRoot = true) => {
  const fullPath = isRoot ? path.join(__dirname, dir) : dir;

  if (!fs.existsSync(fullPath)) {
    console.warn(`Provider directory not found: ${fullPath}`);
    return;
  }

  try {
    const items = fs.readdirSync(fullPath);

    for (const item of items) {
      const itemPath = path.join(fullPath, item);
      const stat = fs.statSync(itemPath);

      // Handle directories recursively (except for 'base' and 'interfaces')
      if (stat.isDirectory()) {
        const dirName = path.basename(itemPath);
        if (dirName !== "base" && dirName !== "interfaces") {
          // Process subdirectories
          loadProvidersFromDirectory(itemPath, false);

          // Also try to load index.js in subdirectories
          const indexPath = path.join(itemPath, "index.js");
          if (fs.existsSync(indexPath)) {
            try {
              const relativePath =
                path.relative(__dirname, indexPath).replace(/\\/g, "/");
              // Remove .js extension
              const modulePath = "./" + relativePath.replace(/\.js$/, "");
              require(modulePath);
              console.log(`Loaded provider module: ${modulePath}`);
            } catch (error) {
              console.warn(`Failed to load provider index module
                ${indexPath}:`, error.message);
            }
          }
        }
      } else if (stat.isFile() && item.endsWith(".js") && item !== "index.js") {
        try {
          const relativePath =
            path.relative(__dirname, itemPath).replace(/\\/g, "/");
          // Remove .js extension
          const modulePath = "./" + relativePath.replace(/\.js$/, "");
          require(modulePath);
          console.log(`Loaded provider: ${modulePath}`);
        } catch (error) {
          console.warn(`Failed to load provider ${itemPath}:`, error.message);
        }
      }
    }
  } catch (error) {
    console.error(`Error reading provider directory ${fullPath}:`, error);
  }
};

/**
 * Register all available providers with the registry
 */
const registerAllProviders = () => {
  console.log("Registering providers...");

  // Dynamically load providers from directories
  loadProvidersFromDirectory("database");
  loadProvidersFromDirectory("storage");

  console.log("All providers registered successfully");
  console.log("Available providers:", ProviderRegistry.listProviders());
};

module.exports = {
  registerAllProviders,
};
