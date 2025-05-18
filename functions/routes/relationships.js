/**
 * Relationships Routes Module
 *
 * Defines the Express routes for relationship management operations including
 * creating, reading, updating, and deleting relationships between entities.
 *
 * @module relationshipRoutes
 * @requires express
 * @requires ../controllers/relationshipController
 * @requires ../validation/relationshipValidator
 */
const express = require("express");
// eslint-disable-next-line new-cap
const router = express.Router();
const relationshipController = require("../controllers/relationshipController");
const {
  validateCreateRelationship,
  validateBulkCreateRelationships,
  validateUpdateRelationship,
  validateQueryParams,
} = require("../validation/relationshipValidator");

/**
 * Routes organization in Express is critical to prevent conflicts.
 * The order of routes matters - more specific routes should come before
 * general parameter-based routes.
 */

// Static metadata routes - most specific, should come first
router.get("/types/entities", relationshipController.getEntityTypes);
router.get("/types/relationships", relationshipController.getRelationshipTypes);

// Specialized entity-related routes with specific prefixes
router.get(
    "/primary/:primaryId/:primaryType",
    relationshipController.findByPrimaryEntity
);

router.get(
    "/secondary/:secondaryId/:secondaryType",
    relationshipController.findBySecondaryEntity
);

router.delete(
    "/entity/:entityId/:entityType",
    relationshipController.deleteAllEntityRelationships
);

// Specific relationship creation routes
router.post(
    "/purchase-item/:purchaseId/:itemId",
    relationshipController.createPurchaseItemRelationship
);

router.post(
    "/purchase-asset/:purchaseId/:assetId",
    relationshipController.createPurchaseAssetRelationship
);

router.post(
    "/sale-item/:saleId/:itemId",
    relationshipController.createSaleItemRelationship
);

router.post(
    "/product-material/:productId/:materialId",
    relationshipController.createProductMaterialRelationship
);

// Basic CRUD operations on relationships
router.get("/", validateQueryParams, relationshipController.getAllRelationships);

router.post("/", validateCreateRelationship, relationshipController.createRelationship);

// Parameter-based routes for a single relationship - should come last
router.get("/:id", relationshipController.getRelationshipById);

router.patch("/:id", validateUpdateRelationship, relationshipController.updateRelationship);

router.delete("/:id", relationshipController.deleteRelationship);

module.exports = router;
