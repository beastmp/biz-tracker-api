/**
 * Asset Routes Module
 *
 * Defines the Express routes for asset management operations including
 * creating, reading, updating, and deleting assets.
 *
 * @module assetRoutes
 * @requires express
 * @requires ../utils/fileUpload
 * @requires ../providers/handlerFactory
 * @requires ../validation
 * @requires ../providers
 * @requires ../utils/transactionUtils
 */
const express = require("express");
// eslint-disable-next-line new-cap
const router = express.Router();
const {upload, uploadErrorHandler, uploadToStorage} =
  require("../utils/fileUpload");
const handlerFactory = require("../providers/handlerFactory");
const {processFileUpload} = require("../validation");
const {getProviderFactory} = require("../providers");

// Create handlers using factory
const getAllAssets = handlerFactory.getAll("Asset");
const getAllAssetsWithRelationships =
  handlerFactory.getAllWithRelationships("Asset");
const getAsset = handlerFactory.getOne("Asset", "Asset");
const getAssetWithRelationships = handlerFactory.getOneWithRelationships(
    "Asset",
    "Asset",
);
const createAssetWithRelationships =
  handlerFactory.createOneWithRelationships("Asset");
const updateAssetWithRelationships =
  handlerFactory.updateOneWithRelationships("Asset", "Asset");
const deleteAssetWithRelationships =
  handlerFactory.deleteOneWithRelationships("Asset", "Asset");

/**
 * Get the repository for asset operations
 * @return {Object} Asset repository instance
 */
const getAssetRepository = () => {
  return getProviderFactory().createAssetRepository();
};

// Get all assets without relationships (basic endpoint)
router.get("/", getAllAssets);

// Get all assets with relationships
router.get("/with-relationships", getAllAssetsWithRelationships);

// Get one asset without relationships (basic endpoint)
router.get("/:id", getAsset);

// Get one asset with relationships
router.get("/:id/with-relationships", getAssetWithRelationships);

// Create asset with relationship handling
router.post(
    "/",
    upload.single("image"),
    uploadErrorHandler,
    uploadToStorage,
    processFileUpload,
    createAssetWithRelationships,
);

// Update asset with relationship handling
router.patch(
    "/:id",
    upload.single("image"),
    uploadErrorHandler,
    uploadToStorage,
    processFileUpload,
    updateAssetWithRelationships,
);

// Delete asset with relationship cleanup
router.delete("/:id", deleteAssetWithRelationships);

/**
 * Update asset image
 * PATCH /assets/:id/image
 */
router.patch("/:id/image", async (req, res, next) => {
  try {
    const {id} = req.params;
    const {image, filename, contentType} = req.body;

    if (!image || !contentType) {
      return res.status(400).json({
        message: "Missing required image data",
      });
    }

    // Get the proper provider instances from your factory
    const providerFactory = getProviderFactory();
    const storageProvider = providerFactory.getStorageProvider();
    const assetRepository = getAssetRepository();

    console.log(`Uploading image for asset: ${id}`);

    // Convert base64 back to buffer
    const buffer = Buffer.from(image, "base64");

    // Generate a unique filename if not provided
    const fileExt = contentType.split("/")[1] || "jpg";
    const finalFilename = filename ||
      `asset-${id}-${Date.now()}.${fileExt}`;

    // Use the storage provider to save the file
    const imageUrl = await storageProvider.uploadFile(
        buffer,
        finalFilename,
        contentType,
    );

    console.log("Image uploaded successfully. URL:", imageUrl);

    // Update the asset with the new image URL
    const updatedAsset = await assetRepository.update(id, {
      imageUrl: imageUrl,
    });

    if (!updatedAsset) {
      return res.status(404).json({message: "Asset not found"});
    }

    // Get relationships for response using the helper from factory
    const relationships = await handlerFactory.getRelationshipsForEntity(
        id,
        "Asset",
    );

    res.json({
      ...updatedAsset,
      relationships,
      imageUrl,
    });
  } catch (error) {
    console.error("Error uploading asset image:", error);
    next(error);
  }
});

/**
 * Get asset report by types
 * GET /assets/reports/by-type
 */
router.get("/reports/by-type", async (req, res, next) => {
  try {
    const assetRepository = getAssetRepository();
    const report = await assetRepository.getReportByType();
    res.json(report);
  } catch (err) {
    next(err);
  }
});

/**
 * Get asset statistics
 * GET /assets/stats
 */
router.get("/stats", async (req, res, next) => {
  try {
    const assetRepository = getAssetRepository();
    const stats = await assetRepository.getStatistics();
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
