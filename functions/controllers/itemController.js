/**
 * Item Controller
 * Handles HTTP requests related to inventory items
 */

const itemService = require("../services/itemService");
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
      console.error(`Error in item controller (${operation}):`, error);

      // If it's already an AppError, just rethrow it
      if (error instanceof AppError) {
        throw error;
      }

      // For MongoDB duplicate key errors
      if (error.code === 11000) {
        throw new AppError(
          `Item with duplicate ${Object.keys(error.keyValue)[0]} exists`,
          409,
        );
      }

      // For validation errors
      if (error.name === "ValidationError") {
        throw new ValidationError(
          `Invalid item data: ${error.message}`,
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
 * Item controller with all methods
 */
const itemController = {
  /**
   * Get all items
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getAllItems(req, res) {
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
    
    const items = await itemService.getAllItems(query, options);
    
    res.status(200).json({
      status: "success",
      results: items.length,
      data: normalizeData(items)
    });
  },
  
  /**
   * Get item by ID
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getItemById(req, res) {
    const item = await itemService.getItemById(req.params.id);
    
    if (!item) {
      throw new AppError(`Item with ID ${req.params.id} not found`, 404);
    }
    
    res.status(200).json({
      status: "success",
      data: normalizeData(item)
    });
  },
  
  /**
   * Get item by SKU
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getItemBySku(req, res) {
    const { sku } = req.params;
    
    if (!sku) {
      throw new ValidationError("SKU is required", ["sku"]);
    }
    
    const item = await itemService.getItemBySku(sku);
    
    if (!item) {
      throw new AppError(`Item with SKU ${sku} not found`, 404);
    }
    
    res.status(200).json({
      status: "success",
      data: normalizeData(item)
    });
  },
  
  /**
   * Create a new item
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async createItem(req, res) {
    const item = await itemService.createItem(req.body);
    
    res.status(201).json({
      status: "success",
      data: normalizeData(item)
    });
  },
  
  /**
   * Update an item
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async updateItem(req, res) {
    const item = await itemService.updateItem(req.params.id, req.body);
    
    if (!item) {
      throw new AppError(`Item with ID ${req.params.id} not found`, 404);
    }
    
    res.status(200).json({
      status: "success",
      data: normalizeData(item)
    });
  },
  
  /**
   * Delete an item
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async deleteItem(req, res) {
    const result = await itemService.deleteItem(req.params.id);
    
    if (!result) {
      throw new AppError(`Item with ID ${req.params.id} not found`, 404);
    }
    
    res.status(204).json({
      status: "success",
      data: null
    });
  },
  
  /**
   * Update inventory for an item
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async updateInventory(req, res) {
    const { adjustmentValue, trackingType } = req.body;
    
    if (adjustmentValue === undefined) {
      throw new ValidationError("Adjustment value is required", ["adjustmentValue"]);
    }
    
    const item = await itemService.updateInventory(
      req.params.id,
      adjustmentValue,
      trackingType
    );
    
    res.status(200).json({
      status: "success",
      data: normalizeData(item)
    });
  },
  
  /**
   * Calculate total inventory value
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async calculateInventoryValue(req, res) {
    const query = req.query.filter ? JSON.parse(req.query.filter) : {};
    
    const totalValue = await itemService.calculateInventoryValue(query);
    
    res.status(200).json({
      status: "success",
      data: {
        totalValue
      }
    });
  },
  
  /**
   * Search items
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async searchItems(req, res) {
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
    
    const items = await itemService.searchItems(searchText, options);
    
    res.status(200).json({
      status: "success",
      results: items.length,
      data: normalizeData(items)
    });
  },
  
  /**
   * Get inventory by category
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getInventoryByCategory(req, res) {
    const inventoryByCategory = await itemService.getInventoryByCategory();
    
    res.status(200).json({
      status: "success",
      data: normalizeData(inventoryByCategory)
    });
  }
};

// Create a wrapped version of the controller with error handling
const enhancedController = {};

// Wrap all methods with error handling
Object.entries(itemController).forEach(([methodName, method]) => {
  // Convert method name to operation description (e.g., getAllItems -> get all items)
  const operation = methodName
    .replace(/([A-Z])/g, " $1")
    .toLowerCase()
    .trim();

  enhancedController[methodName] = withErrorHandling(method, operation);
});

module.exports = enhancedController;