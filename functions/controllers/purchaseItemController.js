/**
 * Purchase Item Controller
 * Handles HTTP requests for purchase item operations
 */

const BaseItemController = require("./baseItemController");
const { createError } = require("../utils/errorHandling");

/**
 * Controller for handling purchase item related requests
 * @extends BaseItemController
 */
class PurchaseItemController extends BaseItemController {
  /**
   * Creates a new PurchaseItemController instance
   * @param {Object} service - Purchase item service instance
   */
  constructor(service) {
    super(service);
    this.purchaseService = null;
  }

  /**
   * Set the purchase service dependency
   * @param {Object} service - Purchase service instance
   */
  setPurchaseService(service) {
    this.purchaseService = service;
  }

  /**
   * Find purchase items by purchase ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async findByPurchaseId(req, res, next) {
    try {
      const purchaseId = req.params.purchaseId;
      const options = this.parseQueryOptions(req);
      
      const purchaseItems = await this.service.findByPurchaseId(purchaseId, options);
      
      res.status(200).json(purchaseItems);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get items with purchase history
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getItemsWithPurchaseHistory(req, res, next) {
    try {
      const options = this.parseQueryOptions(req);
      
      const items = await this.service.getItemsWithPurchaseHistory(options);
      
      res.status(200).json(items);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Calculate average purchase cost
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async calculateAveragePurchaseCost(req, res, next) {
    try {
      const itemId = req.params.id;
      const options = {
        dateFrom: req.query.dateFrom,
        dateTo: req.query.dateTo,
        limit: req.query.limit ? parseInt(req.query.limit, 10) : undefined,
      };
      
      const avgCost = await this.service.calculateAveragePurchaseCost(itemId, options);
      
      res.status(200).json({
        itemId,
        averagePurchaseCost: avgCost,
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
   * Get purchase history for an item
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getPurchaseHistory(req, res, next) {
    try {
      const itemId = req.params.id;
      const options = {
        dateFrom: req.query.dateFrom,
        dateTo: req.query.dateTo,
        limit: req.query.limit ? parseInt(req.query.limit, 10) : undefined,
        skip: req.query.skip ? parseInt(req.query.skip, 10) : 0,
      };
      
      const history = await this.service.getPurchaseHistory(itemId, options);
      
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
   * Create purchase items as part of a purchase transaction
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async createPurchaseItems(req, res, next) {
    try {
      const purchaseId = req.params.purchaseId;
      const { items } = req.body;
      
      if (!items || !Array.isArray(items) || items.length === 0) {
        return next(createError(400, "Items array is required"));
      }
      
      // Verify purchase exists if purchase service is available
      if (this.purchaseService) {
        const purchase = await this.purchaseService.findById(purchaseId);
        if (!purchase) {
          return next(createError(404, `Purchase not found with id: ${purchaseId}`));
        }
      }
      
      const createdItems = await this.service.createPurchaseItems(items, purchaseId);
      
      res.status(201).json({
        success: true,
        message: `Created ${createdItems.length} purchase items for purchase ${purchaseId}`,
        items: createdItems
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update purchase items for a purchase transaction
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async updatePurchaseItems(req, res, next) {
    try {
      const purchaseId = req.params.purchaseId;
      const { items } = req.body;
      
      if (!items || !Array.isArray(items)) {
        return next(createError(400, "Items array is required"));
      }
      
      // Verify purchase exists if purchase service is available
      if (this.purchaseService) {
        const purchase = await this.purchaseService.findById(purchaseId);
        if (!purchase) {
          return next(createError(404, `Purchase not found with id: ${purchaseId}`));
        }
      }
      
      const updatedItems = await this.service.updatePurchaseItems(purchaseId, items);
      
      res.status(200).json({
        success: true,
        message: `Updated purchase items for purchase ${purchaseId}`,
        items: updatedItems
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = PurchaseItemController;