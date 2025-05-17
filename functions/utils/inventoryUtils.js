/**
 * Inventory Utilities Module
 *
 * This module provides functions for recalculating and rebuilding inventory
 * quantities, costs, and other tracking metrics based on purchase and sales
 * history. It enables correcting inventory discrepancies and ensuring
 * accurate records.
 *
 * @module inventoryUtils
 * @requires ./errors
 */
const {NotFoundError} = require("../validation/errors");

/**
 * Rebuilds inventory quantities, costs and prices for all items based on
 * their purchase and sales history. This function handles all tracking types
 * (quantity, weight, length, area, volume) and processes items in batches
 * to avoid timeouts.
 *
 * @async
 * @param {Object} providers - Repository providers needed for the operation
 * @param {Object} providers.itemRepository - Item repository instance
 * @param {Object} providers.purchaseRepository - Purchase repository instance
 * @param {Object} providers.salesRepository - Sales repository instance
 * @param {Object} [options={}] - Options to control the rebuild process
 * @param {number} [options.batchSize=50] - Number of items to process in each batch
 * @return {Promise<Object>} Results of the rebuild operation including counts
 *                          of processed, updated and error items
 *
 * @example
 * // Rebuild inventory for all items
 * const results = await rebuildInventory({
 *   itemRepository,
 *   purchaseRepository,
 *   salesRepository
 * }, { batchSize: 100 });
 *
 * // results = {
 * //   processed: 250,   // total items processed
 * //   updated: 72,      // items that needed updates
 * //   errors: 3,        // items that encountered errors
 * //   details: [...]    // details for each updated/error item
 * // }
 */
async function rebuildInventory(providers, options = {}) {
  const {itemRepository} = providers;
  const batchSize = options.batchSize || 50;

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
        console.error(`Error rebuilding inventory
          for item ${item._id}:`, error);
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
    console.log(`Processed ${Math.min(i + batchSize, items.length)}
      of ${items.length} items`);
  }

  return results;
}

/**
 * Rebuilds inventory data for a specific item based on its purchase and sales history
 *
 * This function calculates the accurate quantity, cost, and price for an item by
 * analyzing all purchases where the item was received and all sales where the item
 * was sold. It handles all tracking types (quantity, weight, length, area, volume)
 * and updates the item only if changes are needed.
 *
 * @async
 * @param {string} itemId - ID of the item to rebuild inventory for
 * @param {Object} providers - Repository providers needed for the operation
 * @param {Object} providers.itemRepository - Item repository instance
 * @param {Object} providers.purchaseRepository - Purchase repository instance
 * @param {Object} providers.salesRepository - Sales repository instance
 * @throws {NotFoundError} When the specified item ID doesn't exist
 * @return {Promise<Object>} Results of the rebuild operation for this item
 *
 * @example
 * // Rebuild inventory for a specific item
 * const result = await rebuildItemInventory("item123", {
 *   itemRepository,
 *   purchaseRepository,
 *   salesRepository
 * });
 *
 * // result = {
 * //   itemId: "item123",
 * //   name: "Raw Material X",
 * //   sku: "RM-X-001",
 * //   updated: true,
 * //   changes: {
 * //     quantity: {
 * //       from: 10,
 * //       to: 15,
 * //       purchasedQuantity: 25,
 * //       soldQuantity: 10
 * //     },
 * //     cost: {
 * //       from: 12.50,
 * //       to: 13.75,
 * //       source: "Maximum cost from purchase abc123..."
 * //     }
 * //   }
 * // }
 */
