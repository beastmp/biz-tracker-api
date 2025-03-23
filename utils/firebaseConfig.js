const admin = require('firebase-admin');
const serviceAccount = require('../firebase-credentials.json');
require('dotenv').config();

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET
});

const bucket = admin.storage().bucket();

async function testFirebaseConnection() {
  try {
      const [metadata] = await bucket.getMetadata();
      console.log(`✅ Connected to Firebase Storage: ${metadata.name}`);
      console.log(`   - Location: ${metadata.location}`);
      console.log(`   - Storage class: ${metadata.storageClass}`);
  } catch (error) {
      console.error('❌ Failed to connect to Firebase Storage:', error);
  }
}

testFirebaseConnection();

module.exports = bucket;