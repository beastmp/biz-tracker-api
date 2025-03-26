const express = require("express");
// eslint-disable-next-line new-cap
const router = express.Router();
const mongoose = require("mongoose");
const Purchase = require("../models/purchase");
const Item = require("../models/item");

// Get all purchases
router.get("/", async (req, res) => {
  try {
    const purchases = await Purchase.find().populate("items.item");
    res.json(purchases);
  } catch (err) {
    res.status(500).json({message: err.message});
  }
});

// Get single purchase
router.get("/:id", async (req, res) => {
  try {
    const purchase =
      await Purchase.findById(req.params.id).populate("items.item");
    if (!purchase) return res.status(404).json({message: "Purchase not found"});
    res.json(purchase);
  } catch (err) {
    res.status(500).json({message: err.message});
  }
});

// Create new purchase
router.post("/", async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Create the purchase
    const purchase = new Purchase(req.body);
    const newPurchase = await purchase.save({session});

    // Enhance the purchase item processing logic (around line 39-65)
    // Update inventory for each item
    for (const purchaseItem of req.body.items) {
      const item = await Item.findById(purchaseItem.item);
      if (!item) {
        throw new Error(`Item with ID ${purchaseItem.item} not found`);
      }

      // Calculate inventory quantities based on pack information
      let actualQuantity = purchaseItem.quantity;
      let actualCostPerUnit = purchaseItem.costPerUnit;

      // If this is a material with pack info, adjust quantities
      if ((item.itemType === "material" || item.itemType === "both") &&
          item.packInfo && item.packInfo.isPack === true) {
        // Calculate actual units to add (packs × units per pack)
        actualQuantity = purchaseItem.quantity * item.packInfo.unitsPerPack;

        // Calculate the true cost per individual unit
        actualCostPerUnit = purchaseItem.costPerUnit /
          item.packInfo.unitsPerPack;
      }

      // Handle inventory update based on tracking type and price type
      if (item.trackingType === "quantity") {
        // Update inventory with the calculated actual quantity
        await Item.findByIdAndUpdate(
            purchaseItem.item,
            {$inc: {quantity: actualQuantity}, lastUpdated: Date.now()},
            {session, new: true},
        );
      } else if (item.trackingType === "weight") {
        // Adjust the logic for weight-tracked items as well
        if (item.priceType === "each") {
          await Item.findByIdAndUpdate(
              purchaseItem.item,
              {
                $inc: {
                  weight: purchaseItem.weight *
                    actualQuantity, // Total weight adjusted for packs
                  quantity: actualQuantity, // Adjusted quantity
                },
                lastUpdated: Date.now(),
              },
              {session, new: true},
          );
        } else {
          await Item.findByIdAndUpdate(
              purchaseItem.item,
              {$inc: {weight: purchaseItem.weight}, lastUpdated: Date.now()},
              {session, new: true},
          );
        }
      }

      // Update the item's cost with the correct per-unit cost
      await Item.findByIdAndUpdate(
          purchaseItem.item,
          {
            cost: actualCostPerUnit,
            lastUpdated: Date.now(),
          },
          {session, new: true},
      );

      // Also update packInfo.costPerUnit directly with the calculated value
      if ((item.itemType === "material" || item.itemType === "both") &&
          item.packInfo && item.packInfo.isPack === true) {
        await Item.findByIdAndUpdate(
            purchaseItem.item,
            {
              "packInfo.costPerUnit": actualCostPerUnit,
            },
            {session, new: true},
        );
      }
    }

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    // Return the new purchase with populated items
    const populatedPurchase =
      await Purchase.findById(newPurchase._id).populate("items.item");
    res.status(201).json(populatedPurchase);
  } catch (err) {
    // Abort transaction on error
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({message: err.message});
  }
});

