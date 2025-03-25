/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {onRequest} = require("firebase-functions/v2/https");
// const logger = require("firebase-functions/logger");

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

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

// Database connection
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 60000, // Increase from default 10000ms
  socketTimeoutMS: 120000, // Increase socket timeout
  connectTimeoutMS: 60000, // Connection timeout
}).then(() => {
  console.log("✅ Connected to MongoDB");
}).catch((err) => {
  console.error("❌ MongoDB connection error:", err);
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
