/**
 * Purchase Routes Module
 *
 * Defines the Express routes for purchase management operations including
 * creating, reading, updating, and deleting purchases.
 *
 * @module purchaseRoutes
 * @requires express
 * @requires ../controllers/purchaseController
 * @requires ../controllers/relationshipController
 */
const express = require("express");
// eslint-disable-next-line new-cap
const router = express.Router();
const purchaseController = require("../controllers/purchaseController");
const relationshipController = require("../controllers/relationshipController");

// Stats and reporting - these must come before parameter routes
router.get("/stats", purchaseController.getPurchaseStats);

// Specific routes with non-parameter prefixes
router.get("/number/:purchaseNumber", purchaseController.getPurchaseByNumber);

// Basic CRUD operations for collection endpoints
router.get("/", purchaseController.getAllPurchases);
router.post("/", purchaseController.createPurchase);

// Parameter-based routes for single purchase operations
router.get("/:id", purchaseController.getPurchaseById);
router.patch("/:id", purchaseController.updatePurchase);
router.delete("/:id", purchaseController.deletePurchase);

// Purchase workflow routes - these extend the /:id parameter base route
router.patch("/:id/order", purchaseController.markAsOrdered);
router.patch("/:id/receive", purchaseController.receiveItems);
router.patch("/:id/complete", purchaseController.markAsCompleted);
router.patch("/:id/cancel", purchaseController.cancelPurchase);
router.patch("/:id/payment", purchaseController.recordPayment);

// Relationship routes - also extend the /:id parameter base route
router.get("/:id/relationships", relationshipController.findByPrimaryEntity);
router.post(
    "/:purchaseId/items/:itemId",
    relationshipController.createPurchaseItemRelationship
);
router.post(
    "/:purchaseId/assets/:assetId",
    relationshipController.createPurchaseAssetRelationship
);

module.exports = router;
