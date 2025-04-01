const express = require("express");
const router = express.Router();
const {getAssetRepository} = require("../utils/repositoryUtils");
const {upload, uploadErrorHandler, uploadToStorage} = require("../utils/fileUpload");
const {processFileUpload} = require("../middleware");

// Get all business assets
router.get("/", async (req, res, next) => {
  try {
    const assetRepository = getAssetRepository();
    const assets = await assetRepository.findAll();
    res.json(assets);
  } catch (err) {
    next(err);
  }
});

// Get all categories
router.get("/categories", async (req, res, next) => {
  try {
    const assetRepository = getAssetRepository();
    const categories = await assetRepository.getCategories();
    res.json(categories);
  } catch (err) {
    next(err);
  }
});

// Get a single asset by ID
router.get("/:id", async (req, res, next) => {
  try {
    const {id} = req.params;
    const assetRepository = getAssetRepository();
    const asset = await assetRepository.findById(id);

    if (!asset) {
      return res.status(404).json({message: "Asset not found"});
    }

    res.json(asset);
  } catch (err) {
    next(err);
  }
});

// Create a new asset
router.post("/",
    upload.single("image"),
    uploadErrorHandler,
    uploadToStorage,
    processFileUpload,
    async (req, res, next) => {
      try {
        // If there's uploaded image, get URL from the middleware
        if (req.file && req.file.storageUrl) {
          req.body.imageUrl = req.file.storageUrl;
        }

        // Convert tags from JSON string if needed
        if (typeof req.body.tags === "string") {
          try {
            req.body.tags = JSON.parse(req.body.tags);
          } catch (e) {
            // If not valid JSON, leave as is or remove
            delete req.body.tags;
          }
        }

        // Handle maintenance schedule if it exists as a string
        if (typeof req.body.maintenanceSchedule === "string") {
          try {
            req.body.maintenanceSchedule = JSON.parse(req.body.maintenanceSchedule);
          } catch (e) {
            delete req.body.maintenanceSchedule;
          }
        }

        // Parse numeric values
        if (req.body.initialCost) req.body.initialCost = parseFloat(req.body.initialCost);
        if (req.body.currentValue) req.body.currentValue = parseFloat(req.body.currentValue);

        const assetRepository = getAssetRepository();
        const newAsset = await assetRepository.create(req.body);
        res.status(201).json(newAsset);
      } catch (err) {
        next(err);
      }
    },
);

// Update an asset
router.put("/:id",
    upload.single("image"),
    uploadErrorHandler,
    uploadToStorage,
    processFileUpload,
    async (req, res, next) => {
      try {
        const {id} = req.params;

        // If there's uploaded image, get URL from the middleware
        if (req.file && req.file.storageUrl) {
          req.body.imageUrl = req.file.storageUrl;
        }

        // Convert tags from JSON string if needed
        if (typeof req.body.tags === "string") {
          try {
            req.body.tags = JSON.parse(req.body.tags);
          } catch (e) {
            // If not valid JSON, leave as is or remove
            delete req.body.tags;
          }
        }

        // Handle maintenance schedule if it exists as a string
        if (typeof req.body.maintenanceSchedule === "string") {
          try {
            req.body.maintenanceSchedule = JSON.parse(req.body.maintenanceSchedule);
          } catch (e) {
            delete req.body.maintenanceSchedule;
          }
        }

        // Parse numeric values
        if (req.body.initialCost) req.body.initialCost = parseFloat(req.body.initialCost);
        if (req.body.currentValue) req.body.currentValue = parseFloat(req.body.currentValue);

        const assetRepository = getAssetRepository();
        const updatedAsset = await assetRepository.update(id, req.body);

        if (!updatedAsset) {
          return res.status(404).json({message: "Asset not found"});
        }

        res.json(updatedAsset);
      } catch (err) {
        next(err);
      }
    },
);

// Delete an asset
router.delete("/:id", async (req, res, next) => {
  try {
    const {id} = req.params;
    const assetRepository = getAssetRepository();
    const result = await assetRepository.delete(id);

    if (!result) {
      return res.status(404).json({message: "Asset not found"});
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

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
      name: typeof purchaseItem.item === "object" ? purchaseItem.item.name : assetData.name,
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
        message: "Required fields missing: date, description, performedBy, cost",
      });
    }

    // Ensure cost is a number
    maintenanceData.cost = parseFloat(maintenanceData.cost);

    const assetRepository = getAssetRepository();
    const updatedAsset = await assetRepository.addMaintenanceRecord(id, maintenanceData);

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
