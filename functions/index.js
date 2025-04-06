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
const {errorHandler} = require("./middleware");

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

// Initialize providers before setting up routes
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
    const salesRoutes = require("./routes/sales");
    const purchasesRoutes = require("./routes/purchases");
    const itemsRoutes = require("./routes/items");
    const healthRoutes = require("./routes/health");
    const assetsRoutes = require("./routes/assets"); // Add assets routes

    // Routes - notice we're NOT using /api prefix here
    app.use("/sales", salesRoutes);
    app.use("/purchases", purchasesRoutes);
    app.use("/items", itemsRoutes);
    app.use("/health", healthRoutes);
    app.use("/assets", assetsRoutes); // Register assets routes

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
};

// Call setup and export the app
setupApp()
    .then(() => console.log("API ready"))
    .catch((err) => console.error("API setup failed:", err));

// Export the Express app as a Firebase Cloud Function
exports.api = functions.https.onRequest(app);
