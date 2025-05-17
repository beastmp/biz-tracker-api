/**
 * Purchase Routes Module
 *
 * Defines the Express routes for purchase management operations including
 * creating, reading, updating, and deleting purchases, as well as handling
 * relationships between purchases and items/assets.
 *
 * @module purchaseRoutes
 * @requires express
 * @requires ../providers
 * @requires ../utils/transactionUtils
 * @requires ../utils/relationshipUtils
 * @requires ../providers/handlerFactory
 */
const express = require("express");
// eslint-disable-next-line new-cap
const router = express.Router();
const {getProviderFactory} = require("../providers");
const handlerFactory = require("../providers/handlerFactory");

// Create handlers using factory
const getAllPurchases = handlerFactory.getAll("Purchase");
const getAllPurchasesWithRelationships =
  handlerFactory.getAllWithRelationships("Purchase");
const getPurchase = handlerFactory.getOne("Purchase", "Purchase");
const getPurchaseWithRelationships =
  handlerFactory.getOneWithRelationships("Purchase", "Purchase");
const createPurchaseWithRelationships =
  handlerFactory.createOneWithRelationships("Purchase");
const updatePurchaseWithRelationships =
  handlerFactory.updateOneWithRelationships("Purchase", "Purchase");
const deletePurchaseWithRelationships =
  handlerFactory.deleteOneWithRelationships("Purchase", "Purchase");

/**
 * Get the repository for purchase operations
 * @return {Object} Purchase repository instance
 */
const getPurchaseRepository = () => {
  return getProviderFactory().createPurchaseRepository();
};

/**
 * Get all purchases
 * GET /purchases
 */
router.get("/", getAllPurchases);

/**
 * Get all purchases with relationships
 * GET /purchases/with-relationships
 */
router.get("/with-relationships", getAllPurchasesWithRelationships);

/**
 * Get single purchase
 * GET /purchases/:id
 */
router.get("/:id", getPurchase);

/**
 * Get single purchase with relationships
 * GET /purchases/:id/with-relationships
 */
router.get("/:id/with-relationships", getPurchaseWithRelationships);

/**
 * Create new purchase with relationships
 * POST /purchases
 */
router.post("/", createPurchaseWithRelationships);

/**
 * Update purchase with relationships
 * PATCH /purchases/:id
 */
router.patch("/:id", updatePurchaseWithRelationships);

/**
 * Delete purchase with relationships
 * DELETE /purchases/:id
 */
router.delete("/:id", deletePurchaseWithRelationships);

// Get purchases report by date range
router.get("/reports/by-date", async (req, res, next) => {
  try {
    const {startDate, endDate} = req.query;
    const filter = {};
    const purchaseRepository = getPurchaseRepository();

    const report = await purchaseRepository.getReport(
        filter,
        startDate,
        endDate,
    );
    res.json(report);
  } catch (err) {
    next(err);
  }
});

// Get purchase trends
router.get("/trends", async (req, res, next) => {
  try {
    const {startDate, endDate} = req.query;
    const filter = {};

    if (!startDate || !endDate) {
      return res.status(400).json({
        message: "startDate and endDate are required",
      });
    }

    const purchaseRepository = getPurchaseRepository();
    const trends = await purchaseRepository.getTrends(
        filter,
        startDate,
        endDate,
    );
    res.json(trends);
  } catch (err) {
    next(err);
  }
});

// Get purchases for a specific item
router.get("/item/:itemId", async (req, res, next) => {
  try {
    const {itemId} = req.params;
    const purchaseRepository = getPurchaseRepository();
    const purchases = await purchaseRepository.getAllByItemId(itemId);
    res.json(purchases);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
