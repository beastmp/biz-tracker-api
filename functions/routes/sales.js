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
  // Start a transaction to ensure inventory and sale creation are atomic
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Create the sale
    const sale = new Sale(req.body);
    const newSale = await sale.save({session});

    // Update inventory for each item
    for (const saleItem of req.body.items) {
      const item = await Item.findById(saleItem.item);
      if (!item) {
        throw new Error(`Item with ID ${saleItem.item} not found`);
      }

      // Handle inventory update based on tracking type,
      // sale measurement, and price type
      if (saleItem.soldBy === "quantity" && item.trackingType === "quantity") {
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
      } else if (saleItem.soldBy === "weight" &&
          item.trackingType === "weight") {
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
      } else if (saleItem.soldBy === "length" &&
        item.trackingType === "length") {
        // Check if enough length is available
        if (item.length < saleItem.length) {
          throw new Error(
              `Not enough stock for ${item.name}.
             Available: ${item.length} ${item.lengthUnit},
             Requested: ${saleItem.length} ${saleItem.lengthUnit}`,
          );
        }

        // Update inventory length
        await Item.findByIdAndUpdate(
            saleItem.item,
            {$inc: {length: -saleItem.length}, lastUpdated: Date.now()},
            {session, new: true},
        );
      } else if (saleItem.soldBy === "area" && item.trackingType === "area") {
        // Check if enough area is available
        if (item.area < saleItem.area) {
          throw new Error(
              `Not enough stock for ${item.name}.
             Available: ${item.area} ${item.areaUnit},
             Requested: ${saleItem.area} ${saleItem.areaUnit}`,
          );
        }

        // Update inventory area
        await Item.findByIdAndUpdate(
            saleItem.item,
            {$inc: {area: -saleItem.area}, lastUpdated: Date.now()},
            {session, new: true},
        );
      } else if (saleItem.soldBy === "volume" &&
          item.trackingType === "volume") {
        // Check if enough volume is available
        if (item.volume < saleItem.volume) {
          throw new Error(
              `Not enough stock for ${item.name}.
             Available: ${item.volume} ${item.volumeUnit},
             Requested: ${saleItem.volume} ${saleItem.volumeUnit}`,
          );
        }

        // Update inventory volume
        await Item.findByIdAndUpdate(
            saleItem.item,
            {$inc: {volume: -saleItem.volume}, lastUpdated: Date.now()},
            {session, new: true},
        );
      } else {
        throw new Error(`Measurement type mismatch for ${item.name}.
          Item tracks by ${item.trackingType}
            but sale is using ${saleItem.soldBy}`);
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
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Get the original sale for comparison
    const originalSale = await Sale.findById(req.params.id);
    if (!originalSale) {
      return res.status(404).json({message: "Sale not found"});
    }

    // Update the sale
    const updatedSale = await Sale.findByIdAndUpdate(
        req.params.id,
        {...req.body, updatedAt: Date.now()},
        {session, new: true},
    ).populate("items.item");

    // Handle inventory adjustments if items changed
    if (req.body.items) {
      // Create maps of sale items by item ID for comparison
      const originalItems = new Map();
      originalSale.items.forEach((item) => {
        originalItems.set(item.item.toString(), {
          quantity: item.quantity || 0,
          weight: item.weight || 0,
          length: item.length || 0,
          area: item.area || 0,
          volume: item.volume || 0,
          soldBy: item.soldBy || "quantity",
        });
      });

      const newItems = new Map();
      req.body.items.forEach((item) => {
        newItems.set(item.item.toString(), {
          quantity: item.quantity || 0,
          weight: item.weight || 0,
          length: item.length || 0,
          area: item.area || 0,
          volume: item.volume || 0,
          soldBy: item.soldBy || "quantity",
        });
      });

      // Adjust inventory based on differences between old and new sale
      const allItemIds = new Set([...originalItems.keys(), ...newItems.keys()]);
      for (const itemId of allItemIds) {
        const originalVals = originalItems.get(itemId) || {
          quantity: 0, weight: 0, length: 0, area: 0, volume: 0,
          soldBy: "quantity",
        };

        const newVals = newItems.get(itemId) || {
          quantity: 0, weight: 0, length: 0, area: 0, volume: 0,
          soldBy: "quantity",
        };

        // Calculate differences for all measurement types
        const quantityDiff = originalVals.quantity - newVals.quantity;
        const weightDiff = originalVals.weight - newVals.weight;
        const lengthDiff = originalVals.length - newVals.length;
        const areaDiff = originalVals.area - newVals.area;
        const volumeDiff = originalVals.volume - newVals.volume;

        // Only update if there's a difference
        if (quantityDiff !== 0 || weightDiff !== 0 || lengthDiff !== 0 ||
            areaDiff !== 0 || volumeDiff !== 0) {
          const item = await Item.findById(itemId);
          if (item) {
            const updateData = {lastUpdated: Date.now()};

            // Set the appropriate increment based on the item's tracking type
            if (item.trackingType === "quantity" && quantityDiff !== 0) {
              updateData.$inc = {quantity: quantityDiff};
            } else if (item.trackingType === "weight" && weightDiff !== 0) {
              updateData.$inc = {weight: weightDiff};
            } else if (item.trackingType === "length" && lengthDiff !== 0) {
              updateData.$inc = {length: lengthDiff};
            } else if (item.trackingType === "area" && areaDiff !== 0) {
              updateData.$inc = {area: areaDiff};
            } else if (item.trackingType === "volume" && volumeDiff !== 0) {
              updateData.$inc = {volume: volumeDiff};
            }

            if (updateData.$inc) {
              await Item.findByIdAndUpdate(itemId, updateData, {session});
            }
          }
        }
      }
    }

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    res.json(updatedSale);
  } catch (err) {
    // Abort transaction on error
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({message: err.message});
  }
});

