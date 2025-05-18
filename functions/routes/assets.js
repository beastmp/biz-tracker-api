/**
 * Asset Routes Module
 *
 * Defines the Express routes for asset management operations including
 * creating, reading, updating, and deleting assets.
 *
 * @module assetRoutes
 * @requires express
 * @requires ../controllers/assetController
 * @requires ../utils/fileUpload
 * @requires ../validation
 */
const express = require("express");
// eslint-disable-next-line new-cap
const router = express.Router();
const assetController = require("../controllers/assetController");
const {upload, uploadErrorHandler, uploadToStorage} =
  require("../utils/fileUpload");
const {processFileUpload} = require("../validation");

// Basic CRUD routes
router.get("/", assetController.getAllAssets);
router.get("/:id", assetController.getAssetById);
router.post(
    "/",
    upload.single("image"),
    uploadErrorHandler,
    uploadToStorage,
    processFileUpload,
    assetController.createAsset,
);
router.patch(
    "/:id",
    upload.single("image"),
    uploadErrorHandler,
    uploadToStorage,
    processFileUpload,
    assetController.updateAsset,
);
router.delete("/:id", assetController.deleteAsset);

// Additional routes for specific asset operations
router.patch("/:id/depreciation", assetController.calculateDepreciation);
router.post("/:id/maintenance", assetController.addMaintenanceRecord);
router.get("/:id/maintenance-due", assetController.isMaintenanceDue);
router.get("/search", assetController.searchAssets);

module.exports = router;
