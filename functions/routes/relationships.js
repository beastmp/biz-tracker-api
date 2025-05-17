/**
 * Relationships API routes
 * Uses the generic relationship controller without backward compatibility
 */
const express = require("express");
// eslint-disable-next-line new-cap
const router = express.Router();
const {withTransaction} = require("../utils/transactionUtils");

// Import the controller and validation middleware
const relationshipController = require("../controllers/relationshipController");
const {
  validateCreateRelationship,
  validateBulkCreateRelationships,
  validateUpdateRelationship,
  validateQueryParams,
} = require("../validation/relationshipValidator");

/**
 * GET /relationships
 * Get all relationships with optional filter
 */
router.get("/", validateQueryParams, async (req, res, next) => {
  try {
    // Build filter from query parameters
    const filter = {};

    // Add filters if query parameters are provided
    if (req.query.primaryId) {
      filter.primaryId = req.query.primaryId;
    }

    if (req.query.primaryType) {
      filter.primaryType = req.query.primaryType;
    }

    if (req.query.secondaryId) {
      filter.secondaryId = req.query.secondaryId;
    }

    if (req.query.secondaryType) {
      filter.secondaryType = req.query.secondaryType;
    }

    if (req.query.relationshipType) {
      filter.relationshipType = req.query.relationshipType;
    }

    // Use controller to find relationships by filter
    const relationships = await relationshipController.findByFilter(filter);

    res.json({
      success: true,
      count: relationships.length,
      data: relationships,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /relationships/primary/:id
 * Get relationships by primary entity ID
 */
router.get("/primary/:id", validateQueryParams, async (req, res, next) => {
  try {
    const {id} = req.params;
    const {primaryType, relationshipType} = req.query;

    if (!primaryType) {
      return res.status(400).json({
        success: false,
        message: "primaryType query parameter is required",
      });
    }

    // Use the controller to find relationships by primary entity
    const relationships = await relationshipController.findByPrimary(
        id,
        primaryType,
        relationshipType,
    );

    res.json({
      success: true,
      count: relationships.length,
      data: relationships,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /relationships/secondary/:id
 * Get relationships by secondary entity ID
 */
router.get("/secondary/:id", validateQueryParams, async (req, res, next) => {
  try {
    const {id} = req.params;
    const {secondaryType, relationshipType} = req.query;

    if (!secondaryType) {
      return res.status(400).json({
        success: false,
        message: "secondaryType query parameter is required",
      });
    }

    // Use the controller to find relationships by secondary entity
    const relationships = await relationshipController.findBySecondary(
        id,
        secondaryType,
        relationshipType,
    );

    res.json({
      success: true,
      count: relationships.length,
      data: relationships,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /relationships/:id
 * Get a single relationship by ID
 */
router.get("/:id", async (req, res, next) => {
  try {
    const {id} = req.params;
    const relationship = await relationshipController.getRelationshipById(id);

    if (!relationship) {
      return res.status(404).json({
        success: false,
        message: "Relationship not found",
      });
    }

    res.json({
      success: true,
      data: relationship,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /relationships
 * Create a new relationship
 */
router.post("/", validateCreateRelationship, async (req, res, next) => {
  try {
    const relationshipData = req.body;

    console.log(
        `Creating relationship between ${relationshipData.primaryType} and ` +
      `${relationshipData.secondaryType} of type ${relationshipData.relationshipType}`,
    );

    // Create relationship using the transaction capability in controller
    const newRelationship = await relationshipController.createRelationshipWithTransaction(
        relationshipData,
    );

    console.log(`Relationship created with ID: ${newRelationship._id}`);

    res.status(201).json({
      success: true,
      data: newRelationship,
    });
  } catch (err) {
    console.error("Error creating relationship:", err);
    next(err);
  }
});

/**
 * POST /relationships/bulk
 * Create multiple relationships in a transaction
 */
router.post("/bulk", validateBulkCreateRelationships, async (req, res, next) => {
  try {
    console.log(`Creating ${req.body.length} relationships in bulk`);

    // Use controller to create relationships in bulk
    const createdRelationships = await relationshipController.bulkCreateRelationships(
        req.body,
    );

    console.log(`Created ${createdRelationships.length} relationships`);

    res.status(201).json({
      success: true,
      count: createdRelationships.length,
      data: createdRelationships,
    });
  } catch (err) {
    console.error("Error creating relationships in bulk:", err);
    next(err);
  }
});

/**
 * POST /relationships/replace
 * Replace all relationships for an entity
 */
router.post("/replace", async (req, res, next) => {
  try {
    const {
      entityId,
      entityType,
      relationshipType,
      newRelationships,
      isPrimary = true,
    } = req.body;

    if (!entityId || !entityType || !relationshipType || !Array.isArray(newRelationships)) {
      return res.status(400).json({
        success: false,
        message: "Invalid request parameters",
      });
    }

    console.log(
        `Replacing ${relationshipType} relationships for ${entityType} ${entityId}`,
    );

    // Use controller to replace relationships
    const result = await relationshipController.replaceRelationships(
        entityId,
        entityType,
        relationshipType,
        newRelationships,
        isPrimary,
    );

    console.log(
        `Replaced relationships: deleted ${result.deleted}, created ${result.created}`,
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error("Error replacing relationships:", err);
    next(err);
  }
});

/**
 * PATCH /relationships/:id
 * Update a relationship
 */
router.patch("/:id", validateUpdateRelationship, async (req, res, next) => {
  try {
    const {id} = req.params;
    const updateData = req.body;

    // Update relationship with transaction support
    const updatedRelationship = await withTransaction(async (transaction) => {
      return await relationshipController.updateRelationship(
          id,
          updateData,
          transaction,
      );
    });

    if (!updatedRelationship) {
      return res.status(404).json({
        success: false,
        message: "Relationship not found",
      });
    }

    res.json({
      success: true,
      data: updatedRelationship,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /relationships/:id
 * Delete a relationship
 */
router.delete("/:id", async (req, res, next) => {
  try {
    const {id} = req.params;

    // Delete relationship with transaction support
    const success = await withTransaction(async (transaction) => {
      return await relationshipController.deleteRelationship(id, transaction);
    });

    if (!success) {
      return res.status(404).json({
        success: false,
        message: "Relationship not found",
      });
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /relationships
 * Delete multiple relationships by filter
 */
router.delete("/", async (req, res, next) => {
  try {
    // Build filter from request body
    const filter = req.body;

    if (Object.keys(filter).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Filter criteria required for bulk deletion",
      });
    }

    console.log(`Deleting relationships with filter: ${JSON.stringify(filter)}`);

    // Use controller to bulk delete relationships
    const deleteCount = await withTransaction(async (transaction) => {
      return await relationshipController.bulkDeleteRelationships(
          filter,
          transaction,
      );
    });

    console.log(`Deleted ${deleteCount} relationships`);

    res.json({
      success: true,
      count: deleteCount,
    });
  } catch (err) {
    console.error("Error deleting relationships:", err);
    next(err);
  }
});

module.exports = router;
