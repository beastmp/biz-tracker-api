/**
 * Asset Controller
 * Handles HTTP requests related to assets
 */

const assetService = require("../services/assetService");
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
      console.error(`Error in asset controller (${operation}):`, error);

      // If it's already an AppError, just rethrow it
      if (error instanceof AppError) {
        throw error;
      }

      // For MongoDB duplicate key errors
      if (error.code === 11000) {
        throw new AppError(
          `Asset with duplicate ${Object.keys(error.keyValue)[0]} exists`,
          409,
        );
      }

      // For validation errors
      if (error.name === "ValidationError") {
        throw new ValidationError(
          `Invalid asset data: ${error.message}`,
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
 * Asset controller with all methods
 */
const assetController = {
  /**
   * Get all assets
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getAllAssets(req, res) {
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
    
    const assets = await assetService.getAllAssets(query, options);
    
    res.status(200).json({
      status: "success",
      results: assets.length,
      data: assets
    });
  },
  
  /**
   * Get asset by ID
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getAssetById(req, res) {
    const asset = await assetService.getAssetById(req.params.id);
    
    if (!asset) {
      throw new AppError(`Asset with ID ${req.params.id} not found`, 404);
    }
    
    res.status(200).json({
      status: "success",
      data: asset
    });
  },
  
  /**
   * Create a new asset
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async createAsset(req, res) {
    const asset = await assetService.createAsset(req.body);
    
    res.status(201).json({
      status: "success",
      data: asset
    });
  },
  
  /**
   * Update an asset
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async updateAsset(req, res) {
    const asset = await assetService.updateAsset(req.params.id, req.body);
    
    if (!asset) {
      throw new AppError(`Asset with ID ${req.params.id} not found`, 404);
    }
    
    res.status(200).json({
      status: "success",
      data: asset
    });
  },
  
  /**
   * Delete an asset
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async deleteAsset(req, res) {
    const result = await assetService.deleteAsset(req.params.id);
    
    if (!result) {
      throw new AppError(`Asset with ID ${req.params.id} not found`, 404);
    }
    
    res.status(204).json({
      status: "success",
      data: null
    });
  },
  
  /**
   * Calculate asset depreciation
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async calculateDepreciation(req, res) {
    const { years, salvageValue, method } = req.body;
    
    const currentValue = await assetService.calculateAssetDepreciation(
      req.params.id,
      years,
      salvageValue,
      method
    );
    
    res.status(200).json({
      status: "success",
      data: {
        currentValue
      }
    });
  },
  
  /**
   * Add maintenance record to asset
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async addMaintenanceRecord(req, res) {
    const asset = await assetService.addMaintenanceRecord(
      req.params.id,
      req.body
    );
    
    res.status(200).json({
      status: "success",
      data: asset
    });
  },
  
  /**
   * Check if maintenance is due for asset
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async isMaintenanceDue(req, res) {
    const isMaintenanceDue = await assetService.isMaintenanceDue(req.params.id);
    
    res.status(200).json({
      status: "success",
      data: {
        isMaintenanceDue
      }
    });
  },
  
  /**
   * Search assets
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async searchAssets(req, res) {
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
    
    const assets = await assetService.searchAssets(searchText, options);
    
    res.status(200).json({
      status: "success",
      results: assets.length,
      data: assets
    });
  }
};

// Create a wrapped version of the controller with error handling
const enhancedController = {};

// Wrap all methods with error handling
Object.entries(assetController).forEach(([methodName, method]) => {
  // Convert method name to operation description (e.g., getAllAssets -> get all assets)
  const operation = methodName
    .replace(/([A-Z])/g, " $1")
    .toLowerCase()
    .trim();

  enhancedController[methodName] = withErrorHandling(method, operation);
});

module.exports = enhancedController;