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
    if (!purchase) {
      return res.status(404).json({message: "Purchase not found"});
    }

    // You may want to add a virtual property or transformer
    // that shows a summary of discounts
    const itemDiscountTotal = purchase.items.reduce(
        (sum, item) => sum + (item.discountAmount || 0), 0,
    );

    // Add a summary property to the response
    const result = purchase.toObject();
    result.summary = {
      itemDiscountTotal: parseFloat(itemDiscountTotal.toFixed(2)),
      totalDiscount: parseFloat((itemDiscountTotal +
        purchase.discountAmount).toFixed(2)),
    };

    res.json(result);
  } catch (err) {
    console.error("Error fetching purchase:", err);
    res.status(500).json({message: err.message});
  }
});

// Create new purchase - add handling for the new measurement types
router.post("/", async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Verify or calculate purchase totals based on items including discounts
    if (req.body.items && req.body.items.length > 0) {
      let calculatedSubtotal = 0;

      // Process each item and verify calculations
      req.body.items.forEach((item) => {
        // Calculate base amount before discount
        let baseItemAmount = 0;
        switch (item.purchasedBy) {
          case "weight":
            baseItemAmount = item.weight * item.costPerUnit;
            break;
          case "length":
            baseItemAmount = item.length * item.costPerUnit;
            break;
          case "area":
            baseItemAmount = item.area * item.costPerUnit;
            break;
          case "volume":
            baseItemAmount = item.volume * item.costPerUnit;
            break;
          default: // quantity
            baseItemAmount = item.quantity * item.costPerUnit;
        }

        // Set discounts if not provided
        if (item.discountAmount === undefined) item.discountAmount = 0;
        if (item.discountPercentage === undefined) item.discountPercentage = 0;

        // Validate and ensure discount calculations are correct
        if (item.discountPercentage > 0) {
          // If percentage is specified, calculate amount
          item.discountAmount = (item.discountPercentage / 100) *
            baseItemAmount;
        } else if (item.discountAmount > 0) {
          // If amount is specified, calculate percentage
          item.discountPercentage = baseItemAmount > 0 ?
            (item.discountAmount / baseItemAmount) * 100 : 0;
        }

        // Ensure total cost reflects the discount
        const calculatedTotalCost = Math.max(0, baseItemAmount -
          item.discountAmount);
        item.totalCost = parseFloat(calculatedTotalCost.toFixed(2));

        // Add to running subtotal
        calculatedSubtotal += item.totalCost;
      });

      // Set the subtotal
      req.body.subtotal = parseFloat(calculatedSubtotal.toFixed(2));

      // Calculate final total with purchase-level adjustments
      const taxAmount = (req.body.taxRate / 100) * req.body.subtotal;
      const calculatedTotal = req.body.subtotal -
        (req.body.discountAmount || 0) +
          taxAmount + (req.body.shippingCost || 0);
      req.body.total = parseFloat(calculatedTotal.toFixed(2));
      req.body.taxAmount = parseFloat(taxAmount.toFixed(2));
    }

    // Create the purchase with updated calculations
    const purchase = new Purchase(req.body);
    const newPurchase = await purchase.save({session});

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

      // Handle inventory update based on tracking type and purchase measurement
      if (item.trackingType === "quantity" &&
          purchaseItem.purchasedBy === "quantity") {
        // Update inventory with the calculated actual quantity
        await Item.findByIdAndUpdate(
            purchaseItem.item,
            {$inc: {quantity: actualQuantity}, lastUpdated: Date.now()},
            {session, new: true},
        );
      } else if (item.trackingType === "weight" &&
          purchaseItem.purchasedBy === "weight") {
        // Update inventory weight
        await Item.findByIdAndUpdate(
            purchaseItem.item,
            {$inc: {weight: purchaseItem.weight}, lastUpdated: Date.now()},
            {session, new: true},
        );
      } else if (item.trackingType === "length" &&
          purchaseItem.purchasedBy === "length") {
        // Update inventory length
        await Item.findByIdAndUpdate(
            purchaseItem.item,
            {$inc: {length: purchaseItem.length}, lastUpdated: Date.now()},
            {session, new: true},
        );
      } else if (item.trackingType === "area" &&
          purchaseItem.purchasedBy === "area") {
        // Update inventory area
        await Item.findByIdAndUpdate(
            purchaseItem.item,
            {$inc: {area: purchaseItem.area}, lastUpdated: Date.now()},
            {session, new: true},
        );
      } else if (item.trackingType === "volume" &&
          purchaseItem.purchasedBy === "volume") {
        // Update inventory volume
        await Item.findByIdAndUpdate(
            purchaseItem.item,
            {$inc: {volume: purchaseItem.volume}, lastUpdated: Date.now()},
            {session, new: true},
        );
      } else {
        throw new Error(`Measurement type mismatch for ${item.name}.
          Item tracks by ${item.trackingType}
          but purchase is using ${purchaseItem.purchasedBy}`);
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
    // Get the original purchase for inventory comparison
    const originalPurchase = await Purchase.findById(req.params.id);
    if (!originalPurchase) {
      return res.status(404).json({message: "Purchase not found"});
    }

    // Process items with discounts if they're in the request
    if (req.body.items && req.body.items.length > 0) {
      let calculatedSubtotal = 0;

      // Process each item and verify calculations
      req.body.items.forEach((item) => {
        // Calculate base amount before discount
        let baseItemAmount = 0;
        switch (item.purchasedBy) {
          case "weight":
            baseItemAmount = item.weight * item.costPerUnit;
            break;
          case "length":
            baseItemAmount = item.length * item.costPerUnit;
            break;
          case "area":
            baseItemAmount = item.area * item.costPerUnit;
            break;
          case "volume":
            baseItemAmount = item.volume * item.costPerUnit;
            break;
          default: // quantity
            baseItemAmount = item.quantity * item.costPerUnit;
        }

        // Set discounts if not provided
        if (item.discountAmount === undefined) item.discountAmount = 0;
        if (item.discountPercentage === undefined) item.discountPercentage = 0;

        // Validate and ensure discount calculations are correct
        if (item.discountPercentage > 0) {
          // If percentage is specified, calculate amount
          item.discountAmount = (item.discountPercentage / 100) *
            baseItemAmount;
        } else if (item.discountAmount > 0) {
          // If amount is specified, calculate percentage
          item.discountPercentage = baseItemAmount > 0 ?
            (item.discountAmount / baseItemAmount) * 100 : 0;
        }

        // Ensure total cost reflects the discount
        const calculatedTotalCost = Math.max(0, baseItemAmount -
          item.discountAmount);
        item.totalCost = parseFloat(calculatedTotalCost.toFixed(2));

        // Add to running subtotal
        calculatedSubtotal += item.totalCost;
      });

      // Set the subtotal
      req.body.subtotal = parseFloat(calculatedSubtotal.toFixed(2));

      // Calculate final total with purchase-level adjustments
      const taxAmount = ((req.body.taxRate || 0) / 100) * req.body.subtotal;
      const calculatedTotal = req.body.subtotal -
        (req.body.discountAmount || 0) + taxAmount +
          (req.body.shippingCost || 0);
      req.body.total = parseFloat(calculatedTotal.toFixed(2));
      req.body.taxAmount = parseFloat(taxAmount.toFixed(2));
    }

    // Update the purchase with the modified data
    const updatedPurchase = await Purchase.findByIdAndUpdate(
        req.params.id,
        {...req.body, updatedAt: Date.now()},
        {session, new: true},
    ).populate("items.item");

    // Handle inventory adjustments if items changed
    if (req.body.items) {
      // Create maps of measurements by item ID for comparison
      const originalItems = new Map();
      originalPurchase.items.forEach((item) => {
        originalItems.set(item.item.toString(), {
          quantity: item.quantity || 0,
          weight: item.weight || 0,
          length: item.length || 0,
          area: item.area || 0,
          volume: item.volume || 0,
          purchasedBy: item.purchasedBy || "quantity",
        });
      });

      const newItems = new Map();
      req.body.items.forEach((item) => {
        // Ensure item.item is converted to string properly,
        // even if it's an object
        const itemId = item.item && item.item._id ? item.item._id.toString() :
        item.item.toString();
        newItems.set(itemId, {
          quantity: item.quantity || 0,
          weight: item.weight || 0,
          length: item.length || 0,
          area: item.area || 0,
          volume: item.volume || 0,
          purchasedBy: item.purchasedBy || "quantity",
        });
      });

      // Adjust inventory based on differences
      const allItemIds = new Set([...originalItems.keys(), ...newItems.keys()]);
      for (const itemId of allItemIds) {
        const originalVals = originalItems.get(itemId) || {
          quantity: 0, weight: 0, length: 0, area: 0, volume: 0,
          purchasedBy: "quantity",
        };
        const newVals = newItems.get(itemId) || {
          quantity: 0, weight: 0, length: 0, area: 0, volume: 0,
          purchasedBy: "quantity",
        };

        // Calculate differences for all measurement types
        const quantityDiff = newVals.quantity - originalVals.quantity;
        const weightDiff = newVals.weight - originalVals.weight;
        const lengthDiff = newVals.length - originalVals.length;
        const areaDiff = newVals.area - originalVals.area;
        const volumeDiff = newVals.volume - originalVals.volume;

        // Only update if there's a difference
        if (quantityDiff !== 0 || weightDiff !== 0 || lengthDiff !== 0 ||
            areaDiff !== 0 || volumeDiff !== 0) {
          try {
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
          } catch (err) {
            console.error(`Error updating item ${itemId}:`, err.message);
            // Continue with other items even if this one fails
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
        } else if (item.trackingType === "length" && purchaseItem.length) {
          await Item.findByIdAndUpdate(
              purchaseItem.item,
              {$inc: {length: -purchaseItem.length}, lastUpdated: Date.now()},
              {session, new: true},
          );
        } else if (item.trackingType === "area" && purchaseItem.area) {
          await Item.findByIdAndUpdate(
              purchaseItem.item,
              {$inc: {area: -purchaseItem.area}, lastUpdated: Date.now()},
              {session, new: true},
          );
        } else if (item.trackingType === "volume" && purchaseItem.volume) {
          await Item.findByIdAndUpdate(
              purchaseItem.item,
              {$inc: {volume: -purchaseItem.volume}, lastUpdated: Date.now()},
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
