const mongoose = require("mongoose");
const config = require("../../config");

// Track connection state
let isConnected = false;
let connectionAttempts = 0;
const MAX_RETRIES = 5;
const RETRY_INTERVAL = 5000; // 5 seconds

/**
 * Connect to MongoDB with retry logic
 * @return {Promise<mongoose.Connection>} Mongoose connection object
 */
const connectToMongo = async () => {
  // If already connected, return the existing connection
  if (isConnected && mongoose.connection.readyState === 1) {
    console.log("✅ Using existing MongoDB connection");
    return mongoose.connection;
  }

  const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000,
    maxPoolSize: 50,
  };

  try {
    console.log("🔄 Connecting to MongoDB...");

    // Attach event handlers before connecting
    setupConnectionHandlers();

    // Connect to MongoDB
    await mongoose.connect(config.DB_URI, options);

    isConnected = true;
    connectionAttempts = 0;
    console.log("✅ MongoDB connected successfully");

    return mongoose.connection;
  } catch (error) {
    connectionAttempts++;
    console.error(`❌ MongoDB connection attempt
      ${connectionAttempts} failed:`, error.message);

    if (connectionAttempts < MAX_RETRIES) {
      console.log(`⏱️ Retrying in ${RETRY_INTERVAL/1000} seconds...`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_INTERVAL));
      return connectToMongo(); // Recursive retry
    } else {
      console.error(`❌ Failed to connect to MongoDB
        after ${MAX_RETRIES} attempts`);
      throw error;
    }
  }
};

/**
 * Set up MongoDB connection event handlers
 */
const setupConnectionHandlers = () => {
  const connection = mongoose.connection;

  // Only set up handlers once
  if (connection.listenerCount("connected") > 0) return;

  connection.on("connected", () => {
    console.log("✅ MongoDB connection established");
    isConnected = true;
  });

  connection.on("error", (err) => {
    console.error("❌ MongoDB connection error:", err);
    isConnected = false;
  });

  connection.on("disconnected", () => {
    console.warn("⚠️ MongoDB disconnected");
    isConnected = false;
  });

  connection.on("reconnected", () => {
    console.log("✅ MongoDB reconnected");
    isConnected = true;
  });

  // Handle application shutdown
  process.on("SIGINT", gracefulShutdown);
  process.on("SIGTERM", gracefulShutdown);

  if (process.platform === "win32") {
    process.on("SIGBREAK", gracefulShutdown);
  }
};

/**
 * Gracefully close the MongoDB connection on application shutdown
 */
const gracefulShutdown = async () => {
  try {
    console.log("🛑 Closing MongoDB connection due to application shutdown");
    await mongoose.connection.close(false);
    console.log("✅ MongoDB connection closed through app termination");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error during MongoDB connection closure:", err);
    process.exit(1);
  }
};

/**
 * Check MongoDB connection health
 * @return {Object} Connection health status
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
