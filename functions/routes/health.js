const express = require("express");
// eslint-disable-next-line new-cap
const router = express.Router();
const {getProviderFactory} = require("../providers");

/**
 * Get system health status
 */
router.get("/", async (req, res) => {
  try {
    const providerFactory = getProviderFactory();
    const dbProvider = providerFactory.getDatabaseProvider();
    const dbHealth = await dbProvider.checkHealth();

    const response = {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      providers: {
        database: {
          provider: process.env.DB_PROVIDER || "mongodb",
          health: dbHealth,
        },
      },
    };

    // If any health check is not ok, set status to error
    if (!dbHealth.isConnected) {
      response.status = "error";
    }

    res.json(response);
  } catch (error) {
    console.error("Health check error:", error);
    res.status(500).json({
      status: "error",
      message: "Could not complete health check",
      error: error.message,
    });
  }
});

module.exports = router;