// Update purchase
router.patch("/:id", async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Get the original purchase for comparison
    const originalPurchase = await Purchase.findById(req.params.id);
    if (!originalPurchase) {
      return res.status(404).json({message: "Purchase not found"});
    }

    // Update the purchase
    const updatedPurchase = await Purchase.findByIdAndUpdate(
        req.params.id,
        {...req.body, updatedAt: Date.now()},
        {session, new: true},
    ).populate("items.item");

    // Handle inventory adjustments if items changed
    if (req.body.items) {
      // Create maps of quantities by item ID for comparison
      const originalItems = new Map();
      originalPurchase.items.forEach((item) => {
        if (item.item.toString() in originalItems) {
          if (item.quantity) {
            originalItems.get(item.item.toString()).quantity += item.quantity;
          }
          if (item.weight) {
            originalItems.get(item.item.toString()).weight += item.weight;
          }
        } else {
          originalItems.set(item.item.toString(), {
            quantity: item.quantity || 0,
            weight: item.weight || 0,
          });
        }
      });

      const newItems = new Map();
      req.body.items.forEach((item) => {
        if (item.item.toString() in newItems) {
          if (item.quantity) {
            newItems.get(item.item.toString()).quantity += item.quantity;
          }
          if (item.weight) {
            newItems.get(item.item.toString()).weight += item.weight;
          }
        } else {
          newItems.set(item.item.toString(), {
            quantity: item.quantity || 0,
            weight: item.weight || 0,
          });
        }
      });

      // Adjust inventory based on differences
      const allItemIds = new Set([...originalItems.keys(), ...newItems.keys()]);
      for (const itemId of allItemIds) {
        const originalVals =
          originalItems.get(itemId) || {quantity: 0, weight: 0};
        const newVals = newItems.get(itemId) || {quantity: 0, weight: 0};

        const quantityDiff = newVals.quantity - originalVals.quantity;
        const weightDiff = newVals.weight - originalVals.weight;

        if (quantityDiff !== 0 || weightDiff !== 0) {
          const item = await Item.findById(itemId);

          if (item) {
            const updateData = {lastUpdated: Date.now()};

            if (item.trackingType === "quantity" && quantityDiff !== 0) {
              updateData.$inc = {quantity: quantityDiff};
            } else if (item.trackingType === "weight" && weightDiff !== 0) {
              updateData.$inc = {weight: weightDiff};
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

    res.json(updatedPurchase);
  } catch (err) {
    // Abort transaction on error
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({message: err.message});
  }
});

// Delete purchase
router.delete("/:id", async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Get the purchase to be deleted
    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) {
      return res.status(404).json({message: "Purchase not found"});
    }

    // Revert inventory quantities
    // for each item in the purchase if status is "received"
    if (purchase.status === "received" ||
        purchase.status === "partially_received") {
      for (const purchaseItem of purchase.items) {
        const item = await Item.findById(purchaseItem.item);
        if (!item) continue; // Skip if item no longer exists

        if (item.trackingType === "quantity" && purchaseItem.quantity) {
          await Item.findByIdAndUpdate(
              purchaseItem.item,
              {$inc: {quantity: -purchaseItem.quantity},
                lastUpdated: Date.now()},
              {session, new: true},
          );
        } else if (item.trackingType === "weight" && purchaseItem.weight) {
          await Item.findByIdAndUpdate(
              purchaseItem.item,
              {$inc: {weight: -purchaseItem.weight}, lastUpdated: Date.now()},
              {session, new: true},
          );
        }
      }
    }

    // Delete the purchase
    await Purchase.findByIdAndDelete(req.params.id, {session});

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    res.json({message: "Purchase deleted and inventory adjusted"});
  } catch (err) {
    // Abort transaction on error
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({message: err.message});
  }
});

// Get purchases report by date range
router.get("/reports/by-date", async (req, res) => {
  try {
    const {startDate, endDate} = req.query;
    const query = {};

    if (startDate || endDate) {
      query.purchaseDate = {};
      if (startDate) query.purchaseDate.$gte = new Date(startDate);
      if (endDate) query.purchaseDate.$lte = new Date(endDate);
    }

    const purchases = await Purchase.find(query).populate("items.item");

    const report = {
      totalPurchases: purchases.length,
      totalCost: purchases.length > 0 ?
        purchases.reduce((sum, purchase) => sum + purchase.total, 0) : 0,
      averagePurchaseValue: purchases.length > 0 ?
        purchases.reduce((sum, purchase) =>
          sum + purchase.total, 0) / purchases.length : 0,
      purchases: purchases || [],
    };

    res.json(report);
  } catch (err) {
    res.status(500).json({
      message: err.message,
      totalPurchases: 0,
      totalCost: 0,
      averagePurchaseValue: 0,
      purchases: [],
    });
  }
});

module.exports = router;
