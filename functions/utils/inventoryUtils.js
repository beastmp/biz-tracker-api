const {NotFoundError} = require("./errors");

/**
 * Rebuilds inventory quantities, costs and prices based on purchase and sales history
 * @param {Object} providers - Provider instances
 * @param {Object} options - Options for rebuilding (batchSize, etc.)
 * @return {Promise<Object>} - Results of the rebuild operation
 */
async function rebuildInventory(providers, options = {}) {
  const {itemRepository, purchaseRepository, salesRepository} = providers;
  const batchSize = options.batchSize || 50; // Process items in batches of 50 by default

  // Get all items
  const items = await itemRepository.findAll();

  // Results tracking
  const results = {
    processed: 0,
    updated: 0,
    errors: 0,
    details: [],
  };

  // Process items in batches to avoid timeout issues
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    // Process each item in the current batch
    const batchPromises = batch.map(async (item) => {
      try {
        const itemId = item._id.toString();
        const result = await rebuildItemInventory(itemId, providers);

        // Update result counters
        results.processed++;
        if (result.updated) {
          results.updated++;
          results.details.push(result);
        }

        return result;
      } catch (error) {
        console.error(`Error rebuilding inventory for item ${item._id}:`, error);
        results.errors++;
        results.details.push({
          itemId: item._id,
          name: item.name,
          error: error.message,
        });
        return null;
      }
    });

    // Wait for the current batch to complete before moving to the next
    await Promise.all(batchPromises);

    // Log progress to help with debugging timeouts
    console.log(`Processed ${Math.min(i + batchSize, items.length)} of ${items.length} items`);
  }

  return results;
}

/**
 * Rebuild inventory for a specific item
 * @param {string} itemId - ID of the item to rebuild
 * @param {Object} providers - Provider instances
 * @return {Promise<Object>} - Results of the rebuild operation
 */
