/**
 * Sale Item Controller
 * Handles HTTP requests for sale item operations
 */

const BaseItemController = require("./baseItemController");
const { createError } = require("../utils/errorHandling");

/**
 * Controller for handling sale item related requests
 * @extends BaseItemController
 */
class SaleItemController extends BaseItemController {
  /**
   * Creates a new SaleItemController instance
   * @param {Object} service - Sale item service instance
   */
  constructor(service) {
    super(service);
    this.saleService = null;
  }

  /**
   * Set the sale service dependency
   * @param {Object} service - Sale service instance
   */
  setSaleService(service) {
    this.saleService = service;
  }

  /**
   * Find sale items by sale ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async findBySaleId(req, res, next) {
    try {
      const saleId = req.params.saleId;
      const options = this.parseQueryOptions(req);
      
      const saleItems = await this.service.findBySaleId(saleId, options);
      
      res.status(200).json(saleItems);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get items with sale history
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getItemsWithSaleHistory(req, res, next) {
    try {
      const options = this.parseQueryOptions(req);
      
      const items = await this.service.getItemsWithSaleHistory(options);
      
      res.status(200).json(items);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Calculate average sale price
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async calculateAverageSalePrice(req, res, next) {
    try {
      const itemId = req.params.id;
      const options = {
        dateFrom: req.query.dateFrom,
        dateTo: req.query.dateTo,
        limit: req.query.limit ? parseInt(req.query.limit, 10) : undefined,
      };
      
      const avgPrice = await this.service.calculateAverageSalePrice(itemId, options);
      
      res.status(200).json({
        itemId,
        averageSalePrice: avgPrice,
        dateRange: {
          from: options.dateFrom,
          to: options.dateTo
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get sale history for an item
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getSaleHistory(req, res, next) {
    try {
      const itemId = req.params.id;
      const options = {
        dateFrom: req.query.dateFrom,
        dateTo: req.query.dateTo,
        limit: req.query.limit ? parseInt(req.query.limit, 10) : undefined,
        skip: req.query.skip ? parseInt(req.query.skip, 10) : 0,
      };
      
      const history = await this.service.getSaleHistory(itemId, options);
      
      res.status(200).json({
        itemId,
        dateRange: {
          from: options.dateFrom,
          to: options.dateTo
        },
        history
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Calculate profit margin for an item
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async calculateProfitMargin(req, res, next) {
    try {
      const itemId = req.params.id;
      const options = {
        dateFrom: req.query.dateFrom,
        dateTo: req.query.dateTo,
      };
      
      const profitMargin = await this.service.calculateProfitMargin(itemId, options);
      
      res.status(200).json(profitMargin);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create sale items as part of a sale transaction
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async createSaleItems(req, res, next) {
    try {
      const saleId = req.params.saleId;
      const { items } = req.body;
      
      if (!items || !Array.isArray(items) || items.length === 0) {
        return next(createError(400, "Items array is required"));
      }
      
      // Verify sale exists if sale service is available
      if (this.saleService) {
        const sale = await this.saleService.findById(saleId);
        if (!sale) {
          return next(createError(404, `Sale not found with id: ${saleId}`));
        }
      }
      
      const createdItems = await this.service.createSaleItems(items, saleId);
      
      res.status(201).json({
        success: true,
        message: `Created ${createdItems.length} sale items for sale ${saleId}`,
        items: createdItems
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update sale items for a sale transaction
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async updateSaleItems(req, res, next) {
    try {
      const saleId = req.params.saleId;
      const { items } = req.body;
      
      if (!items || !Array.isArray(items)) {
        return next(createError(400, "Items array is required"));
      }
      
      // Verify sale exists if sale service is available
      if (this.saleService) {
        const sale = await this.saleService.findById(saleId);
        if (!sale) {
          return next(createError(404, `Sale not found with id: ${saleId}`));
        }
      }
      
      const updatedItems = await this.service.updateSaleItems(saleId, items);
      
      res.status(200).json({
        success: true,
        message: `Updated sale items for sale ${saleId}`,
        items: updatedItems
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get profit margins summary for multiple items
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getProfitMarginsSummary(req, res, next) {
    try {
      const { itemIds } = req.body;
      
      if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
        return next(createError(400, "Item IDs array is required"));
      }
      
      const options = {
        dateFrom: req.query.dateFrom,
        dateTo: req.query.dateTo,
      };
      
      const profitMargins = await this.service.getProfitMarginsSummary(itemIds, options);
      
      res.status(200).json(profitMargins);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = SaleItemController;