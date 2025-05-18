/**
 * Sale Controller
 * Handles HTTP requests related to sale transactions
 */

const saleService = require("../services/saleService");
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
      console.error(`Error in sale controller (${operation}):`, error);

      // If it's already an AppError, just rethrow it
      if (error instanceof AppError) {
        throw error;
      }

      // For MongoDB duplicate key errors
      if (error.code === 11000) {
        throw new AppError(
          `Sale with duplicate ${Object.keys(error.keyValue)[0]} exists`,
          409,
        );
      }

      // For validation errors
      if (error.name === "ValidationError") {
        throw new ValidationError(
          `Invalid sale data: ${error.message}`,
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
 * Sale controller with all methods
 */
const saleController = {
  /**
   * Get all sales
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getAllSales(req, res) {
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
    
    const sales = await saleService.getAllSales(query, options);
    
    res.status(200).json({
      status: "success",
      results: sales.length,
      data: sales
    });
  },
  
  /**
   * Get sale by ID
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getSaleById(req, res) {
    const sale = await saleService.getSaleById(req.params.id);
    
    if (!sale) {
      throw new AppError(`Sale with ID ${req.params.id} not found`, 404);
    }
    
    res.status(200).json({
      status: "success",
      data: sale
    });
  },
  
  /**
   * Get sale by sale number
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getSaleByNumber(req, res) {
    const { saleNumber } = req.params;
    
    if (!saleNumber) {
      throw new ValidationError("Sale number is required", ["saleNumber"]);
    }
    
    const sale = await saleService.getSaleByNumber(saleNumber);
    
    if (!sale) {
      throw new AppError(`Sale with number ${saleNumber} not found`, 404);
    }
    
    res.status(200).json({
      status: "success",
      data: sale
    });
  },
  
  /**
   * Create a new sale
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async createSale(req, res) {
    const sale = await saleService.createSale(req.body);
    
    res.status(201).json({
      status: "success",
      data: sale
    });
  },
  
  /**
   * Update a sale
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async updateSale(req, res) {
    const sale = await saleService.updateSale(req.params.id, req.body);
    
    if (!sale) {
      throw new AppError(`Sale with ID ${req.params.id} not found`, 404);
    }
    
    res.status(200).json({
      status: "success",
      data: sale
    });
  },
  
  /**
   * Delete a sale
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async deleteSale(req, res) {
    const result = await saleService.deleteSale(req.params.id);
    
    if (!result) {
      throw new AppError(`Sale with ID ${req.params.id} not found`, 404);
    }
    
    res.status(204).json({
      status: "success",
      data: null
    });
  },
  
  /**
   * Mark a sale as confirmed
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async markAsConfirmed(req, res) {
    const sale = await saleService.markAsConfirmed(req.params.id);
    
    res.status(200).json({
      status: "success",
      data: sale
    });
  },
  
  /**
   * Ship items for a sale
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async shipItems(req, res) {
    const { shippedItems, shippingInfo, updateInventory } = req.body;
    
    if (!shippedItems || !Array.isArray(shippedItems)) {
      throw new ValidationError("Shipped items array is required", ["shippedItems"]);
    }
    
    const sale = await saleService.shipItems(
      req.params.id,
      shippedItems,
      shippingInfo || {},
      updateInventory === false ? false : true
    );
    
    res.status(200).json({
      status: "success",
      data: sale
    });
  },
  
  /**
   * Mark a sale as completed
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async markAsCompleted(req, res) {
    const sale = await saleService.markAsCompleted(req.params.id);
    
    res.status(200).json({
      status: "success",
      data: sale
    });
  },
  
  /**
   * Cancel a sale
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async cancelSale(req, res) {
    const { reason } = req.body;
    
    const sale = await saleService.cancelSale(req.params.id, reason);
    
    res.status(200).json({
      status: "success",
      data: sale
    });
  },
  
  /**
   * Record a payment for a sale
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
    
    const sale = await saleService.recordPayment(
      req.params.id,
      amount,
      method,
      date ? new Date(date) : undefined
    );
    
    res.status(200).json({
      status: "success",
      data: sale
    });
  },
  
  /**
   * Apply a discount to a sale
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async applyDiscount(req, res) {
    const { type, value, description } = req.body;
    
    if (!type || !["percentage", "fixed"].includes(type)) {
      throw new ValidationError("Valid discount type is required (percentage or fixed)", ["type"]);
    }
    
    if (value === undefined || value < 0) {
      throw new ValidationError("Valid discount value is required", ["value"]);
    }
    
    const sale = await saleService.applyDiscount(
      req.params.id,
      type,
      value,
      description || ""
    );
    
    res.status(200).json({
      status: "success",
      data: sale
    });
  },
  
  /**
   * Apply a tax to a sale
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async applyTax(req, res) {
    const { name, rate } = req.body;
    
    if (!name) {
      throw new ValidationError("Tax name is required", ["name"]);
    }
    
    if (rate === undefined || rate < 0) {
      throw new ValidationError("Valid tax rate is required", ["rate"]);
    }
    
    const sale = await saleService.applyTax(
      req.params.id,
      name,
      rate
    );
    
    res.status(200).json({
      status: "success",
      data: sale
    });
  },
  
  /**
   * Get sale statistics
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getSaleStats(req, res) {
    const query = req.query.filter ? JSON.parse(req.query.filter) : {};
    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
    
    const stats = await saleService.getSaleStats(query, startDate, endDate);
    
    res.status(200).json({
      status: "success",
      data: stats
    });
  }
};

// Create a wrapped version of the controller with error handling
const enhancedController = {};

// Wrap all methods with error handling
Object.entries(saleController).forEach(([methodName, method]) => {
  // Convert method name to operation description (e.g., getAllSales -> get all sales)
  const operation = methodName
    .replace(/([A-Z])/g, " $1")
    .toLowerCase()
    .trim();

  enhancedController[methodName] = withErrorHandling(method, operation);
});

module.exports = enhancedController;