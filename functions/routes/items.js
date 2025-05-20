/**
 * Item Routes Module
 *
 * Defines the Express routes for item management operations including
 * creating, reading, updating, and deleting items.
 *
 * @module itemRoutes
 * @requires express
 * @requires ../controllers/itemController
 * @requires ../controllers/relationshipController
 * @requires ../utils/fileUpload
 * @requires ../validation
 */
const express = require("express");
// eslint-disable-next-line new-cap
const router = express.Router();
const itemController = require("../controllers/itemController");
const relationshipController = require("../controllers/relationshipController");
const {upload, uploadErrorHandler, uploadToStorage} =
  require("../utils/fileUpload");
const {processFileUpload} = require("../validation");

// Special routes that could conflict with parameter routes should come first
// Search route must come before ID-based routes to avoid conflicts
router.get("/search", itemController.searchItems);

// Inventory management special routes
router.get("/inventory/value", itemController.calculateInventoryValue);
router.get("/inventory/by-category", itemController.getInventoryByCategory);

// SKU lookup needs to come before general ID lookup
router.get("/sku/:sku", itemController.getItemBySku);

// Basic CRUD routes
router.get("/", itemController.getAllItems);
router.post(
    "/", 
    upload.single("image"),
    uploadErrorHandler,
    uploadToStorage,
    processFileUpload,
    itemController.createItem
);

// Parameter-based routes
router.get("/:id", itemController.getItemById);
router.patch(
    "/:id",
    upload.single("image"),
    uploadErrorHandler,
    uploadToStorage,
    processFileUpload,
    itemController.updateItem
);
router.delete("/:id", itemController.deleteItem);
router.patch("/:id/inventory", itemController.updateInventory);

// Relationship routes for items
router.get("/:id/relationships", relationshipController.findByPrimaryEntity);
router.get("/:id/secondary-relationships", relationshipController.findBySecondaryEntity);
router.post("/:productId/components/:materialId",
    relationshipController.createProductMaterialRelationship
);

module.exports = router;
