/**
 * Purchase Transactions Routes
 * Routes for purchase transaction operations
 */

const express = require("express");
const router = express.Router();
const handlers = require("../providers/handlerFactory");

// Get purchase transaction controller from handler factory
const purchaseTransactionController = handlers.controllers.purchaseTransaction;

// Base CRUD routes (inherited from BaseTransactionController)
router.get("/", purchaseTransactionController.findAll.bind(purchaseTransactionController));
router.get("/:id", purchaseTransactionController.findById.bind(purchaseTransactionController));
router.post("/", purchaseTransactionController.create.bind(purchaseTransactionController));
router.put("/:id", purchaseTransactionController.update.bind(purchaseTransactionController));
router.delete("/:id", purchaseTransactionController.delete.bind(purchaseTransactionController));

// Purchase transaction specific routes
router.get("/by-supplier/:supplierId", 
  purchaseTransactionController.findBySupplier.bind(purchaseTransactionController));
router.get("/supplier/:supplierId/total-spend", 
  purchaseTransactionController.calculateTotalSpendBySupplier.bind(purchaseTransactionController));
router.get("/history/summary", 
  purchaseTransactionController.getPurchaseHistorySummary.bind(purchaseTransactionController));
router.get("/reports/generate", 
  purchaseTransactionController.generatePurchaseReport.bind(purchaseTransactionController));

module.exports = router;