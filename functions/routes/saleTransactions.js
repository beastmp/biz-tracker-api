/**
 * Sale Transactions Routes
 * Routes for sale transaction operations
 */

const express = require("express");
const router = express.Router();
const handlers = require("../providers/handlerFactory");

// Get sale transaction controller from handler factory
const saleTransactionController = handlers.controllers.saleTransaction;

// Base CRUD routes (inherited from BaseTransactionController)
router.get("/", saleTransactionController.findAll.bind(saleTransactionController));
router.get("/:id", saleTransactionController.findById.bind(saleTransactionController));
router.post("/", saleTransactionController.create.bind(saleTransactionController));
router.put("/:id", saleTransactionController.update.bind(saleTransactionController));
router.delete("/:id", saleTransactionController.delete.bind(saleTransactionController));

// Sale transaction specific routes
router.get("/by-customer/:customerId", 
  saleTransactionController.findByCustomer.bind(saleTransactionController));
router.get("/customer/:customerId/total-revenue", 
  saleTransactionController.calculateTotalRevenueByCustomer.bind(saleTransactionController));
router.get("/history/summary", 
  saleTransactionController.getSaleHistorySummary.bind(saleTransactionController));
router.get("/reports/generate", 
  saleTransactionController.generateSalesReport.bind(saleTransactionController));
router.get("/reports/profit-margins", 
  saleTransactionController.calculateProfitMargins.bind(saleTransactionController));

module.exports = router;