/**
 * Sale Items Routes
 * Routes for sale item operations
 */

const express = require("express");
const router = express.Router();
const handlers = require("../providers/handlerFactory");

// Get sale item controller from handler factory
const saleItemController = handlers.controllers.saleItem;

// Base CRUD routes (inherited from BaseItemController)
router.get("/", saleItemController.findAll.bind(saleItemController));
router.get("/:id", saleItemController.findById.bind(saleItemController));
router.post("/", saleItemController.create.bind(saleItemController));
router.put("/:id", saleItemController.update.bind(saleItemController));
router.delete("/:id", saleItemController.delete.bind(saleItemController));

// Sale item specific routes
router.get("/by-sale/:saleId", saleItemController.findBySaleId.bind(saleItemController));
router.get("/with-history", saleItemController.getItemsWithSaleHistory.bind(saleItemController));
router.get("/:id/average-price", saleItemController.calculateAverageSalePrice.bind(saleItemController));
router.get("/:id/history", saleItemController.getSaleHistory.bind(saleItemController));
router.get("/:id/profit-margin", saleItemController.calculateProfitMargin.bind(saleItemController));
router.post("/profit-margins", saleItemController.getProfitMarginsSummary.bind(saleItemController));
router.post("/sale/:saleId", saleItemController.createSaleItems.bind(saleItemController));
router.put("/sale/:saleId", saleItemController.updateSaleItems.bind(saleItemController));

module.exports = router;