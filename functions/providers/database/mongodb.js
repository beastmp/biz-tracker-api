const mongoose = require("mongoose");
const DatabaseProvider = require("./interface");

class MongoDBProvider extends DatabaseProvider {
  constructor(config) {
    super();
    this.uri = config.uri;
    this.options = config.options || {
      serverSelectionTimeoutMS: 60000,
      socketTimeoutMS: 120000,
      connectTimeoutMS: 60000,
    };
  }

  async connect() {
    try {
      await mongoose.connect(this.uri, this.options);
      console.log("✅ Connected to MongoDB");
      return true;
    } catch (err) {
      console.error("❌ MongoDB connection error:", err);
      throw err;
    }
  }

  async disconnect() {
    try {
      await mongoose.disconnect();
      console.log("✅ Disconnected from MongoDB");
      return true;
    } catch (err) {
      console.error("❌ MongoDB disconnect error:", err);
      throw err;
    }
  }

  getClient() {
    return mongoose;
  }

  async isConnected() {
    return mongoose.connection.readyState === 1;
  }
}

module.exports = MongoDBProvider;
