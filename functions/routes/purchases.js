const express = require("express");
// eslint-disable-next-line new-cap
const router = express.Router();
const {getProviderFactory} = require("../providers");
const {getPurchaseRepository} = require("../utils/repositoryUtils");
const {getAssetRepository} = require("../utils/repositoryUtils");
const {withTransaction} = require("../utils/transactionUtils");

// Get repository for special operations
const purchaseRepository = getProviderFactory().getPurchaseRepository();

// Get all purchases
router.get("/", async (req, res, next) => {
  try {
    const purchaseRepository = getPurchaseRepository();
    const purchases = await purchaseRepository.findAll();
    res.json(purchases);
  } catch (err) {
    next(err);
  }
});

// Get single purchase
router.get("/:id", async (req, res, next) => {
  try {
    const {id} = req.params;
    const purchaseRepository = getPurchaseRepository();
    const purchase = await purchaseRepository.findById(id);

    if (!purchase) {
      return res.status(404).json({message: "Purchase not found"});
    }

    res.json(purchase);
  } catch (err) {
    next(err);
  }
});

// Create new purchase
router.post("/", async (req, res, next) => {
  try {
    const purchaseData = req.body;
    const purchaseRepository = getPurchaseRepository();

    // If the status is 'received', we'll want to process any asset items
    const shouldProcessAssets = purchaseData.status === "received";

    const newPurchase = await withTransaction(async (transaction) => {
      const purchase =
        await purchaseRepository.create(purchaseData, transaction);

      // If purchase is received and has asset items, create assets
      if (shouldProcessAssets) {
        await createAssetsFromPurchase(purchase._id, transaction);
      }

      return purchase;
    });

    res.status(201).json(newPurchase);
  } catch (err) {
    next(err);
  }
});

// Update purchase
router.patch("/:id", async (req, res, next) => {
  try {
    const {id} = req.params;
    const purchaseData = req.body;
    const purchaseRepository = getPurchaseRepository();

    // Check if the purchase is being marked as received
    const purchase = await purchaseRepository.findById(id);
    if (!purchase) {
      return res.status(404).json({message: "Purchase not found"});
    }

    const isNewlyReceived =
      purchase.status !== "received" &&
      purchaseData.status === "received";

    const updatedPurchase = await withTransaction(async (transaction) => {
      const updated =
        await purchaseRepository.update(id, purchaseData, transaction);

      // If purchase is newly marked as received
      // and has asset items, create assets
      if (isNewlyReceived) {
        await createAssetsFromPurchase(id, transaction);
      }

      return updated;
    });

    if (!updatedPurchase) {
      return res.status(404).json({message: "Purchase not found"});
    }

    res.json(updatedPurchase);
  } catch (err) {
    next(err);
  }
});

// Delete purchase
router.delete("/:id", async (req, res, next) => {
  try {
    const {id} = req.params;
    const purchaseRepository = getPurchaseRepository();

    const result = await purchaseRepository.delete(id);

    if (!result) {
      return res.status(404).json({message: "Purchase not found"});
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// Get purchases report by date range
router.get("/reports/by-date", async (req, res, next) => {
  try {
    const {startDate, endDate} = req.query;
    const filter = {};

    const report =
      await purchaseRepository.getReport(filter, startDate, endDate);
    res.json(report);
  } catch (err) {
    next(err);
  }
});

// Get purchase trends
router.get("/trends", async (req, res, next) => {
  try {
    const {startDate, endDate} = req.query;
    const filter = {};

    if (!startDate || !endDate) {
      return res.status(400).json({message:
        "startDate and endDate are required"});
    }

    const trends =
      await purchaseRepository.getTrends(filter, startDate, endDate);
    res.json(trends);
  } catch (err) {
    next(err);
  }
});

// Get purchases for a specific item
router.get("/item/:itemId", async (req, res, next) => {
  try {
    const {itemId} = req.params;
    const purchaseRepository = getProviderFactory().getPurchaseRepository();
    const purchases = await purchaseRepository.getAllByItemId(itemId);
    res.json(purchases);
  } catch (err) {
    next(err);
  }
});

/**
 * Creates asset records for items marked as assets in a purchase
 * @param {string} purchaseId - The ID of the purchase containing asset items
 * @param {Object} transaction - The database transaction object
 * @return {Promise<void>}
 */
async function createAssetsFromPurchase(purchaseId, transaction) {
  const purchaseRepository = getPurchaseRepository();
  const assetRepository = getAssetRepository();

  // Get the purchase with its items
  const purchase = await purchaseRepository.findById(purchaseId);
  if (!purchase) return;

  // Find items marked as assets
  const assetItems = purchase.items.filter((item) => item.isAsset);
  if (assetItems.length === 0) return;

  // Create an asset for each asset item
  for (const [index, item] of assetItems.entries()) {
    const itemObj = typeof item.item === "object" ?
      item.item :
      {name: `Item ${index + 1}`};

    await assetRepository.create({
      name: (item.assetInfo && item.assetInfo.name) || itemObj.name,
      category: (item.assetInfo && item.assetInfo.category) || "Equipment",
      initialCost: item.totalCost,
      currentValue: item.totalCost,
      purchaseId: purchaseId,
      purchaseDate: purchase.purchaseDate,
      status: "active",
      location: item.assetInfo ? item.assetInfo.location : undefined,
      assignedTo: item.assetInfo ? item.assetInfo.assignedTo : undefined,
      isInventoryItem: false,
    }, transaction);
  }
}

module.exports = router;
