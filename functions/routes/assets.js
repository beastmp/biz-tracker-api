const express = require("express");
// eslint-disable-next-line new-cap
const router = express.Router();
const {upload, uploadErrorHandler, uploadToStorage} =
  require("../utils/fileUpload");
const handlerFactory = require("../utils/handlerFactory");
const {processFileUpload} = require("../middleware");
const {getProviderFactory} = require("../providers");
// const {withTransaction} = require("../utils/transactionUtils");
const {getAssetRepository} = require("../utils/repositoryUtils");
const Asset = require("../models/asset"); // Add this import statement

// Create handlers using factory
const getAllAssets = handlerFactory.getAll("Asset");
const getAsset = handlerFactory.getOne("Asset", "Asset");
const createAsset = handlerFactory.createOne("Asset");
const updateAsset = handlerFactory.updateOne("Asset", "Asset");
const deleteAsset = handlerFactory.deleteOne("Asset", "Asset");

// Get repository for special operations
const assetRepository = getProviderFactory().getAssetRepository();

// Get all assets
router.get("/", getAllAssets);

// Get all categories
router.get("/categories", async (req, res, next) => {
  try {
    const categories = await assetRepository.getCategories();
    res.json(categories);
  } catch (err) {
    next(err);
  }
});

// Get all tags
router.get("/tags", async (req, res, next) => {
  try {
    const tags = await assetRepository.getTags();
    res.json(tags);
  } catch (err) {
    next(err);
  }
});

// Create new asset
router.post("/",
    upload.single("image"),
    uploadErrorHandler,
    uploadToStorage,
    processFileUpload,
    createAsset,
);

// Get one asset
router.get("/:id", async (req, res, next) => {
  try {
    const {id} = req.params;
    const asset = await Asset.findById(id);

    if (!asset) {
      console.log(`Asset ${id} not found`);
      return res.status(404).json({message: "Asset not found"});
    }

    return getAsset(req, res, next);
  } catch (err) {
    console.error(`Error fetching asset ${req.params.id}:`, err);
    next(err);
  }
});

// Update asset
router.patch("/:id",
    upload.single("image"),
    uploadErrorHandler,
    uploadToStorage,
    processFileUpload,
    updateAsset,
);

// Upload image for an asset
router.patch("/:id/image",
    upload.single("image"),
    uploadErrorHandler,
    uploadToStorage,
    async (req, res, next) => {
      try {
        if (!req.file || !req.file.storageUrl) {
          return res.status(400).json({message: "No image uploaded"});
        }

        const asset =
          await assetRepository.updateImage(req.params.id, req.file.storageUrl);
        if (!asset) {
          return res.status(404).json({message: "Asset not found"});
        }

        res.json(asset);
      } catch (err) {
        next(err);
      }
    },
);


// Delete asset
router.delete("/:id", deleteAsset);

// Add asset from a purchase
router.post("/from-purchase", async (req, res, next) => {
  try {
    const {purchaseId, itemIndex, assetData} = req.body;

    const purchaseRepository = getAssetRepository().getPurchaseRepository();
    const assetRepository = getAssetRepository();

    // Get the purchase
    const purchase = await purchaseRepository.findById(purchaseId);
    if (!purchase || !purchase.items[itemIndex]) {
      return res.status(404).json({message: "Purchase or item not found"});
    }

    // Create the asset from the purchase item
    const purchaseItem = purchase.items[itemIndex];
    const newAsset = await assetRepository.create({
      ...assetData,
      name: typeof purchaseItem.item === "object" ?
        purchaseItem.item.name : assetData.name,
      initialCost: purchaseItem.totalCost,
      currentValue: purchaseItem.totalCost,
      purchaseId: purchaseId,
      purchaseDate: purchase.purchaseDate,
      status: "active",
      isInventoryItem: false,
    });

    res.status(201).json(newAsset);
  } catch (err) {
    next(err);
  }
});

// Add maintenance record to asset
router.post("/:id/maintenance", async (req, res, next) => {
  try {
    const {id} = req.params;
    const maintenanceData = req.body;

    // Validate required fields
    if (!maintenanceData.date || !maintenanceData.description ||
        !maintenanceData.performedBy || maintenanceData.cost === undefined) {
      return res.status(400).json({
        message: `Required fields missing:
          date, description, performedBy, cost`,
      });
    }

    // Ensure cost is a number
    maintenanceData.cost = parseFloat(maintenanceData.cost);

    const assetRepository = getAssetRepository();
    const updatedAsset =
      await assetRepository.addMaintenanceRecord(id, maintenanceData);

    if (!updatedAsset) {
      return res.status(404).json({message: "Asset not found"});
    }

    res.json(updatedAsset);
  } catch (err) {
    next(err);
  }
});

// Get assets for a specific purchase
router.get("/purchase/:purchaseId", async (req, res, next) => {
  try {
    const {purchaseId} = req.params;
    const assetRepository = getAssetRepository();
    const assets = await assetRepository.getAssetsByPurchase(purchaseId);
    res.json(assets);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
