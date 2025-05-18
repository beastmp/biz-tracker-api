/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const functions = require("firebase-functions");
const express = require("express");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();

const {initializeProviders} = require("./providers");
const {errorHandler} = require("./validation");

// Create the Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// On your server
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*"); // Or your specific origin
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

// Default route
app.get("/", (req, res) => {
  res.send("Biz-Tracker API is running");
});

// Flag to track if the app has been initialized
let isInitialized = false;
let initializationPromise = null;
let initializationError = null;

/**
 * Sets up the application by initializing providers and routes
 * Uses a promise caching mechanism to prevent multiple initializations
 * 
 * @param {string} instanceId - A unique ID for the function instance
 * @returns {Promise<boolean>} A promise that resolves when initialization is complete
 */
const setupApp = async (instanceId) => {
  // Return existing promise if initialization is in progress
  if (initializationPromise) {
    console.log(`[${instanceId}] 🔄 Using existing initialization promise...`);
    return initializationPromise;
  }
  
  // If we had a previous initialization error, return it
  if (initializationError) {
    return Promise.reject(initializationError);
  }

  // Create and cache the initialization promise
  initializationPromise = (async () => {
    try {
      console.log(`[${instanceId}] 🚀 Starting application initialization...`);
      
      // Initialize providers first
      await initializeProviders();
      console.log(`[${instanceId}] ✅ All providers initialized successfully`);

      // Add request logging middleware
      app.use((req, res, next) => {
        console.log(`Incoming request: ${req.method} ${req.originalUrl}`);
        next();
      });

      // Import routes after provider initialization
      const assetsRoutes = require("./routes/assets");
      const itemsRoutes = require("./routes/items");
      const purchasesRoutes = require("./routes/purchases");
      const salesRoutes = require("./routes/sales");
      const relationshipsRoutes = require("./routes/relationships");
      const healthRoutes = require("./routes/health");

      // Routes - we're using consistent path patterns (no /api prefix)
      app.use("/assets", assetsRoutes);
      app.use("/items", itemsRoutes);
      app.use("/purchases", purchasesRoutes);
      app.use("/sales", salesRoutes);
      app.use("/relationships", relationshipsRoutes);
      app.use("/health", healthRoutes);

      // Add a diagnostic route to help with debugging
      app.get("/debug/status", (req, res) => {
        res.json({
          status: "operational",
          initialized: isInitialized,
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV || "development"
        });
      });

      // Error handler
      app.use(errorHandler);

      isInitialized = true;
      console.log(`[${instanceId}] 🏁 Application setup complete`);
      
      return true;
    } catch (error) {
      console.error(`[${instanceId}] ❌ Failed to initialize application:`, error);
      
      // Store the initialization error
      initializationError = error;
      
      // Add a special error route to expose initialization problems
      app.use("*", (req, res) => {
        res.status(500).json({
          error: "Server initialization failed",
          message: error.message,
          stack: process.env.NODE_ENV !== "production" ? error.stack : undefined,
          time: new Date().toISOString()
        });
      });
      
      initializationPromise = null; // Reset so we can try again
      throw error;
    }
  })();

  return initializationPromise;
};

// Start the server if running directly (for local development)
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  const instanceId = uuidv4().substring(0, 8);
  
  setupApp(instanceId).then(() => {
    app.listen(PORT, () => {
      console.log(`[${instanceId}] Server running on port ${PORT}`);
    });
  }).catch(err => {
    console.error(`[${instanceId}] Failed to start server:`, err);
    process.exit(1);
  });
}

/**
 * Firebase Cloud Function entry point with lazy initialization
 * Uses a cached initialization promise to prevent timeouts
 */
exports.api = functions.https.onRequest(async (req, res) => {
  const instanceId = uuidv4().substring(0, 8);
  
  try {
    // Initialize the app on first request
    if (!isInitialized) {
      console.log(`[${instanceId}] 🔄 Initializing app on first request...`);
      await setupApp(instanceId);
    }
    // Then handle the request
    return app(req, res);
  } catch (error) {
    console.error(`[${instanceId}] ❌ Error handling request:`, error);
    
    // Provide more detailed error information
    res.status(500).json({
      error: "Internal Server Error",
      message: error.message,
      path: req.path,
      method: req.method,
      time: new Date().toISOString(),
      // Only include stack trace in non-production environments
      stack: process.env.NODE_ENV !== "production" ? error.stack : undefined,
    });
  }
});
