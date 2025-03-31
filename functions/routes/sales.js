const express = require("express");
// eslint-disable-next-line new-cap
const router = express.Router();
const handlerFactory = require("../utils/handlerFactory");
const {validateRequiredFields} = require("../middleware");
// Import providers module but don't immediately call getProviderFactory()
const providers = require("../providers");
const {withTransaction} = require("../utils/transactionUtils");

// Create handlers using factory
const getAllSales = handlerFactory.getAll("Sales");
const getSale = handlerFactory.getOne("Sales", "Sale");
const createSale = handlerFactory.createOne("Sales");
const updateSale = handlerFactory.updateOne("Sales", "Sale");
// const deleteOne = handlerFactory.deleteOne("Sales", "Sale");

// Define a function to get repository (don't call it immediately)
const getSalesRepository = () => providers.getProviderFactory().getSalesRepository();

// Get all sales
router.get("/", async (req, res, next) => {
  try {
    const repository = providers.getProviderFactory().getSalesRepository();
    const sales = await repository.findAll();
    res.status(200).json(sales);
  } catch (error) {
    next(error);
  }
});

// Get single sale
router.get("/:id", async (req, res, next) => {
  try {
    const repository = providers.getProviderFactory().getSalesRepository();
    const sale = await repository.findById(req.params.id);

    if (!sale) {
      return res.status(404).json({
        status: "error",
        message: "Sale not found",
      });
    }

    res.json(sale);
  } catch (err) {
    next(err);
  }
});

// Create new sale
router.post("/",
    validateRequiredFields(["items", "subtotal", "total"]),
    createSale,
);

// Update sale
router.patch("/:id", updateSale);

// Custom delete handler with explicit error handling
router.delete("/:id", async (req, res, next) => {
  try {
    const {id} = req.params;
    const salesRepository = getSalesRepository();
    const sale = await salesRepository.findById(id);

    if (!sale) {
      return res.status(404).json({
        status: "error",
        message: "Sale not found",
      });
    }

    await withTransaction(async (transaction) => {
      // Restore inventory quantities
      await salesRepository.restoreInventoryForSale(sale.items, transaction);

      // Delete the sale
      await salesRepository.delete(id, transaction);
    });

    res.json({
      status: "success",
      message: "Sale deleted successfully",
    });
  } catch (err) {
    next(err);
  }
});

// Get sales report by date range
router.get("/reports/by-date", async (req, res, next) => {
  try {
    const {startDate, endDate} = req.query;
    const filter = {businessId: req.user.businessId};
    const salesRepository = getSalesRepository();

    const report = await salesRepository.getReport(filter, startDate, endDate);
    res.json(report);
  } catch (err) {
    next(err);
  }
});

// Get sales trends
router.get("/trends", async (req, res, next) => {
  try {
    const {startDate, endDate} = req.query;
    const filter = {businessId: req.user.businessId};
    const salesRepository = getSalesRepository();

    if (!startDate || !endDate) {
      return res.status(400).json({message:
        "startDate and endDate are required"});
    }

    const trends = await salesRepository.getTrends(filter, startDate, endDate);
    res.json(trends);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
