const admin = require("firebase-admin");
const config = require("../../config");

let firestoreDb = null;
let isConnected = false;
let connectionAttempts = 0;
const MAX_RETRIES = 3;
const RETRY_INTERVAL = 3000; // 3 seconds

/**
 * Initialize Firestore connection with retry logic
 * @return {Promise<Object>} Firestore client objects
 */
const initializeFirestore = async () => {
  // If already connected, return the existing client
  if (isConnected && firestoreDb) {
    console.log("✅ Using existing Firestore connection");
    return {db: firestoreDb, admin};
  }

  try {
    console.log("🔄 Connecting to Firestore...");

    // Initialize Firebase Admin SDK if not already initialized
    let adminApp;
    if (admin.apps.length === 0) {
      // Initialize with service account if available
      if (config.FIREBASE_SERVICE_ACCOUNT) {
        try {
          const serviceAccount = JSON.parse(config.FIREBASE_SERVICE_ACCOUNT);
          adminApp = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
          });
        } catch (error) {
          console.warn(`⚠️ Error parsing service account,
            using default credentials:`, error.message);
          adminApp = admin.initializeApp();
        }
      } else {
        // Use default credentials (works in Firebase environment)
        adminApp = admin.initializeApp();
      }
    } else {
      // eslint-disable-next-line no-unused-vars
      adminApp = admin.apps[0];
    }

    // Initialize Firestore
    firestoreDb = admin.firestore();

    // Configure settings
    firestoreDb.settings({
      ignoreUndefinedProperties: true,
      timestampsInSnapshots: true,
    });

    // Verify connection with a simple operation
    await firestoreDb.collection("_health").doc("test").set({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    isConnected = true;
    connectionAttempts = 0;
    console.log("✅ Firestore connected successfully");

    return {db: firestoreDb, admin};
  } catch (error) {
    connectionAttempts++;
    console.error(`❌ Firestore connection attempt
      ${connectionAttempts} failed:`, error.message);

    if (connectionAttempts < MAX_RETRIES) {
      console.log(`⏱️ Retrying in ${RETRY_INTERVAL / 1000} seconds...`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_INTERVAL));
      return initializeFirestore(); // Recursive retry
    } else {
      console.error(`❌ Failed to connect to Firestore
        after ${MAX_RETRIES} attempts`);
      throw error;
    }
  }
};

/**
 * Check Firestore connection health
 * @param {FirebaseFirestore.Firestore} db - Firestore database instance
 * @return {Promise<Object>} Health status
 */
const checkFirestoreHealth = async (db) => {
  try {
    // Try a simple operation to verify connection
    const timestamp = Date.now();
    await db.collection("_health").doc("check").set({timestamp});
    const doc = await db.collection("_health").doc("check").get();

    return {
      status: "connected",
      isConnected: true,
      provider: "firestore",
      lastCheck: new Date().toISOString(),
      data: doc.data(),
    };
  } catch (error) {
    console.error("Firestore health check failed:", error);
    return {
      status: "disconnected",
      isConnected: false,
      error: error.message,
      provider: "firestore",
    };
  }
};

/**
 * Create Firestore indexes required by application
 * @param {FirebaseFirestore.Firestore} db - Firestore database
 * @param {string} collectionPrefix - Collection name prefix
 * @return {Promise<void>}
 */
const createIndexes = async (db, collectionPrefix = "") => {
  // Firestore indexes are defined in the Firebase console or via Firebase CLI
  // This function logs information about indexes that should be created
  console.log(`INFO: Firestore indexes should be created
    using Firebase CLI or console`);
  console.log("Recommended indexes for collections:");
  console.log(`- ${collectionPrefix}items: (category, name) ascending`);
  console.log(`- ${collectionPrefix}sales: (createdAt) descending`);
  console.log(`- ${collectionPrefix}purchases: (purchaseDate) descending`);
  console.log(`See Firebase documentation for more details
    on creating indexes`);
};

module.exports = {
  initializeFirestore,
  checkFirestoreHealth,
  createIndexes,
};
