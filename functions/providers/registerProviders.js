/**
 * Provider Registration Module
 *
 * This module handles the dynamic discovery and registration of various provider
 * implementations in the application. It scans directories to find provider
 * modules and loads them, allowing them to self-register with the ProviderRegistry.
 *
 * @module registerProviders
 * @requires fs
 * @requires path
 * @requires ./registry
 */
const fs = require("fs");
const path = require("path");
const ProviderRegistry = require("./registry");

/**
 * Track which modules have been loaded to prevent duplicate logs
 * @private
 * @type {Set<string>}
 */
const loadedModules = new Set();

/**
 * Silent module loading that just tracks the loaded module without logging
 * 
 * @param {string} modulePath - Path of the module being loaded
 * @returns {void}
 */
const trackModuleLoaded = (modulePath) => {
  if (!loadedModules.has(modulePath)) {
    loadedModules.add(modulePath);
  }
};

/**
 * Recursively loads provider modules from a directory structure.
 * Each provider module is responsible for registering itself with the registry.
 *
 * @param {string} dir - Directory path relative to the module's location or
 *                       absolute path if isRoot is false
 * @param {boolean} [isRoot=true] - Whether this is the root call or a recursive call
 * @param {string} [instanceId="main"] - Instance identifier for logging
 * @returns {void}
 */
const loadProvidersFromDirectory = (dir, isRoot = true, instanceId = "main") => {
  const fullPath = isRoot ? path.join(__dirname, dir) : dir;

  if (!fs.existsSync(fullPath)) {
    console.warn(`[${instanceId}] ⚠️ Provider directory not found: ${fullPath}`);
    return;
  }

  try {
    const items = fs.readdirSync(fullPath);

    for (const item of items) {
      const itemPath = path.join(fullPath, item);
      const stat = fs.statSync(itemPath);

      // If it's a directory, check for an index.js file inside it
      if (stat.isDirectory()) {
        const dirName = path.basename(itemPath);
        if (dirName !== "base" && dirName !== "interfaces") {
          // First look for provider.js files (primary provider implementation)
          const providerPath = path.join(itemPath, "provider.js");
          if (fs.existsSync(providerPath)) {
            try {
              const relativePath = path.relative(__dirname, providerPath).replace(/\\/g, "/");
              // Remove .js extension
              const modulePath = "./" + relativePath.replace(/\.js$/, "");
              require(modulePath);
              trackModuleLoaded(modulePath);
            } catch (error) {
              console.error(`[${instanceId}] ❌ Failed to load provider implementation ${providerPath}:`, error);
            }
          }
          
          // Then look for index.js files (provider modules)
          const indexPath = path.join(itemPath, "index.js");
          if (fs.existsSync(indexPath)) {
            try {
              const relativePath = path.relative(__dirname, indexPath).replace(/\\/g, "/");
              // Remove .js extension
              const modulePath = "./" + relativePath.replace(/\.js$/, "");
              require(modulePath);
              trackModuleLoaded(modulePath);
            } catch (error) {
              console.error(
                `[${instanceId}] ❌ Failed to load provider module ${indexPath}:`, 
                error
              );
            }
          }
          
          // Process subdirectories recursively
          loadProvidersFromDirectory(itemPath, false, instanceId);
        }
      } else if (stat.isFile() && item.endsWith(".js") && 
                 item !== "index.js" && 
                 !["config.js", "registry.js", "registerProviders.js"].includes(item)) {
        // Load individual provider files that might self-register
        try {
          const relativePath = path.relative(__dirname, itemPath).replace(/\\/g, "/");
          // Remove .js extension
          const modulePath = "./" + relativePath.replace(/\.js$/, "");
          require(modulePath);
          trackModuleLoaded(modulePath);
        } catch (error) {
          console.error(`[${instanceId}] ❌ Failed to load provider file ${itemPath}:`, error.message);
          console.error(error.stack);
        }
      }
    }
  } catch (error) {
    console.error(`[${instanceId}] ❌ Error reading provider directory ${fullPath}:`, error);
  }
};

/**
 * Scans and loads all available provider implementations from provider directories.
 * Each provider is responsible for registering itself with the registry.
 *
 * @param {string} [instanceId="main"] - Instance identifier for logging
 * @returns {void}
 */
const registerAllProviders = (instanceId = "main") => {
  console.log(`[${instanceId}] 🔄 Loading provider modules...`);

  // Get all provider type directories to load
  const providerDirs = fs.readdirSync(__dirname)
    .filter(dir => {
      const dirPath = path.join(__dirname, dir);
      return fs.statSync(dirPath).isDirectory() &&
             !["interfaces", "base", "repositories"].includes(dir);
    });

  // Dynamically load providers from all provider directories
  for (const dir of providerDirs) {
    loadProvidersFromDirectory(dir, true, instanceId);
  }

  // Only log provider summary once we've loaded everything
  const allProviders = ProviderRegistry.getAllProviders();
  
  if (Object.keys(allProviders).length === 0) {
    console.warn(`[${instanceId}] ⚠️ No providers were registered! Application will likely fail.`);
  } else {
    console.log(
      `[${instanceId}] 📊 Available providers: ${
        Object.entries(allProviders)
          .map(([type, providers]) => `${type}: [${Object.keys(providers).length}]`)
          .join(", ")
      }`
    );
    
    // Add a single summary log at the end rather than logging each module
    console.log(`[${instanceId}] ✅ Loaded ${loadedModules.size} provider modules successfully`);
  }
};

module.exports = {
  registerAllProviders,
};
