/**
 * Base Item Routes Module
 *
 * Defines the Express routes for base item management operations including
 * creating, reading, updating, and deleting items.
 *
 * @module baseItemRoutes
 * @requires express
 * @requires ../controllers/baseItemController
 * @requires ../controllers/relationshipController
 * @requires ../utils/fileUpload
 * @requires ../validation
 */
const express = require("express");
// eslint-disable-next-line new-cap
const router = express.Router();
const baseItemController = require("../controllers/baseItemController");
const relationshipController = require("../controllers/relationshipController");
const {upload, uploadErrorHandler, uploadToStorage} =
  require("../utils/fileUpload");
const {processFileUpload} = require("../validation");

// Special routes that could conflict with parameter routes should come first
// Search route must come before ID-based routes to avoid conflicts
router.get("/search", baseItemController.searchItems);

// Inventory management special routes
router.get("/inventory/value", baseItemController.calculateInventoryValue);
router.get("/inventory/by-category", baseItemController.getInventoryByCategory);
router.get("/inventory/reorder", baseItemController.getItemsNeedingReorder);
router.get("/inventory/below-minimum", baseItemController.getItemsBelowMinimum);

// SKU lookup needs to come before general ID lookup
router.get("/sku/:sku", baseItemController.getItemBySku);

/**
 * Routes for getting the next available SKU, all categories, and all tags
 */
router.get("/nextsku", baseItemController.getNextSku);
router.get("/categories", baseItemController.getCategories);
router.get("/tags", baseItemController.getTags);

// Basic CRUD routes
router.get("/", baseItemController.getAllItems);
router.post(
    "/", 
    upload.single("image"),
    uploadErrorHandler,
    uploadToStorage,
    processFileUpload,
    baseItemController.createItem
);

/**
 * Type-specific item creation endpoints
 */
router.post("/materials", baseItemController.createMaterialItem);
router.post("/products", baseItemController.createProductItem);
router.post("/dual-purpose", baseItemController.createDualPurposeItem);

// Parameter-based routes
router.get("/:id", baseItemController.getItemById);
router.patch(
    "/:id",
    upload.single("image"),
    uploadErrorHandler,
    uploadToStorage,
    processFileUpload,
    baseItemController.updateItem
);
router.delete("/:id", baseItemController.deleteItem);
router.patch("/:id/inventory", baseItemController.updateInventory);
router.patch("/:id/inventory-settings", baseItemController.updateInventorySettings);

// Relationship routes for items
router.get("/:id/relationships", relationshipController.findByPrimaryEntity);
router.get("/:id/secondary-relationships", relationshipController.findBySecondaryEntity);
router.post("/:productId/components/:materialId",
    relationshipController.createProductMaterialRelationship
);

module.exports = router;