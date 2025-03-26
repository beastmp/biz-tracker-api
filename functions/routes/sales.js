const express = require("express");
// eslint-disable-next-line new-cap
const router = express.Router();
const mongoose = require("mongoose");
const Sale = require("../models/sale");
const Item = require("../models/item"); // Changed from invItem to Item

// Get all sales
router.get("/", async (req, res) => {
  try {
    const sales = await Sale.find().populate("items.item");
    res.json(sales);
  } catch (err) {
    res.status(500).json({message: err.message});
  }
});

// Get single sale
router.get("/:id", async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id).populate("items.item");
    if (!sale) return res.status(404).json({message: "Sale not found"});
    res.json(sale);
  } catch (err) {
    res.status(500).json({message: err.message});
  }
});

// Create new sale
router.post("/", async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Create the sale
    // eslint-disable-next-line new-cap
    const sale = new Sale(req.body);
    const newSale = await sale.save({session});

    // Update inventory for each item
    for (const saleItem of req.body.items) {
      const item = await Item.findById(saleItem.item);
      if (!item) {
        throw new Error(`Item with ID ${saleItem.item} not found`);
      }

      // Handle inventory update based on tracking type and price type
      if (item.trackingType === "quantity") {
        // Check if enough stock is available
        if (item.quantity < saleItem.quantity) {
          throw new Error(
              `Not enough stock for ${item.name}.
               Available: ${item.quantity},
               Requested: ${saleItem.quantity}`,
          );
        }

        // Update inventory quantity
        await Item.findByIdAndUpdate(
            saleItem.item,
            {$inc: {quantity: -saleItem.quantity}, lastUpdated: Date.now()},
            {session, new: true},
        );
      } else if (item.trackingType === "weight") {
        if (item.priceType === "each") {
          // Check if enough items are available
          if (item.quantity < saleItem.quantity) {
            throw new Error(
                `Not enough stock for ${item.name}.
                  Available: ${item.quantity},
                  Requested: ${saleItem.quantity}`,
            );
          }

          // Calculate weight per item
          const weightPerItem = item.weight / item.quantity;
          const totalWeightToDeduct = weightPerItem * saleItem.quantity;

          // Update both weight and quantity
          await Item.findByIdAndUpdate(
              saleItem.item,
              {
                $inc: {
                  weight: -totalWeightToDeduct, // Deduct the correct weight
                  quantity: -saleItem.quantity, // Deduct number of items
                },
                lastUpdated: Date.now(),
              },
              {session, new: true},
          );
        } else {
          // Check if enough weight is available
          if (item.weight < saleItem.weight) {
            throw new Error(
                `Not enough stock for ${item.name}.
                 Available: ${item.weight} ${item.weightUnit},
                 Requested: ${saleItem.weight} ${saleItem.weightUnit}`,
            );
          }

          // Update inventory weight
          await Item.findByIdAndUpdate(
              saleItem.item,
              {$inc: {weight: -saleItem.weight}, lastUpdated: Date.now()},
              {session, new: true},
          );
        }
      }
    }

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    // Return the new sale with populated items
    const populatedSale =
      await Sale.findById(newSale._id).populate("items.item");
    res.status(201).json(populatedSale);
  } catch (err) {
    // Abort transaction on error
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({message: err.message});
  }
});

// Update sale
router.patch("/:id", async (req, res) => {
  try {
    // For simplicity, we"re not handling inventory adjustments on updates
    // In a production app, you"d need to handle inventory changes
    const sale = await Sale
        .findByIdAndUpdate(req.params.id,
            {...req.body, updatedAt: Date.now()}, {new: true})
        .populate("items.item");

    if (!sale) return res.status(404).json({message: "Sale not found"});
    res.json(sale);
  } catch (err) {
    res.status(400).json({message: err.message});
  }
});

// Delete sale
router.delete("/:id", async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Get the sale to be deleted
    const sale = await Sale.findById(req.params.id);
    if (!sale) {
      return res.status(404).json({message: "Sale not found"});
    }

    // Restore inventory quantities for each item in the sale
    for (const saleItem of sale.items) {
      const item = await Item.findById(saleItem.item);
      if (!item) continue; // Skip if item no longer exists

      if (item.trackingType === "quantity" && saleItem.quantity) {
        await Item.findByIdAndUpdate(
            saleItem.item,
            {$inc: {quantity: saleItem.quantity}, lastUpdated: Date.now()},
            {session, new: true},
        );
      } else if (item.trackingType === "weight" && saleItem.weight) {
        await Item.findByIdAndUpdate(
            saleItem.item,
            {$inc: {weight: saleItem.weight}, lastUpdated: Date.now()},
            {session, new: true},
        );
      }
    }

    // Delete the sale
    await Sale.findByIdAndDelete(req.params.id, {session});

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    res.json({message: "Sale deleted and inventory restored"});
  } catch (err) {
    // Abort transaction on error
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({message: err.message});
  }
});

// Get sales report by date range
router.get("/reports/by-date", async (req, res) => {
  try {
    const {startDate, endDate} = req.query;
    const query = {};

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const sales = await Sale.find(query).populate("items.item");

    const report = {
      totalSales: sales.length,
      totalRevenue: sales.length > 0 ?
        sales.reduce((sum, sale) => sum + sale.total, 0) : 0,
      averageOrderValue: sales.length > 0 ?
        sales.reduce((sum, sale) => sum + sale.total, 0) / sales.length : 0,
      sales: sales || [],
    };

    res.json(report);
  } catch (err) {
    res.status(500).json({
      message: err.message,
      totalSales: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
      sales: [],
    });
  }
});

module.exports = router;
