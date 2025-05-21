/**
 * Migration Routes Module
 *
 * Defines the Express routes for data migration operations. These endpoints
 * allow for structured data migrations between model versions.
 *
 * @module migrationRoutes
 * @requires express
 * @requires ../controllers/migrationController
 */
const express = require("express");
// eslint-disable-next-line new-cap
const router = express.Router();
const migrationController = require("../controllers/migrationController");

/**
 * Item migration routes
 */
router.get("/items/:itemId", migrationController.migrateItem);
router.get("/items", migrationController.migrateAllItems);

/**
 * Relationship migration routes
 */
router.get("/relationships/:relationshipId", migrationController.migrateRelationship);
router.get("/relationships", migrationController.migrateAllRelationships);

/**
 * Embedded relationship migration routes
 */
router.get("/embedded/items/:itemId", migrationController.migrateItemEmbeddedRelationships);
router.get("/embedded/purchases/:purchaseId", migrationController.migratePurchaseEmbeddedRelationships);
router.get("/embedded/sales/:saleId", migrationController.migrateSaleEmbeddedRelationships);
router.get("/embedded", migrationController.migrateAllEmbeddedRelationships);

/**
 * Cleanup routes - removes embedded fields after successful migration
 */
router.get("/cleanup/:entityType/:entityId", migrationController.cleanupEmbeddedFields);
router.get("/cleanup/:entityType", migrationController.cleanupEmbeddedFields);
router.get("/cleanup", migrationController.cleanupAllEmbeddedFields);

/**
 * Complete migration route - runs all migrations
 */
router.get("/all", migrationController.migrateAll);

module.exports = router;