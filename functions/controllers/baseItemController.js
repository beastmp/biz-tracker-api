/**
 * Base Item Controller
 * Handles HTTP requests related to base item operations
 */

const baseItemService = require("../services/baseItemService");
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
      console.error(`Error in base item controller (${operation}):`, error);

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
 * Base Item controller with all methods
 */
const baseItemController = {
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
    
    const items = await baseItemService.getAllItems(query, options);
    
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
    const item = await baseItemService.getItemById(req.params.id);
    
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
    
    const item = await baseItemService.getItemBySku(sku);
    
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
    const item = await baseItemService.createItem(req.body);
    
    res.status(201).json({
      status: "success",
      data: normalizeData(item)
    });
  },

  /**
   * Create a new material item
   * 
   * @param {Object} req - Express request object 
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async createMaterialItem(req, res) {
    const item = await baseItemService.createMaterialItem(req.body);
    
    res.status(201).json({
      status: "success",
      data: normalizeData(item)
    });
  },

  /**
   * Create a new product item
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async createProductItem(req, res) {
    const item = await baseItemService.createProductItem(req.body);
    
    res.status(201).json({
      status: "success",
      data: normalizeData(item)
    });
  },

  /**
   * Create a new dual-purpose item (both product and material)
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async createDualPurposeItem(req, res) {
    const item = await baseItemService.createDualPurposeItem(req.body);
    
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
    const item = await baseItemService.updateItem(req.params.id, req.body);
    
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
    const result = await baseItemService.deleteItem(req.params.id);
    
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
    const { quantity, unitCost, source } = req.body;
    
    if (quantity === undefined) {
      throw new ValidationError("Quantity is required", ["quantity"]);
    }
    
    // Only require unitCost for additions
    if (quantity > 0 && unitCost === undefined) {
      throw new ValidationError("Unit cost is required for inventory additions", ["unitCost"]);
    }
    
    const item = await baseItemService.updateInventory(
      req.params.id,
      quantity,
      unitCost || 0,
      source || "manual"
    );
    
    res.status(200).json({
      status: "success",
      data: normalizeData(item)
    });
  },
  
  /**
   * Update inventory settings
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async updateInventorySettings(req, res) {
    const item = await baseItemService.updateInventorySettings(
      req.params.id,
      req.body
    );
    
    if (!item) {
      throw new AppError(`Item with ID ${req.params.id} not found`, 404);
    }
    
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
    
    const totalValue = await baseItemService.calculateInventoryValue(query);
    
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
    
    const items = await baseItemService.searchItems(searchText, options);
    
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
    const inventoryByCategory = await baseItemService.getInventoryByCategory();
    
    res.status(200).json({
      status: "success",
      data: normalizeData(inventoryByCategory)
    });
  },

  /**
   * Get next available SKU
   * The SKU follows a pattern of 10 digits (e.g., 0000000001, 0000000002, etc.)
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getNextSku(req, res) {
    const nextSku = await baseItemService.getNextSku();
    
    res.status(200).json({
      status: "success",
      nextSku
    });
  },
  
  /**
   * Get all unique categories used by items
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getCategories(req, res) {
    const categories = await baseItemService.getCategories();
    
    res.status(200).json({
      status: "success",
      data: categories
    });
  },
  
  /**
   * Get all unique tags used by items
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getTags(req, res) {
    const tags = await baseItemService.getTags();
    
    res.status(200).json({
      status: "success",
      data: tags
    });
  },
  
  /**
   * Get items that need reordering
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getItemsNeedingReorder(req, res) {
    const items = await baseItemService.getItemsNeedingReorder();
    
    res.status(200).json({
      status: "success",
      results: items.length,
      data: normalizeData(items)
    });
  },
  
  /**
   * Get items below minimum level
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getItemsBelowMinimum(req, res) {
    const items = await baseItemService.getItemsBelowMinimum();
    
    res.status(200).json({
      status: "success",
      results: items.length,
      data: normalizeData(items)
    });
  }
};

// Create a wrapped version of the controller with error handling
const enhancedController = {};

// Wrap all methods with error handling
Object.entries(baseItemController).forEach(([methodName, method]) => {
  // Convert method name to operation description (e.g., getAllItems -> get all items)
  const operation = methodName
    .replace(/([A-Z])/g, " $1")
    .toLowerCase()
    .trim();

  enhancedController[methodName] = withErrorHandling(method, operation);
});

module.exports = enhancedController;