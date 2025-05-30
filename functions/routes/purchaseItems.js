/**
 * Purchase Items Routes
 * Routes for purchase item operations
 */

const express = require("express");
const router = express.Router();
const handlers = require("../providers/handlerFactory");

// Get purchase item controller from handler factory
const purchaseItemController = handlers.controllers.purchaseItem;

// Base CRUD routes (inherited from BaseItemController)
router.get("/", purchaseItemController.findAll.bind(purchaseItemController));
router.get("/:id", purchaseItemController.findById.bind(purchaseItemController));
router.post("/", purchaseItemController.create.bind(purchaseItemController));
router.put("/:id", purchaseItemController.update.bind(purchaseItemController));
router.delete("/:id", purchaseItemController.delete.bind(purchaseItemController));

// Purchase item specific routes
router.get("/by-purchase/:purchaseId", purchaseItemController.findByPurchaseId.bind(purchaseItemController));
router.get("/with-history", purchaseItemController.getItemsWithPurchaseHistory.bind(purchaseItemController));
router.get("/:id/average-cost", purchaseItemController.calculateAveragePurchaseCost.bind(purchaseItemController));
router.get("/:id/history", purchaseItemController.getPurchaseHistory.bind(purchaseItemController));
router.post("/purchase/:purchaseId", purchaseItemController.createPurchaseItems.bind(purchaseItemController));
router.put("/purchase/:purchaseId", purchaseItemController.updatePurchaseItems.bind(purchaseItemController));

module.exports = router;