const admin = require("firebase-admin");
require("dotenv").config();

// Initialize Firebase Admin SDK
// Use different configurations for different environments
let adminConfig = {};

// When running in Firebase Functions (production), use default credentials
// if (process.env.NODE_ENV === "production" ||
//     process.env.FUNCTIONS_EMULATOR === "true") {
//   adminConfig = {
//     storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
//   };
// } else {
//   // For local development outside of Firebase emulator, use service account
//   try {
//     const serviceAccount = require("../../firebase-credentials.json");
//     adminConfig = {
//       credential: admin.credential.cert(serviceAccount),
//       storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
//     };
//   } catch (error) {
//     console.error("Failed to load service account file:", error);
//     throw new Error("Firebase credentials required for local development");
//   }
// }


adminConfig = {
  storageBucket: process.env.STORAGE_BUCKET,
};

// Initialize with the appropriate config
admin.initializeApp(adminConfig);

const bucket = admin.storage().bucket();

/**
 * Tests the connection to Firebase Storage by retrieving bucket metadata.
 * @async
 * @return {Promise<void>}
 * @throws {Error} If connection to Firebase Storage fails
 */
async function testFirebaseConnection() {
  try {
    const [metadata] = await bucket.getMetadata();
    console.log(`✅ Connected to Firebase Storage: ${metadata.name}`);
    console.log(`   - Location: ${metadata.location}`);
    console.log(`   - Storage class: ${metadata.storageClass}`);
  } catch (error) {
    console.error("❌ Failed to connect to Firebase Storage:", error);
  }
}

testFirebaseConnection();

module.exports = bucket;