// Delete sale
router.delete("/:id", async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Find the sale to be deleted
    const sale = await Sale.findById(req.params.id);
    if (!sale) {
      return res.status(404).json({message: "Sale not found"});
    }

    // Restore inventory quantities for each item in the sale
    for (const saleItem of sale.items) {
      const item = await Item.findById(saleItem.item);
      if (!item) continue; // Skip if item no longer exists

      // Restore inventory based on measurement type
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
      } else if (item.trackingType === "length" && saleItem.length) {
        await Item.findByIdAndUpdate(
            saleItem.item,
            {$inc: {length: saleItem.length}, lastUpdated: Date.now()},
            {session, new: true},
        );
      } else if (item.trackingType === "area" && saleItem.area) {
        await Item.findByIdAndUpdate(
            saleItem.item,
            {$inc: {area: saleItem.area}, lastUpdated: Date.now()},
            {session, new: true},
        );
      } else if (item.trackingType === "volume" && saleItem.volume) {
        await Item.findByIdAndUpdate(
            saleItem.item,
            {$inc: {volume: saleItem.volume}, lastUpdated: Date.now()},
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

router.get("/trends", async (req, res) => {
  try {
    const {startDate, endDate} = req.query;

    // Validate dates
    if (!startDate || !endDate) {
      return res.status(400).json({error:
        "Start date and end date are required"});
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Aggregate sales data with measurement type breakdowns
    const trends = await Sale.aggregate([
      {
        $match: {
          createdAt: {$gte: start, $lte: end},
          businessId: req.user.businessId,
        },
      },
      {
        $group: {
          _id: {$dateToString: {format: "%Y-%m-%d", date: "$createdAt"}},
          totalSales: {$sum: 1},
          totalRevenue: {$sum: "$total"},
          // Group items by measurement type
          measurementBreakdown: {
            $push: {
              items: "$items",
            },
          },
        },
      },
      {$sort: {"_id": 1}},
    ]);

    // Process measurement breakdowns
    const processedTrends = trends.map((day) => {
      const measurementBreakdown = {
        quantity: {count: 0, total: 0},
        weight: {count: 0, total: 0},
        length: {count: 0, total: 0},
        area: {count: 0, total: 0},
        volume: {count: 0, total: 0},
      };

      // Process all items from all sales for this day
      day.measurementBreakdown.forEach((sale) => {
        sale.items.forEach((item) => {
          const soldBy = item.soldBy || "quantity";
          if (!measurementBreakdown[soldBy]) {
            measurementBreakdown[soldBy] = {count: 0, total: 0};
          }

          measurementBreakdown[soldBy].count += 1;

          // Calculate item total based on measurement type
          let itemTotal = 0;
          if (soldBy === "quantity") {
            itemTotal = item.priceAtSale * item.quantity;
          } else if (soldBy === "weight") {
            itemTotal = item.priceAtSale * item.weight;
          } else if (soldBy === "length") {
            itemTotal = item.priceAtSale * item.length;
          } else if (soldBy === "area") {
            itemTotal = item.priceAtSale * item.area;
          } else if (soldBy === "volume") {
            itemTotal = item.priceAtSale * item.volume;
          }

          measurementBreakdown[soldBy].total += itemTotal;
        });
      });

      return {
        date: day._id,
        totalSales: day.totalSales,
        totalRevenue: day.totalRevenue,
        measurementBreakdown,
      };
    });

    res.json(processedTrends);
  } catch (error) {
    console.error("Error fetching sales trends:", error);
    res.status(500).json({error: "Failed to fetch sales trends"});
  }
});

module.exports = router;
