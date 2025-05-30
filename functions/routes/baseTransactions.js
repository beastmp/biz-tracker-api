/**
 * Base Transaction Routes Module
 *
 * Defines the Express routes for base transaction management operations including
 * creating, reading, updating, and deleting transactions.
 *
 * @module baseTransactionRoutes
 * @requires express
 * @requires ../controllers/baseTransactionController
 */
const express = require("express");
// eslint-disable-next-line new-cap
const router = express.Router();
const baseTransactionController = require("../controllers/baseTransactionController");

// Special routes that could conflict with parameter routes should come first
// Search route must come before ID-based routes to avoid conflicts
router.get("/search", baseTransactionController.searchTransactions);

// Transaction statistics routes
router.get("/stats", baseTransactionController.getTransactionStats);
router.get("/totals-by-date", baseTransactionController.getTransactionTotalsByDate);

// Utility routes
router.get("/generate-id", baseTransactionController.generateTransactionId);

// Basic CRUD routes
router.get("/", baseTransactionController.getAllTransactions);
router.post("/", baseTransactionController.createTransaction);

// Lookup by transaction ID (reference number)
router.get("/transaction-id/:transactionId", baseTransactionController.getTransactionByTransactionId);

// Party-based routes
router.get("/party/:partyId", baseTransactionController.getTransactionsByParty);

// Parameter-based routes
router.get("/:id", baseTransactionController.getTransactionById);
router.patch("/:id", baseTransactionController.updateTransaction);
router.delete("/:id", baseTransactionController.deleteTransaction);

// Transaction operation routes
router.post("/:id/payment", baseTransactionController.recordPayment);
router.patch("/:id/status", baseTransactionController.changeStatus);

module.exports = router;