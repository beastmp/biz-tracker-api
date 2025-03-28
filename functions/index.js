/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {onRequest} = require("firebase-functions/v2/https");
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const {initializeProviders} = require("./providers/init");

const app = express();

// CORS configuration with specific origins
app.use(cors({
  origin: [
    "http://localhost:5173", // Vite dev server
    "http://localhost:5000", // Local Firebase emulator
    "https://biz-tracker-a5562.web.app",
    "https://biz-tracker-a5562.firebaseapp.com",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-requested-with"],
}));

app.use(express.json());

// Strip the /api prefix from incoming requests
app.use("/api", (req, res, next) => {
  req.url = req.url.replace(/^\/api/, ""); // Remove the /api prefix
  next();
});

// Initialize providers before starting the app
initializeProviders()
    .then(() => {
      console.log("✅ All providers initialized successfully");
    })
    .catch((err) => {
      console.error("❌ Failed to initialize providers:", err);
    });

// Mount routes under /api
app.use("/api/items", require("./routes/items"));
app.use("/api/sales", require("./routes/sales"));
app.use("/api/purchases", require("./routes/purchases"));

// Default route
app.get("/", (req, res) => {
  res.send("Biz-Tracker API is running");
});

// Export the Express app as a Firebase Cloud Function with CORS configuration
exports.api = onRequest({
  cors: [
    "http://localhost:5173",
    "http://localhost:5000",
    "https://biz-tracker-a5562.web.app",
    "https://biz-tracker-a5562.firebaseapp.com",
  ],
  maxInstances: 10,
  timeoutSeconds: 540,
}, app);