async function rebuildItemInventory(itemId, providers) {
  const {itemRepository, purchaseRepository, salesRepository} = providers;

  // Get the item
  const item = await itemRepository.findById(itemId);
  if (!item) {
    throw new NotFoundError(`Item with ID ${itemId} not found`);
  }

  // Results object
  const result = {
    itemId: item._id.toString(),
    name: item.name,
    sku: item.sku,
    updated: false,
    changes: {},
  };

  // Store original values for comparison later
  const originalQuantity = item.trackingType === "quantity" ? item.quantity :
                          item.trackingType === "weight" ? item.weight :
                          item.trackingType === "length" ? item.length :
                          item.trackingType === "area" ? item.area :
                          item.trackingType === "volume" ? item.volume : 0;
  const originalCost = item.cost || 0;
  const originalPrice = item.price || 0;

  // 1. Get all purchases for this item
  const purchases = await purchaseRepository.getAllByItemId(itemId);
  // Filter to only include received purchases
  const receivedPurchases = purchases.filter((p) => p.status === "received");

  // 2. Get all sales for this item
  const sales = await salesRepository.getAllByItemId(itemId);
  // Filter to only include completed sales
  const completedSales = sales.filter((s) => s.status === "completed");

  // 3. Calculate inventory quantity based on tracking type
  let newQuantity = 0;

  // Handle different tracking types
  switch (item.trackingType) {
    case "quantity": {
      // Sum quantities from received purchases
      const purchasedQuantity = receivedPurchases.reduce((total, purchase) => {
        const purchaseItem = purchase.items.find((i) =>
          (i.item && typeof i.item === "object" && i.item._id && i.item._id.toString() === itemId) ||
          (i.item && typeof i.item === "string" && i.item === itemId),
        );
        return purchaseItem ? total + (purchaseItem.quantity || 0) : total;
      }, 0);

      // Subtract quantities from completed sales
      const soldQuantity = completedSales.reduce((total, sale) => {
        const saleItem = sale.items.find((i) =>
          (i.item && typeof i.item === "object" && i.item._id && i.item._id.toString() === itemId) ||
          (i.item && typeof i.item === "string" && i.item === itemId),
        );
        return saleItem ? total + (saleItem.quantity || 0) : total;
      }, 0);

      newQuantity = Math.max(0, purchasedQuantity - soldQuantity);

      // Update if quantity changed
      if (item.quantity !== newQuantity) {
        item.quantity = newQuantity;
        result.updated = true;
        result.changes.quantity = {
          from: originalQuantity,
          to: newQuantity,
          purchasedQuantity,
          soldQuantity,
        };
      }
      break;
    }
    case "weight": {
      // Sum weights from received purchases
      const purchasedWeight = receivedPurchases.reduce((total, purchase) => {
        const purchaseItem = purchase.items.find((i) =>
          (i.item && typeof i.item === "object" && i.item._id && i.item._id.toString() === itemId) ||
          (i.item && typeof i.item === "string" && i.item === itemId),
        );
        return purchaseItem ? total + (purchaseItem.weight || 0) : total;
      }, 0);

      // Subtract weights from completed sales
      const soldWeight = completedSales.reduce((total, sale) => {
        const saleItem = sale.items.find((i) =>
          (i.item && typeof i.item === "object" && i.item._id && i.item._id.toString() === itemId) ||
          (i.item && typeof i.item === "string" && i.item === itemId),
        );
        return saleItem ? total + (saleItem.weight || 0) : total;
      }, 0);

      newQuantity = Math.max(0, purchasedWeight - soldWeight);

      // Update if weight changed
      if (item.weight !== newQuantity) {
        item.weight = newQuantity;
        result.updated = true;
        result.changes.weight = {
          from: originalQuantity,
          to: newQuantity,
          purchasedWeight,
          soldWeight,
        };
      }
      break;
    }
    // Similar implementation for other tracking types
    case "length": {
      // Handle length similarly
      const purchasedLength = receivedPurchases.reduce((total, purchase) => {
        const purchaseItem = purchase.items.find((i) =>
          (i.item && typeof i.item === "object" && i.item._id && i.item._id.toString() === itemId) ||
          (i.item && typeof i.item === "string" && i.item === itemId),
        );
        return purchaseItem ? total + (purchaseItem.length || 0) : total;
      }, 0);

      const soldLength = completedSales.reduce((total, sale) => {
        const saleItem = sale.items.find((i) =>
          (i.item && typeof i.item === "object" && i.item._id && i.item._id.toString() === itemId) ||
          (i.item && typeof i.item === "string" && i.item === itemId),
        );
        return saleItem ? total + (saleItem.length || 0) : total;
      }, 0);

      newQuantity = Math.max(0, purchasedLength - soldLength);

      if (item.length !== newQuantity) {
        item.length = newQuantity;
        result.updated = true;
        result.changes.length = {
          from: originalQuantity,
          to: newQuantity,
        };
      }
      break;
    }
    case "area": {
      // Handle area similarly
      const purchasedArea = receivedPurchases.reduce((total, purchase) => {
        const purchaseItem = purchase.items.find((i) =>
          (i.item && typeof i.item === "object" && i.item._id && i.item._id.toString() === itemId) ||
          (i.item && typeof i.item === "string" && i.item === itemId),
        );
        return purchaseItem ? total + (purchaseItem.area || 0) : total;
      }, 0);

      const soldArea = completedSales.reduce((total, sale) => {
        const saleItem = sale.items.find((i) =>
          (i.item && typeof i.item === "object" && i.item._id && i.item._id.toString() === itemId) ||
          (i.item && typeof i.item === "string" && i.item === itemId),
        );
        return saleItem ? total + (saleItem.area || 0) : total;
      }, 0);

      newQuantity = Math.max(0, purchasedArea - soldArea);

      if (item.area !== newQuantity) {
        item.area = newQuantity;
        result.updated = true;
        result.changes.area = {
          from: originalQuantity,
          to: newQuantity,
        };
      }
      break;
    }
    case "volume": {
      // Handle volume similarly
      const purchasedVolume = receivedPurchases.reduce((total, purchase) => {
        const purchaseItem = purchase.items.find((i) =>
          (i.item && typeof i.item === "object" && i.item._id && i.item._id.toString() === itemId) ||
          (i.item && typeof i.item === "string" && i.item === itemId),
        );
        return purchaseItem ? total + (purchaseItem.volume || 0) : total;
      }, 0);

      const soldVolume = completedSales.reduce((total, sale) => {
        const saleItem = sale.items.find((i) =>
          (i.item && typeof i.item === "object" && i.item._id && i.item._id.toString() === itemId) ||
          (i.item && typeof i.item === "string" && i.item === itemId),
        );
        return saleItem ? total + (saleItem.volume || 0) : total;
      }, 0);

      newQuantity = Math.max(0, purchasedVolume - soldVolume);

      if (item.volume !== newQuantity) {
        item.volume = newQuantity;
        result.updated = true;
        result.changes.volume = {
          from: originalQuantity,
          to: newQuantity,
        };
      }
      break;
    }
  }

  // 4. Calculate cost and price based on most recent purchase
  if (receivedPurchases.length > 0) {
    // Sort purchases by date, most recent first
    const sortedPurchases = [...receivedPurchases].sort((a, b) =>
      new Date(b.purchaseDate) - new Date(a.purchaseDate),
    );

    // Get the most recent purchase
    const latestPurchase = sortedPurchases[0];

    // Find this item in the purchase
    const purchaseItem = latestPurchase.items.find((i) =>
      (i.item && typeof i.item === "object" && i.item._id && i.item._id.toString() === itemId) ||
      (i.item && typeof i.item === "string" && i.item === itemId),
    );

    if (purchaseItem) {
      // Calculate cost per unit
      let costPerUnit = null;

      if (purchaseItem.costPerUnit) {
        // Use the cost per unit directly if available
        costPerUnit = purchaseItem.costPerUnit;
      } else if (purchaseItem.totalCost &&
                (purchaseItem.quantity || purchaseItem.weight || purchaseItem.length ||
                 purchaseItem.area || purchaseItem.volume)) {
        // Calculate cost per unit based on tracking type
        const divisor = item.trackingType === "quantity" ? purchaseItem.quantity :
                        item.trackingType === "weight" ? purchaseItem.weight :
                        item.trackingType === "length" ? purchaseItem.length :
                        item.trackingType === "area" ? purchaseItem.area :
                        item.trackingType === "volume" ? purchaseItem.volume : 1;

        if (divisor > 0) {
          costPerUnit = purchaseItem.totalCost / divisor;
        }
      }

      // Update cost if we have a valid value and it's changed
      if (costPerUnit !== null && item.cost !== costPerUnit) {
        item.cost = costPerUnit;
        result.updated = true;
        result.changes.cost = {
          from: originalCost,
          to: costPerUnit,
          source: `Purchase ${latestPurchase._id} (${new Date(latestPurchase.purchaseDate).toLocaleDateString()})`,
        };

        // Also update the selling price to match the cost
        if (item.price !== costPerUnit) {
          item.price = costPerUnit;
          result.changes.price = {
            from: originalPrice,
            to: costPerUnit,
          };
        }
      }
    }
  }

  // 5. Save the updated item if there were changes
  if (result.updated) {
    // Mark item as last updated now
    item.lastUpdated = new Date();
    await itemRepository.update(itemId, item);
  }

  return result;
}

module.exports = {
  rebuildInventory,
  rebuildItemInventory,
};
