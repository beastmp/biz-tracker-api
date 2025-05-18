/**
 * Purchase Controller
 * Handles HTTP requests related to purchase transactions
 */

const purchaseService = require("../services/purchaseService");
const { AppError, ValidationError } = require("../validation/errors");

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
      console.error(`Error in purchase controller (${operation}):`, error);

      // If it's already an AppError, just rethrow it
      if (error instanceof AppError) {
        throw error;
      }

      // For MongoDB duplicate key errors
      if (error.code === 11000) {
        throw new AppError(
          `Purchase with duplicate ${Object.keys(error.keyValue)[0]} exists`,
          409,
        );
      }

      // For validation errors
      if (error.name === "ValidationError") {
        throw new ValidationError(
          `Invalid purchase data: ${error.message}`,
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
 * Purchase controller with all methods
 */
const purchaseController = {
  /**
   * Get all purchases
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getAllPurchases(req, res) {
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
    
    const purchases = await purchaseService.getAllPurchases(query, options);
    
    res.status(200).json({
      status: "success",
      results: purchases.length,
      data: purchases
    });
  },
  
  /**
   * Get purchase by ID
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getPurchaseById(req, res) {
    const purchase = await purchaseService.getPurchaseById(req.params.id);
    
    if (!purchase) {
      throw new AppError(`Purchase with ID ${req.params.id} not found`, 404);
    }
    
    res.status(200).json({
      status: "success",
      data: purchase
    });
  },
  
  /**
   * Get purchase by purchase number
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getPurchaseByNumber(req, res) {
    const { purchaseNumber } = req.params;
    
    if (!purchaseNumber) {
      throw new ValidationError("Purchase number is required", ["purchaseNumber"]);
    }
    
    const purchase = await purchaseService.getPurchaseByNumber(purchaseNumber);
    
    if (!purchase) {
      throw new AppError(`Purchase with number ${purchaseNumber} not found`, 404);
    }
    
    res.status(200).json({
      status: "success",
      data: purchase
    });
  },
  
  /**
   * Create a new purchase
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async createPurchase(req, res) {
    const purchase = await purchaseService.createPurchase(req.body);
    
    res.status(201).json({
      status: "success",
      data: purchase
    });
  },
  
  /**
   * Update a purchase
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async updatePurchase(req, res) {
    const purchase = await purchaseService.updatePurchase(req.params.id, req.body);
    
    if (!purchase) {
      throw new AppError(`Purchase with ID ${req.params.id} not found`, 404);
    }
    
    res.status(200).json({
      status: "success",
      data: purchase
    });
  },
  
  /**
   * Delete a purchase
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async deletePurchase(req, res) {
    const result = await purchaseService.deletePurchase(req.params.id);
    
    if (!result) {
      throw new AppError(`Purchase with ID ${req.params.id} not found`, 404);
    }
    
    res.status(204).json({
      status: "success",
      data: null
    });
  },
  
  /**
   * Mark a purchase as ordered
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async markAsOrdered(req, res) {
    const purchase = await purchaseService.markAsOrdered(req.params.id);
    
    res.status(200).json({
      status: "success",
      data: purchase
    });
  },
  
  /**
   * Receive items for a purchase
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async receiveItems(req, res) {
    const { receivedItems, updateInventory } = req.body;
    
    if (!receivedItems || !Array.isArray(receivedItems)) {
      throw new ValidationError("Received items array is required", ["receivedItems"]);
    }
    
    const purchase = await purchaseService.receiveItems(
      req.params.id,
      receivedItems,
      updateInventory === false ? false : true
    );
    
    res.status(200).json({
      status: "success",
      data: purchase
    });
  },
  
  /**
   * Mark a purchase as completed
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async markAsCompleted(req, res) {
    const purchase = await purchaseService.markAsCompleted(req.params.id);
    
    res.status(200).json({
      status: "success",
      data: purchase
    });
  },
  
  /**
   * Cancel a purchase
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async cancelPurchase(req, res) {
    const { reason } = req.body;
    
    const purchase = await purchaseService.cancelPurchase(req.params.id, reason);
    
    res.status(200).json({
      status: "success",
      data: purchase
    });
  },
  
  /**
   * Record a payment for a purchase
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async recordPayment(req, res) {
    const { amount, method, date } = req.body;
    
    if (!amount || amount <= 0) {
      throw new ValidationError("Valid payment amount is required", ["amount"]);
    }
    
    if (!method) {
      throw new ValidationError("Payment method is required", ["method"]);
    }
    
    const purchase = await purchaseService.recordPayment(
      req.params.id,
      amount,
      method,
      date ? new Date(date) : undefined
    );
    
    res.status(200).json({
      status: "success",
      data: purchase
    });
  },
  
  /**
   * Get purchase statistics
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getPurchaseStats(req, res) {
    const query = req.query.filter ? JSON.parse(req.query.filter) : {};
    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
    
    const stats = await purchaseService.getPurchaseStats(query, startDate, endDate);
    
    res.status(200).json({
      status: "success",
      data: stats
    });
  }
};

// Create a wrapped version of the controller with error handling
const enhancedController = {};

// Wrap all methods with error handling
Object.entries(purchaseController).forEach(([methodName, method]) => {
  // Convert method name to operation description (e.g., getAllPurchases -> get all purchases)
  const operation = methodName
    .replace(/([A-Z])/g, " $1")
    .toLowerCase()
    .trim();

  enhancedController[methodName] = withErrorHandling(method, operation);
});

module.exports = enhancedController;