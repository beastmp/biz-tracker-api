/**
 * Sales Routes Module
 *
 * Defines the Express routes for sale management operations including
 * creating, reading, updating, and deleting sales.
 *
 * @module salesRoutes
 * @requires express
 * @requires ../controllers/saleController
 * @requires ../controllers/relationshipController
 */
const express = require("express");
// eslint-disable-next-line new-cap
const router = express.Router();
const saleController = require("../controllers/saleController");
const relationshipController = require("../controllers/relationshipController");

// Stats and reporting routes - must come before parameter routes
router.get("/stats", saleController.getSaleStats);

// Specific routes with non-parameter prefixes
router.get("/number/:saleNumber", saleController.getSaleByNumber);

// Basic CRUD operations for collection endpoints
router.get("/", saleController.getAllSales);
router.post("/", saleController.createSale);

// Parameter-based routes for single sale operations
router.get("/:id", saleController.getSaleById);
router.patch("/:id", saleController.updateSale);
router.delete("/:id", saleController.deleteSale);

// Sale workflow routes - these extend the /:id parameter base route
router.patch("/:id/confirm", saleController.markAsConfirmed);
router.patch("/:id/ship", saleController.shipItems);
router.patch("/:id/complete", saleController.markAsCompleted);
router.patch("/:id/cancel", saleController.cancelSale);
router.patch("/:id/payment", saleController.recordPayment);

// Additional feature routes - also extend the /:id parameter base route
router.patch("/:id/discount", saleController.applyDiscount);
router.patch("/:id/tax", saleController.applyTax);

// Relationship routes - also extend the /:id parameter base route
router.get("/:id/relationships", relationshipController.findByPrimaryEntity);
router.post(
    "/:saleId/items/:itemId",
    relationshipController.createSaleItemRelationship
);

module.exports = router;
