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

// // Mock authentication middleware - replace with actual auth in production
// app.use((req, res, next) => {
//   req.user = {businessId: "default"};
//   next();
// });

// Default route
app.get("/", (req, res) => {
  res.send("Biz-Tracker API is running");
});

// Flag to track if the app has been initialized
let isInitialized = false;
let initializationPromise = null;

// Function to setup the application
const setupApp = async () => {
  try {
    // Initialize providers first
    await initializeProviders();
    console.log("✅ All providers initialized successfully");

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

    // Routes - notice we're NOT using /api prefix here
    app.use("/assets", assetsRoutes);
    app.use("/items", itemsRoutes);
    app.use("/purchases", purchasesRoutes);
    app.use("/sales", salesRoutes);
    app.use("/relationships", relationshipsRoutes);

    app.use("/health", healthRoutes);

    // Error handler
    app.use(errorHandler);

    console.log("Application setup complete");

    // Start the server if running directly
    if (require.main === module) {
      const PORT = process.env.PORT || 3000;
      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
      });
    }
  } catch (error) {
    console.error("Failed to initialize application:", error);
    throw error;
  }
  
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    try {
      // Initialize providers first
      await initializeProviders();
      console.log("✅ All providers initialized successfully");

      // Import routes after provider initialization
      const salesRoutes = require("./routes/sales");
      const purchasesRoutes = require("./routes/purchases");
      const itemsRoutes = require("./routes/items");
      const healthRoutes = require("./routes/health");
      const assetsRoutes = require("./routes/assets"); 

      // Routes
      app.use("/api/sales", salesRoutes);
      app.use("/api/purchases", purchasesRoutes);
      app.use("/api/items", itemsRoutes);
      app.use("/api/health", healthRoutes);
      app.use("/api/assets", assetsRoutes); 

      // Error handler
      app.use(errorHandler);

      isInitialized = true;
      console.log("Application setup complete");
      
      return true;
    } catch (error) {
      console.error("Failed to initialize application:", error);
      initializationPromise = null; // Reset so we can try again
      throw error;
    }
  })();

  return initializationPromise;
};

// Start the server if running directly (for local development)
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  setupApp().then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  }).catch(err => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });
}

// Export the Express app as a Firebase Cloud Function with lazy initialization
exports.api = functions.https.onRequest(async (req, res) => {
  try {
    // Initialize the app on first request
    if (!isInitialized) {
      console.log("Initializing app on first request...");
      await setupApp();
    }
    // Then handle the request
    return app(req, res);
  } catch (error) {
    console.error("Error handling request:", error);
    res.status(500).send("Internal Server Error");
  }
});
