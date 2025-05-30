/**
 * Asset Item Controller
 * Handles HTTP requests for asset item operations
 */

const BaseItemController = require("./baseItemController");
const { createError } = require("../utils/errorHandling");

/**
 * Controller for handling asset item related requests
 * @extends BaseItemController
 */
class AssetItemController extends BaseItemController {
  /**
   * Creates a new AssetItemController instance
   * @param {Object} service - Asset item service instance
   */
  constructor(service) {
    super(service);
    this.assetService = null;
  }

  /**
   * Set the asset service dependency
   * @param {Object} service - Asset service instance
   */
  setAssetService(service) {
    this.assetService = service;
  }

  /**
   * Get asset item with linked assets
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getWithAssets(req, res, next) {
    try {
      const assetItemId = req.params.id;
      
      const assetItem = await this.service.getAssetItemWithAssets(assetItemId);
      
      if (!assetItem) {
        return next(createError(404, `Asset item not found with id: ${assetItemId}`));
      }
      
      res.status(200).json(assetItem);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all assets linked to an asset item
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getLinkedAssets(req, res, next) {
    try {
      const assetItemId = req.params.id;
      const options = this.parseQueryOptions(req);
      
      const assets = await this.service.getLinkedAssets(assetItemId, options);
      
      res.status(200).json(assets);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Link assets to an asset item
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async linkAssets(req, res, next) {
    try {
      const assetItemId = req.params.id;
      const { assetIds } = req.body;
      
      if (!assetIds || !Array.isArray(assetIds) || assetIds.length === 0) {
        return next(createError(400, "Asset IDs array is required"));
      }
      
      const result = await this.service.linkAssets(assetItemId, assetIds);
      
      res.status(200).json({
        success: true,
        message: `Linked ${assetIds.length} assets to asset item ${assetItemId}`,
        result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Unlink assets from an asset item
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async unlinkAssets(req, res, next) {
    try {
      const assetItemId = req.params.id;
      const { assetIds } = req.body;
      
      if (!assetIds || !Array.isArray(assetIds) || assetIds.length === 0) {
        return next(createError(400, "Asset IDs array is required"));
      }
      
      const result = await this.service.unlinkAssets(assetItemId, assetIds);
      
      res.status(200).json({
        success: true,
        message: `Unlinked ${assetIds.length} assets from asset item ${assetItemId}`,
        result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Find asset items by asset ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async findByAssetId(req, res, next) {
    try {
      const assetId = req.params.assetId;
      
      const assetItems = await this.service.findByAssetId(assetId);
      
      res.status(200).json(assetItems);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AssetItemController;