/**
 * Asset Items Routes
 * Routes for asset item operations
 */

const express = require("express");
const router = express.Router();
const handlers = require("../providers/handlerFactory");

// Get asset item controller from handler factory
const assetItemController = handlers.controllers.assetItem;

// Base CRUD routes (inherited from BaseItemController)
router.get("/", assetItemController.findAll.bind(assetItemController));
router.get("/:id", assetItemController.findById.bind(assetItemController));
router.post("/", assetItemController.create.bind(assetItemController));
router.put("/:id", assetItemController.update.bind(assetItemController));
router.delete("/:id", assetItemController.delete.bind(assetItemController));

// Asset item specific routes
router.get("/:id/with-assets", assetItemController.getWithAssets.bind(assetItemController));
router.get("/:id/assets", assetItemController.getLinkedAssets.bind(assetItemController));
router.post("/:id/assets", assetItemController.linkAssets.bind(assetItemController));
router.delete("/:id/assets", assetItemController.unlinkAssets.bind(assetItemController));
router.get("/by-asset/:assetId", assetItemController.findByAssetId.bind(assetItemController));

module.exports = router;