async function rebuildItemInventory(itemId, providers) {
  const {itemRepository, purchaseRepository, salesRepository} = providers;

  console.log(`Rebuilding inventory for item: ${itemId}`);

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
  console.log(`Found ${purchases.length} purchases for item ${itemId}`);

  // Filter to only include received purchases
  const receivedPurchases = purchases.filter((p) => p.status === "received");
  console.log(`Found ${receivedPurchases.length}
    received purchases for item ${itemId}`);

  // 2. Get all sales for this item
  const sales = await salesRepository.getAllByItemId(itemId);
  // Filter to only include completed sales
  const completedSales = sales.filter((s) => s.status === "completed");

  // 3. Calculate inventory quantity based on tracking type
  let newQuantity = 0;

  // Handle different tracking types
  switch (item.trackingType) {
    case "quantity": {
      // Collect ALL matching purchase items across all purchases
      let allPurchaseItems = [];
      for (const purchase of receivedPurchases) {
        // Find ALL matching items in this purchase (there could be multiple)
        const matchingItems = purchase.items.filter((i) =>
          (i.item && typeof i.item === "object" &&
            i.item._id && i.item._id.toString() === itemId) ||
          (i.item && typeof i.item === "string" && i.item === itemId),
        );

        if (matchingItems.length > 0) {
          console.log(`Found ${matchingItems.length}
            matching items in purchase ${purchase._id}`);
          allPurchaseItems = [...allPurchaseItems, ...matchingItems];
        }
      }

      // Calculate total purchased quantity from all matching items
      const purchasedQuantity = allPurchaseItems.reduce((total, item) =>
        total + (item.quantity || 0), 0);

      console.log(`Total purchased quantity for item
        ${itemId}: ${purchasedQuantity}`);

      // Collect ALL matching sale items across all sales
      let allSaleItems = [];
      for (const sale of completedSales) {
        const matchingItems = sale.items.filter((i) =>
          (i.item && typeof i.item === "object" &&
            i.item._id && i.item._id.toString() === itemId) ||
          (i.item && typeof i.item === "string" && i.item === itemId),
        );

        if (matchingItems.length > 0) {
          allSaleItems = [...allSaleItems, ...matchingItems];
        }
      }

      // Calculate total sold quantity from all matching items
      const soldQuantity = allSaleItems.reduce((total, item) =>
        total + (item.quantity || 0), 0);

      newQuantity = Math.max(0, purchasedQuantity - soldQuantity);
      console.log(`Calculated new quantity: ${newQuantity}
        (purchased: ${purchasedQuantity}, sold: ${soldQuantity})`);

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
      // Use the same pattern for weight-tracked items
      let allPurchaseItems = [];
      for (const purchase of receivedPurchases) {
        const matchingItems = purchase.items.filter((i) =>
          (i.item && typeof i.item === "object" &&
            i.item._id && i.item._id.toString() === itemId) ||
          (i.item && typeof i.item === "string" && i.item === itemId),
        );

        if (matchingItems.length > 0) {
          allPurchaseItems = [...allPurchaseItems, ...matchingItems];
        }
      }

      const purchasedWeight = allPurchaseItems.reduce((total, item) =>
        total + (item.weight || 0), 0);

      let allSaleItems = [];
      for (const sale of completedSales) {
        const matchingItems = sale.items.filter((i) =>
          (i.item && typeof i.item === "object" &&
            i.item._id && i.item._id.toString() === itemId) ||
          (i.item && typeof i.item === "string" && i.item === itemId),
        );

        if (matchingItems.length > 0) {
          allSaleItems = [...allSaleItems, ...matchingItems];
        }
      }

      const soldWeight = allSaleItems.reduce((total, item) =>
        total + (item.weight || 0), 0);

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

    // Apply the same pattern to the other tracking types
    case "length": {
      // Handle length using same approach as quantity and weight
      let allPurchaseItems = [];
      for (const purchase of receivedPurchases) {
        const matchingItems = purchase.items.filter((i) =>
          (i.item && typeof i.item === "object" &&
            i.item._id && i.item._id.toString() === itemId) ||
          (i.item && typeof i.item === "string" && i.item === itemId),
        );

        if (matchingItems.length > 0) {
          allPurchaseItems = [...allPurchaseItems, ...matchingItems];
        }
      }

      const purchasedLength = allPurchaseItems.reduce((total, item) =>
        total + (item.length || 0), 0);

      let allSaleItems = [];
      for (const sale of completedSales) {
        const matchingItems = sale.items.filter((i) =>
          (i.item && typeof i.item === "object" &&
            i.item._id && i.item._id.toString() === itemId) ||
          (i.item && typeof i.item === "string" && i.item === itemId),
        );

        if (matchingItems.length > 0) {
          allSaleItems = [...allSaleItems, ...matchingItems];
        }
      }

      const soldLength = allSaleItems.reduce((total, item) =>
        total + (item.length || 0), 0);

      newQuantity = Math.max(0, purchasedLength - soldLength);
      console.log(`Calculated new length: ${newQuantity}
        (purchased: ${purchasedLength}, sold: ${soldLength})`);

      if (item.length !== newQuantity) {
        item.length = newQuantity;
        result.updated = true;
        result.changes.length = {
          from: originalQuantity,
          to: newQuantity,
          purchasedLength,
          soldLength,
        };
      }
      break;
    }

    case "area": {
      // Handle area using same approach
      let allPurchaseItems = [];
      for (const purchase of receivedPurchases) {
        const matchingItems = purchase.items.filter((i) =>
          (i.item && typeof i.item === "object" &&
            i.item._id && i.item._id.toString() === itemId) ||
          (i.item && typeof i.item === "string" && i.item === itemId),
        );

        if (matchingItems.length > 0) {
          allPurchaseItems = [...allPurchaseItems, ...matchingItems];
        }
      }

      const purchasedArea = allPurchaseItems.reduce((total, item) =>
        total + (item.area || 0), 0);

      let allSaleItems = [];
      for (const sale of completedSales) {
        const matchingItems = sale.items.filter((i) =>
          (i.item && typeof i.item === "object" &&
            i.item._id && i.item._id.toString() === itemId) ||
          (i.item && typeof i.item === "string" && i.item === itemId),
        );

        if (matchingItems.length > 0) {
          allSaleItems = [...allSaleItems, ...matchingItems];
        }
      }

      const soldArea = allSaleItems.reduce((total, item) =>
        total + (item.area || 0), 0);

      newQuantity = Math.max(0, purchasedArea - soldArea);
      console.log(`Calculated new area: ${newQuantity}
        (purchased: ${purchasedArea}, sold: ${soldArea})`);

      if (item.area !== newQuantity) {
        item.area = newQuantity;
        result.updated = true;
        result.changes.area = {
          from: originalQuantity,
          to: newQuantity,
          purchasedArea,
          soldArea,
        };
      }
      break;
    }

    case "volume": {
      // Handle volume using same approach
      let allPurchaseItems = [];
      for (const purchase of receivedPurchases) {
        const matchingItems = purchase.items.filter((i) =>
          (i.item && typeof i.item === "object" &&
            i.item._id && i.item._id.toString() === itemId) ||
          (i.item && typeof i.item === "string" && i.item === itemId),
        );

        if (matchingItems.length > 0) {
          allPurchaseItems = [...allPurchaseItems, ...matchingItems];
        }
      }

      const purchasedVolume = allPurchaseItems.reduce((total, item) =>
        total + (item.volume || 0), 0);

      let allSaleItems = [];
      for (const sale of completedSales) {
        const matchingItems = sale.items.filter((i) =>
          (i.item && typeof i.item === "object" &&
            i.item._id && i.item._id.toString() === itemId) ||
          (i.item && typeof i.item === "string" && i.item === itemId),
        );

        if (matchingItems.length > 0) {
          allSaleItems = [...allSaleItems, ...matchingItems];
        }
      }

      const soldVolume = allSaleItems.reduce((total, item) =>
        total + (item.volume || 0), 0);

      newQuantity = Math.max(0, purchasedVolume - soldVolume);
      console.log(`Calculated new volume: ${newQuantity}
        (purchased: ${purchasedVolume}, sold: ${soldVolume})`);

      if (item.volume !== newQuantity) {
        item.volume = newQuantity;
        result.updated = true;
        result.changes.volume = {
          from: originalQuantity,
          to: newQuantity,
          purchasedVolume,
          soldVolume,
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

    // Find ALL matching items in the purchase (there could be multiple)
    const purchaseItems = latestPurchase.items.filter((i) =>
      (i.item && typeof i.item === "object" && i.item._id &&
        i.item._id.toString() === itemId) ||
      (i.item && typeof i.item === "string" && i.item === itemId),
    );

    if (purchaseItems.length > 0) {
      console.log(`Found ${purchaseItems.length} matching items
        in latest purchase ${latestPurchase._id}`);

      // Calculate cost per unit for each matching item
      const itemCosts = purchaseItems.map((purchaseItem) => {
        let costPerUnit = null;

        if (purchaseItem.costPerUnit) {
          // Use the cost per unit directly if available
          costPerUnit = purchaseItem.costPerUnit;
        } else if (purchaseItem.totalCost &&
                 (purchaseItem.quantity || purchaseItem.weight ||
                  purchaseItem.length || purchaseItem.area ||
                  purchaseItem.volume)) {
          // Calculate cost per unit based on tracking type
          const divisor =
            item.trackingType === "quantity" ? purchaseItem.quantity :
            item.trackingType === "weight" ? purchaseItem.weight :
            item.trackingType === "length" ? purchaseItem.length :
            item.trackingType === "area" ? purchaseItem.area :
            item.trackingType === "volume" ? purchaseItem.volume : 1;

          if (divisor > 0) {
            costPerUnit = purchaseItem.totalCost / divisor;
          }
        }

        return costPerUnit;
      }).filter((cost) => cost !== null);

      // Find the maximum cost among all matching items
      if (itemCosts.length > 0) {
        const maxCostPerUnit = Math.max(...itemCosts);
        console.log(`Calculated costs: [${itemCosts.join(", ")}],
         using maximum: ${maxCostPerUnit}`);

        // Update cost if we have a valid value and it's changed
        if (item.cost !== maxCostPerUnit) {
          item.cost = maxCostPerUnit;
          result.updated = true;
          result.changes.cost = {
            from: originalCost,
            to: maxCostPerUnit,
            source: `Maximum cost from purchase ${latestPurchase._id}
              (${new Date(latestPurchase.purchaseDate).toLocaleDateString()})`,
            allCosts: itemCosts,
          };

          // Also update the selling price to match the cost
          if (item.price !== maxCostPerUnit) {
            item.price = maxCostPerUnit;
            result.changes.price = {
              from: originalPrice,
              to: maxCostPerUnit,
            };
          }
        }
      }
    }
  }

  // 5. Save the updated item if there were changes
  if (result.updated) {
    console.log(`Updating item ${itemId} with new values`);
    // Mark item as last updated now
    item.lastUpdated = new Date();
    await itemRepository.update(itemId, item);
  } else {
    console.log(`No changes needed for item ${itemId}`);
  }

  return result;
}

module.exports = {
  rebuildInventory,
  rebuildItemInventory,
};
