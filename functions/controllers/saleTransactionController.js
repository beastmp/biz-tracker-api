/**
 * Sale Transaction Controller
 * Handles HTTP requests related to sale transaction operations
 */

const saleTransactionService = require("../services/saleTransactionService");
const { AppError, ValidationError } = require("../validation/errors");
const { normalizeData } = require("../utils/dataUtils");

/**
 * Wrap controller methods with standard error handling
 * 
 * @param {Function} method - Method to wrap with error handling
 * @param {string} operation - Description of the operation
 * @returns {Function} Error-handled function
 */
const withErrorHandling = (method, operation) => {
  return async (...args) => {
    try {
      return await method(...args);
    } catch (error) {
      console.error(`Error in sale transaction controller (${operation}):`, error);

      // If it's already an AppError, just rethrow it
      if (error instanceof AppError) {
        throw error;
      }

      // For MongoDB duplicate key errors
      if (error.code === 11000) {
        throw new AppError(
          `Sale transaction with duplicate ${Object.keys(error.keyValue)[0]} exists`,
          409,
        );
      }

      // For validation errors
      if (error.name === "ValidationError") {
        throw new ValidationError(
          `Invalid sale transaction data: ${error.message}`,
          error.errors,
        );
      }

      // Default error
      throw new AppError(
        `Failed to ${operation}: ${error.message}`,
        500,
      );
    }
  };
};

/**
 * Sale Transaction controller with all methods
 */
const saleTransactionController = {
  /**
   * Get all sale transactions
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getAllSaleTransactions(req, res) {
    const query = req.query.filter ? JSON.parse(req.query.filter) : {};
    const options = {};
    
    // Handle pagination
    if (req.query.page && req.query.limit) {
      options.skip = (parseInt(req.query.page) - 1) * parseInt(req.query.limit);
      options.limit = parseInt(req.query.limit);
    }
    
    // Handle sorting
    if (req.query.sort) {
      options.sort = req.query.sort;
    }
    
    const transactions = await saleTransactionService.getAllSaleTransactions(query, options);
    
    res.status(200).json({
      status: "success",
      results: transactions.length,
      data: normalizeData(transactions)
    });
  },
  
  /**
   * Get sale transaction by ID
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getSaleTransactionById(req, res) {
    const transaction = await saleTransactionService.getSaleTransactionById(req.params.id);
    
    if (!transaction) {
      throw new AppError(`Sale transaction with ID ${req.params.id} not found`, 404);
    }
    
    res.status(200).json({
      status: "success",
      data: normalizeData(transaction)
    });
  },
  
  /**
   * Create a new sale transaction
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async createSaleTransaction(req, res) {
    // Extract updateInventory flag from request
    const updateInventory = req.query.updateInventory === "true";
    
    const transaction = await saleTransactionService.createSaleTransaction(
      req.body, 
      updateInventory
    );
    
    res.status(201).json({
      status: "success",
      data: normalizeData(transaction)
    });
  },
  
  /**
   * Update a sale transaction
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async updateSaleTransaction(req, res) {
    // Extract updateInventory flag from request
    const updateInventory = req.query.updateInventory === "true";
    
    const transaction = await saleTransactionService.updateSaleTransaction(
      req.params.id, 
      req.body,
      updateInventory
    );
    
    if (!transaction) {
      throw new AppError(`Sale transaction with ID ${req.params.id} not found`, 404);
    }
    
    res.status(200).json({
      status: "success",
      data: normalizeData(transaction)
    });
  },
  
  /**
   * Delete a sale transaction
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async deleteSaleTransaction(req, res) {
    const result = await saleTransactionService.deleteSaleTransaction(req.params.id);
    
    if (!result) {
      throw new AppError(`Sale transaction with ID ${req.params.id} not found`, 404);
    }
    
    res.status(204).json({
      status: "success",
      data: null
    });
  },
  
  /**
   * Record a payment for a sale transaction
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async recordPayment(req, res) {
    const { amount, method, date } = req.body;
    
    if (amount === undefined) {
      throw new ValidationError("Payment amount is required", ["amount"]);
    }
    
    if (!method) {
      throw new ValidationError("Payment method is required", ["method"]);
    }
    
    const transaction = await saleTransactionService.recordPayment(
      req.params.id,
      amount,
      method,
      date ? new Date(date) : new Date()
    );
    
    res.status(200).json({
      status: "success",
      data: normalizeData(transaction)
    });
  },
  
  /**
   * Change status of a sale transaction
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async changeSaleStatus(req, res) {
    const { status } = req.body;
    
    if (!status) {
      throw new ValidationError("Status is required", ["status"]);
    }
    
    // Extract updateInventory flag from request
    const updateInventory = req.query.updateInventory === "true";
    
    const transaction = await saleTransactionService.changeSaleStatus(
      req.params.id,
      status,
      updateInventory
    );
    
    res.status(200).json({
      status: "success",
      data: normalizeData(transaction)
    });
  },
  
  /**
   * Get sale transactions by customer
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getSalesByCustomer(req, res) {
    const { customerId } = req.params;
    
    if (!customerId) {
      throw new ValidationError("Customer ID is required", ["customerId"]);
    }
    
    const options = {};
    
    // Handle pagination
    if (req.query.page && req.query.limit) {
      options.skip = (parseInt(req.query.page) - 1) * parseInt(req.query.limit);
      options.limit = parseInt(req.query.limit);
    }
    
    const transactions = await saleTransactionService.getSalesByCustomer(customerId, options);
    
    res.status(200).json({
      status: "success",
      results: transactions.length,
      data: normalizeData(transactions)
    });
  },
  
  /**
   * Get sale transaction statistics
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getSaleStats(req, res) {
    const query = req.query.filter ? JSON.parse(req.query.filter) : {};
    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
    
    const stats = await saleTransactionService.getSaleStats(
      query,
      startDate,
      endDate
    );
    
    res.status(200).json({
      status: "success",
      data: stats
    });
  }
};

// Create a wrapped version of the controller with error handling
const enhancedController = {};

// Wrap all methods with error handling
Object.entries(saleTransactionController).forEach(([methodName, method]) => {
  // Convert method name to operation description (e.g., getAllSaleTransactions -> get all sale transactions)
  const operation = methodName
    .replace(/([A-Z])/g, " $1")
    .toLowerCase()
    .trim();

  enhancedController[methodName] = withErrorHandling(method, operation);
});

module.exports = enhancedController;