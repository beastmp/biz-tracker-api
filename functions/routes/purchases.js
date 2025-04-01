const express = require("express");
// eslint-disable-next-line new-cap
const router = express.Router();
const handlerFactory = require("../utils/handlerFactory");
const {validateRequiredFields} = require("../middleware");
const {getProviderFactory} = require("../providers");

// Create handlers using factory
const getAllPurchases = handlerFactory.getAll("Purchase");
// const getPurchase = handlerFactory.getOne("Purchase", "Purchase");
const createPurchase = handlerFactory.createOne("Purchase");
const updatePurchase = handlerFactory.updateOne("Purchase", "Purchase");
const deletePurchase = handlerFactory.deleteOne("Purchase", "Purchase");

// Get repository for special operations
const purchaseRepository = getProviderFactory().getPurchaseRepository();

// Get all purchases
router.get("/", getAllPurchases);

// Get single purchase
router.get("/:id", async (req, res, next) => {
  try {
    const purchase = await purchaseRepository.findById(req.params.id);

    if (!purchase) {
      return res.status(404).json({message: "Purchase not found"});
    }

    // Add summary data to response
    const result = purchase.toObject ? purchase.toObject() : {...purchase};

    // Calculate item discount total
    const itemDiscountTotal = purchase.items.reduce(
        (sum, item) => sum + (item.discountAmount || 0), 0,
    );

    result.summary = {
      itemDiscountTotal: parseFloat(itemDiscountTotal.toFixed(2)),
      totalDiscount: parseFloat((itemDiscountTotal +
        purchase.discountAmount).toFixed(2)),
    };

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Create new purchase
router.post("/",
    validateRequiredFields(["supplier.name", "items"]),
    createPurchase,
);

// Update purchase
router.patch("/:id", updatePurchase);

// Delete purchase
router.delete("/:id", deletePurchase);

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

module.exports = router;
