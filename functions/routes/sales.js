/**
 * Sales Routes Module
 *
 * Handles all sales-related API endpoints including creating, reading,
 * updating, and deleting sales, as well as managing sale item relationships.
 *
 * @module salesRoutes
 * @requires express
 * @requires ../providers/handlerFactory
 * @requires ../middleware
 * @requires ../providers
 * @requires ../utils/transactionUtils
 * @requires ../utils/relationshipUtils
 */
const express = require("express");
// eslint-disable-next-line new-cap
const router = express.Router();
const handlerFactory = require("../providers/handlerFactory");
const {getProviderFactory} = require("../providers");
const {withTransaction} = require("../utils/transactionUtils");
const {
  getSaleItems,
} = require("../utils/relationshipUtils");

// Create handlers using handlerFactory
const getAllSales = handlerFactory.getAll("Sale");
const getAllSalesWithRelationships = handlerFactory.getAllWithRelationships("Sale");
const getSale = handlerFactory.getOne("Sale", "Sale");
const getSaleWithRelationships = handlerFactory.getOneWithRelationships("Sale", "Sale");
const createSaleWithRelationships = handlerFactory.createOneWithRelationships("Sale");
const updateSaleWithRelationships = handlerFactory.updateOneWithRelationships("Sale", "Sale");
const deleteSaleWithRelationships = handlerFactory.deleteOneWithRelationships("Sale", "Sale");

/**
 * Get the repository for sales operations
 * @return {Object} Sales repository instance
 */
const getSalesRepository = () => {
  return getProviderFactory().createSalesRepository();
};

// Get all sales without relationships (basic endpoint)
router.get("/", getAllSales);

// Get all sales with relationships
router.get("/with-relationships", getAllSalesWithRelationships);

// Get one sale without relationships (basic endpoint)
router.get("/:id", getSale);

// Get one Sale with relationships
router.get("/:id/with-relationships", getSaleWithRelationships);

// Create new sale with relationships
router.post("/", createSaleWithRelationships);

// Update sale with relationships
router.patch("/:id", updateSaleWithRelationships);

// Delete Sale with relationship cleanup
router.delete("/:id", deleteSaleWithRelationships);

/**
 * Get sales trends
 * GET /sales/trends
 */
router.get("/trends", async (req, res, next) => {
  try {
    const {startDate, endDate} = req.query;
    const filter = {};
    const salesRepository = getSalesRepository();

    if (!startDate || !endDate) {
      return res.status(400).json({
        message: "startDate and endDate are required for trends",
      });
    }

    const trends = await salesRepository.getTrends(filter, startDate, endDate);
    res.json(trends);
  } catch (err) {
    next(err);
  }
});

/**
 * Update sale payment status
 * POST /sales/:id/payments
 */
router.post("/:id/payments", async (req, res, next) => {
  try {
    const {id} = req.params;
    const {amount} = req.body;

    if (!amount || typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({
        message: "Valid payment amount is required",
      });
    }

    const salesRepository = getSalesRepository();

    // Update payment status
    const result = await withTransaction(async (transaction) => {
      return await salesRepository.updatePaymentStatus(id, amount, transaction);
    });

    if (!result) {
      return res.status(404).json({
        message: "Sale not found",
      });
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * Get next invoice number
 * GET /sales/utility/next-invoice
 */
router.get("/utility/next-invoice", async (req, res, next) => {
  try {
    const salesRepository = getSalesRepository();
    const invoiceNumber = await salesRepository.getNextInvoiceNumber();

    res.json({invoiceNumber});
  } catch (err) {
    next(err);
  }
});

/**
 * Get sales for a specific item
 * GET /sales/item/:itemId
 */
router.get("/item/:itemId", async (req, res, next) => {
  try {
    const {itemId} = req.params;
    const salesRepository = getSalesRepository();

    // Get all sales for this item
    const sales = await salesRepository.getAllByItemId(itemId);

    res.json(sales);
  } catch (err) {
    next(err);
  }
});

/**
 * Get sale item relationships
 * GET /sales/:id/items
 */
router.get("/:id/items", async (req, res, next) => {
  try {
    const {id} = req.params;
    const {populate = "false"} = req.query;

    // Get sale items
    const saleItems = await getSaleItems(id);

    if (populate === "true") {
      // Populate item details with correct repository method
      const itemRepository = getProviderFactory().createItemRepository();
      const populatedItems = [];

      for (const relationship of saleItems) {
        const item = await itemRepository.findById(relationship.secondaryId);

        if (item) {
          populatedItems.push({
            ...relationship,
            item,
          });
        } else {
          populatedItems.push(relationship);
        }
      }

      return res.json(populatedItems);
    }

    res.json(saleItems);
  } catch (err) {
    next(err);
  }
});

/**
 * Get sales statistics
 * GET /sales/stats
 */
router.get("/stats", async (req, res, next) => {
  try {
    const {startDate, endDate, businessId} = req.query;
    const salesRepository = getSalesRepository();

    const stats = await salesRepository.getStatistics({
      startDate,
      endDate,
      businessId,
    });

    res.json(stats);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
