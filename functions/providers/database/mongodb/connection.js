/**
 * MongoDB Connection Module
 * 
 * Handles connecting to MongoDB with retry logic and proper connection lifecycle management.
 * 
 * @module mongodb-connection
 * @requires mongoose
 * @requires ../config
 */
const mongoose = require("mongoose");
const config = require("../../config");

// Track connection state
let isConnected = false;
let connectionAttempts = 0;
const MAX_RETRIES = 5;
const RETRY_INTERVAL = 5000; // 5 seconds

/**
 * Track event timestamps to prevent duplicate logs
 * @type {Object.<string, number>}
 */
const eventTimestamps = {
  "connected": 0,
  "error": 0,
  "disconnected": 0,
  "reconnected": 0
};

// Minimum time between same event logs (in milliseconds)
const EVENT_LOG_COOLDOWN = 1000;

// Log level: 0 = none, 1 = essential, 2 = verbose
const LOG_LEVEL = 1;

/**
 * Connect to MongoDB with retry logic
 * 
 * @param {string} [instanceId="main"] - Instance identifier for logging
 * @return {Promise<mongoose.Connection>} Mongoose connection object
 */
const connectToMongo = async (instanceId = "main") => {
  // If already connected, return the existing connection
  if (isConnected && mongoose.connection.readyState === 1) {
    if (LOG_LEVEL > 0) {
      console.log(`[${instanceId}] ✅ Using existing MongoDB connection`);
    }
    return mongoose.connection;
  }

  // Updated connection options - removed deprecated options
  const options = {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000,
    maxPoolSize: 50,
  };

  try {
    if (LOG_LEVEL > 0) {
      console.log(`[${instanceId}] 🔄 Connecting to MongoDB...`);
    }

    // Attach event handlers before connecting
    setupConnectionHandlers(instanceId);

    // Connect to MongoDB
    await mongoose.connect(config.DB_URI, options);

    isConnected = true;
    connectionAttempts = 0;
    
    // Only log on successful connection if LOG_LEVEL > 0
    if (LOG_LEVEL > 0) {
      console.log(`[${instanceId}] ✅ MongoDB connected successfully`);
    }

    return mongoose.connection;
  } catch (error) {
    connectionAttempts++;
    console.error(
      `[${instanceId}] ❌ MongoDB connection attempt ${connectionAttempts} failed:`, 
      error.message
    );

    if (connectionAttempts < MAX_RETRIES) {
      console.log(`[${instanceId}] ⏱️ Retrying in ${RETRY_INTERVAL/1000} seconds...`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_INTERVAL));
      return connectToMongo(instanceId); // Recursive retry with same instance ID
    } else {
      console.error(
        `[${instanceId}] ❌ Failed to connect to MongoDB after ${MAX_RETRIES} attempts`
      );
      throw error;
    }
  }
};

/**
 * Helper function to log events with rate limiting to prevent duplicates
 * Only logs if LOG_LEVEL is appropriate
 * 
 * @param {string} event - Event name
 * @param {string} message - Log message
 * @param {string} instanceId - Instance identifier
 * @param {Object} [error] - Optional error object
 * @param {number} [minLogLevel=1] - Minimum log level for this message to appear
 * @returns {void}
 */
const logEventWithRateLimit = (event, message, instanceId, error = null, minLogLevel = 1) => {
  // Skip if log level is below minimum required
  if (LOG_LEVEL < minLogLevel) {
    return;
  }
  
  const now = Date.now();
  
  // Skip logs if the same event was logged recently
  if (now - eventTimestamps[event] < EVENT_LOG_COOLDOWN) {
    return;
  }
  
  // Update the timestamp for this event
  eventTimestamps[event] = now;
  
  // Log the message
  if (error) {
    console.error(`[${instanceId}] ${message}`, error);
  } else {
    console.log(`[${instanceId}] ${message}`);
  }
};

/**
 * Set up MongoDB connection event handlers
 * 
 * @param {string} [instanceId="main"] - Instance identifier for logging
 * @returns {void}
 */
const setupConnectionHandlers = (instanceId = "main") => {
  const connection = mongoose.connection;

  // Only set up handlers once
  if (connection.listenerCount("connected") > 0) return;

  connection.on("connected", () => {
    // Set higher log level (2) for the connection established message to suppress it
    logEventWithRateLimit("connected", "✅ MongoDB connection established", instanceId, null, 2);
    isConnected = true;
  });

  connection.on("error", (err) => {
    // Always log errors regardless of log level
    logEventWithRateLimit("error", "❌ MongoDB connection error:", instanceId, err, 0);
    isConnected = false;
  });

  connection.on("disconnected", () => {
    logEventWithRateLimit("disconnected", "⚠️ MongoDB disconnected", instanceId);
    isConnected = false;
  });

  connection.on("reconnected", () => {
    logEventWithRateLimit("reconnected", "✅ MongoDB reconnected", instanceId);
    isConnected = true;
  });

  // Handle application shutdown
  process.on("SIGINT", () => gracefulShutdown(instanceId));
  process.on("SIGTERM", () => gracefulShutdown(instanceId));

  if (process.platform === "win32") {
    process.on("SIGBREAK", () => gracefulShutdown(instanceId));
  }
};

/**
 * Gracefully close the MongoDB connection on application shutdown
 * 
 * @param {string} [instanceId="main"] - Instance identifier for logging
 * @returns {Promise<void>}
 */
const gracefulShutdown = async (instanceId = "main") => {
  try {
    console.log(`[${instanceId}] 🛑 Closing MongoDB connection due to application shutdown`);
    await mongoose.connection.close(false);
    console.log(`[${instanceId}] ✅ MongoDB connection closed through app termination`);
    process.exit(0);
  } catch (err) {
    console.error(`[${instanceId}] ❌ Error during MongoDB connection closure:`, err);
    process.exit(1);
  }
};

/**
 * Check MongoDB connection health
 * 
 * @returns {Object} Connection health status object with details about the current connection
 */
const checkConnectionHealth = () => {
  const state = mongoose.connection.readyState;
  const stateMap = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
    4: "invalid",
  };

  return {
    status: stateMap[state] || "unknown",
    isConnected: state === 1,
    readyState: state,
    host: mongoose.connection.host,
    name: mongoose.connection.name,
  };
};

module.exports = {
  connectToMongo,
  checkConnectionHealth,
  isConnected: () => isConnected,
};
