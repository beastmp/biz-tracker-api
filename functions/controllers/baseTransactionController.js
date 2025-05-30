/**
 * Base Transaction Controller
 * Handles HTTP requests related to base transaction operations
 */

const baseTransactionService = require("../services/baseTransactionService");
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
      console.error(`Error in base transaction controller (${operation}):`, error);

      // If it's already an AppError, just rethrow it
      if (error instanceof AppError) {
        throw error;
      }

      // For MongoDB duplicate key errors
      if (error.code === 11000) {
        throw new AppError(
          `Transaction with duplicate ${Object.keys(error.keyValue)[0]} exists`,
          409,
        );
      }

      // For validation errors
      if (error.name === "ValidationError") {
        throw new ValidationError(
          `Invalid transaction data: ${error.message}`,
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
 * Base Transaction controller with all methods
 */
const baseTransactionController = {
  /**
   * Get all transactions
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getAllTransactions(req, res) {
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
    
    const transactions = await baseTransactionService.getAllTransactions(query, options);
    
    res.status(200).json({
      status: "success",
      results: transactions.length,
      data: normalizeData(transactions)
    });
  },
  
  /**
   * Get transaction by ID
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getTransactionById(req, res) {
    const transaction = await baseTransactionService.getTransactionById(req.params.id);
    
    if (!transaction) {
      throw new AppError(`Transaction with ID ${req.params.id} not found`, 404);
    }
    
    res.status(200).json({
      status: "success",
      data: normalizeData(transaction)
    });
  },
  
  /**
   * Get transaction by transaction ID
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getTransactionByTransactionId(req, res) {
    const { transactionId } = req.params;
    
    if (!transactionId) {
      throw new ValidationError("Transaction ID is required", ["transactionId"]);
    }
    
    const transaction = await baseTransactionService.getTransactionByTransactionId(transactionId);
    
    if (!transaction) {
      throw new AppError(`Transaction with ID ${transactionId} not found`, 404);
    }
    
    res.status(200).json({
      status: "success",
      data: normalizeData(transaction)
    });
  },
  
  /**
   * Create a new transaction
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async createTransaction(req, res) {
    // If transactionId is not provided, generate one
    if (!req.body.transactionId) {
      req.body.transactionId = await baseTransactionService.generateTransactionId(req.body.prefix || "");
    }
    
    const transaction = await baseTransactionService.createTransaction(req.body);
    
    res.status(201).json({
      status: "success",
      data: normalizeData(transaction)
    });
  },
  
  /**
   * Update a transaction
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async updateTransaction(req, res) {
    const transaction = await baseTransactionService.updateTransaction(req.params.id, req.body);
    
    if (!transaction) {
      throw new AppError(`Transaction with ID ${req.params.id} not found`, 404);
    }
    
    res.status(200).json({
      status: "success",
      data: normalizeData(transaction)
    });
  },
  
  /**
   * Delete a transaction
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async deleteTransaction(req, res) {
    const result = await baseTransactionService.deleteTransaction(req.params.id);
    
    if (!result) {
      throw new AppError(`Transaction with ID ${req.params.id} not found`, 404);
    }
    
    res.status(204).json({
      status: "success",
      data: null
    });
  },
  
  /**
   * Record a payment for a transaction
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
    
    const transaction = await baseTransactionService.recordPayment(
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
   * Change status of a transaction
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async changeStatus(req, res) {
    const { status } = req.body;
    
    if (!status) {
      throw new ValidationError("Status is required", ["status"]);
    }
    
    const transaction = await baseTransactionService.changeStatus(
      req.params.id,
      status
    );
    
    res.status(200).json({
      status: "success",
      data: normalizeData(transaction)
    });
  },
  
  /**
   * Search transactions
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async searchTransactions(req, res) {
    const { searchText } = req.query;
    
    if (!searchText) {
      throw new ValidationError("Search text is required", ["searchText"]);
    }
    
    const options = {};
    
    // Handle pagination
    if (req.query.page && req.query.limit) {
      options.skip = (parseInt(req.query.page) - 1) * parseInt(req.query.limit);
      options.limit = parseInt(req.query.limit);
    }
    
    const transactions = await baseTransactionService.searchTransactions(searchText, options);
    
    res.status(200).json({
      status: "success",
      results: transactions.length,
      data: normalizeData(transactions)
    });
  },
  
  /**
   * Generate a transaction ID
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async generateTransactionId(req, res) {
    const { prefix } = req.query;
    
    const transactionId = await baseTransactionService.generateTransactionId(prefix || "");
    
    res.status(200).json({
      status: "success",
      transactionId
    });
  },
  
  /**
   * Get transaction statistics
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getTransactionStats(req, res) {
    const query = req.query.filter ? JSON.parse(req.query.filter) : {};
    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
    
    const stats = await baseTransactionService.getTransactionStats(
      query,
      startDate,
      endDate
    );
    
    res.status(200).json({
      status: "success",
      data: stats
    });
  },
  
  /**
   * Get transactions by party
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getTransactionsByParty(req, res) {
    const { partyId } = req.params;
    
    if (!partyId) {
      throw new ValidationError("Party ID is required", ["partyId"]);
    }
    
    const options = {};
    
    // Handle pagination
    if (req.query.page && req.query.limit) {
      options.skip = (parseInt(req.query.page) - 1) * parseInt(req.query.limit);
      options.limit = parseInt(req.query.limit);
    }
    
    const transactions = await baseTransactionService.getTransactionsByParty(partyId, options);
    
    res.status(200).json({
      status: "success",
      results: transactions.length,
      data: normalizeData(transactions)
    });
  },
  
  /**
   * Get transaction totals by date
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getTransactionTotalsByDate(req, res) {
    const { startDate, endDate, groupBy } = req.query;
    
    if (!startDate) {
      throw new ValidationError("Start date is required", ["startDate"]);
    }
    
    const totals = await baseTransactionService.getTransactionTotalsByDate(
      new Date(startDate),
      endDate ? new Date(endDate) : new Date(),
      groupBy || "day"
    );
    
    res.status(200).json({
      status: "success",
      data: totals
    });
  }
};

// Create a wrapped version of the controller with error handling
const enhancedController = {};

// Wrap all methods with error handling
Object.entries(baseTransactionController).forEach(([methodName, method]) => {
  // Convert method name to operation description (e.g., getAllTransactions -> get all transactions)
  const operation = methodName
    .replace(/([A-Z])/g, " $1")
    .toLowerCase()
    .trim();

  enhancedController[methodName] = withErrorHandling(method, operation);
});

module.exports = enhancedController;