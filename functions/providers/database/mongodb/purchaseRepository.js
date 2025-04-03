const {BasePurchaseRepository} = require("../../base");
const Purchase = require("../../../models/purchase");

/**
 * MongoDB implementation of PurchaseRepository
 */
class MongoPurchaseRepository extends BasePurchaseRepository {
  /**
   * Creates a new instance of MongoPurchaseRepository
   * @constructor
   */
  constructor() {
    super();
    this.itemRepository = null; // Will be set by ProviderFactory
  }

  /**
   * Find all purchases matching filter criteria
   * @param {Object} filter Query filters
   * @return {Promise<Array>} List of purchases
   */
  async findAll(filter = {}) {
    return await Purchase.find(filter).sort({purchaseDate: -1});
  }

  /**
   * Find purchase by ID
   * @param {string} id Purchase ID
   * @return {Promise<Object|null>} Purchase object or null if not found
   */
  async findById(id) {
    return await Purchase.findById(id);
  }

  /**
   * Create a new purchase
   * @param {Object} purchaseData Purchase data
   * @param {Object} [transaction] Database transaction/session
   * @return {Promise<Object>} Created purchase
   */
  async create(purchaseData, transaction) {
    const options = transaction ? {session: transaction} : {};
    const purchase = new Purchase(purchaseData);

    await purchase.save(options);

    // Update inventory quantities for the purchased items
    // Only update if status indicates items were received
    if (purchase.status === "received" || purchase.status === "partially_received") {
      await this.updateInventoryForPurchase(purchase.items, transaction);
    }

    return purchase;
  }

  /**
   * Update an existing purchase
   * @param {string} id Purchase ID
   * @param {Object} purchaseData Updated purchase data
   * @param {Object} [transaction] Database transaction/session
   * @return {Promise<Object|null>} Updated purchase or null if not found
   */
  async update(id, purchaseData, transaction) {
    const options = transaction ? {session: transaction} : {};

    const purchase = await Purchase.findById(id);
    if (!purchase) return null;

    // Update all provided fields
    Object.keys(purchaseData).forEach((key) => {
      purchase[key] = purchaseData[key];
    });

    await purchase.save(options);
    return purchase;
  }

  /**
   * Delete a purchase
   * @param {string} id Purchase ID
   * @param {Object} [transaction] Database transaction/session
   * @return {Promise<boolean>} True if deleted, false if not found
   */
  async delete(id, transaction) {
    const options = transaction ? {session: transaction} : {};
    const result = await Purchase.findByIdAndDelete(id, options);

    return !!result;
  }

  /**
   * Update inventory when creating a purchase
   * @param {Array} items Items in the purchase
   * @param {Object} [transaction] Database transaction/session
   * @return {Promise<void>}
   */
  async updateInventoryForPurchase(items, transaction) {
    if (!this.itemRepository) {
      throw new Error(`ItemRepository not available in MongoPurchaseRepository`);
    }

    console.log(`Starting inventory update for ${items && items.length || 0} purchase items`);

    // Exit early if no items to process
    if (!items || items.length === 0) {
      console.log("No items to update inventory for");
      return [];
    }

    // Group items by item ID to consolidate updates for the same item
    const itemGroups = {};

    // First pass: group items by their ID
    for (const purchaseItem of items) {
      if (!purchaseItem.item) {
        console.warn("Skipping purchase item with no item reference");
        continue;
      }

      const itemId = typeof purchaseItem.item === "object" ?
        purchaseItem.item._id.toString() : purchaseItem.item.toString();

      if (!itemGroups[itemId]) {
        itemGroups[itemId] = [];
      }

      itemGroups[itemId].push(purchaseItem);
    }

    console.log(`Grouped purchase items into ${Object.keys(itemGroups).length} unique items`);

    // Create an array of update promises - one for each unique item
    const updatePromises = [];

    // Process each unique item with all its purchase entries
    for (const [itemId, purchaseItems] of Object.entries(itemGroups)) {
      updatePromises.push((async () => {
        try {
          console.log(`Processing ${purchaseItems.length} purchases for item ${itemId}`);

          // Get the current state of the item
          const item = await this.itemRepository.findById(itemId);

          if (!item) {
            console.warn(`Item ${itemId} not found when updating inventory for purchase`);
            return {
              success: false,
              itemId,
              error: "Item not found",
            };
          }

          console.log(`Found item ${itemId}: ${item.name}, tracking type: ${item.trackingType || "quantity"}`);

          // Aggregate all values from purchase items for this item
          const aggregate = {
            quantity: 0,
            weight: 0,
            length: 0,
            area: 0,
            volume: 0,
            // Track the highest cost per unit for price updates
            maxCostPerUnit: 0,
            totalCost: 0,
            totalMeasurement: 0,
          };

          // Calculate totals for all purchase items for this product
          for (const purchaseItem of purchaseItems) {
            // Sum up quantities based on tracking type
            aggregate.quantity += parseFloat(purchaseItem.quantity || 0);
            aggregate.weight += parseFloat(purchaseItem.weight || 0);
            aggregate.length += parseFloat(purchaseItem.length || 0);
            aggregate.area += parseFloat(purchaseItem.area || 0);
            aggregate.volume += parseFloat(purchaseItem.volume || 0);

            // Track cost data for cost/price updates
            const purchaseCost = purchaseItem.costPerUnit ||
              (purchaseItem.totalCost && purchaseItem.quantity ?
               purchaseItem.totalCost / purchaseItem.quantity : 0);

            if (purchaseCost > aggregate.maxCostPerUnit) {
              aggregate.maxCostPerUnit = purchaseCost;
            }

            // Add to total cost
            aggregate.totalCost += parseFloat(purchaseItem.totalCost || 0);

            // Add to total measurement based on tracking type
            if (item.trackingType === "weight") {
              aggregate.totalMeasurement += parseFloat(purchaseItem.weight || 0);
            } else if (item.trackingType === "length") {
              aggregate.totalMeasurement += parseFloat(purchaseItem.length || 0);
            } else if (item.trackingType === "area") {
              aggregate.totalMeasurement += parseFloat(purchaseItem.area || 0);
            } else if (item.trackingType === "volume") {
              aggregate.totalMeasurement += parseFloat(purchaseItem.volume || 0);
            } else {
              // Default to quantity tracking
              aggregate.totalMeasurement += parseFloat(purchaseItem.quantity || 0);
            }
          }

          console.log(`Aggregate values for item ${itemId}: `, aggregate);

          // Update data to apply to the item
          const updateData = {};

          // Apply the appropriate measurement value based on tracking type
          switch (item.trackingType) {
            case "weight":
              const currentWeight = parseFloat(item.weight || 0);
              const newWeight = currentWeight + aggregate.weight;
              updateData.weight = newWeight;
              console.log(`Updating weight for item ${itemId}: ${currentWeight} + ${aggregate.weight} = ${newWeight}`);
              break;

            case "length":
              const currentLength = parseFloat(item.length || 0);
              const newLength = currentLength + aggregate.length;
              updateData.length = newLength;
              console.log(`Updating length for item ${itemId}: ${currentLength} + ${aggregate.length} = ${newLength}`);
              break;

            case "area":
              const currentArea = parseFloat(item.area || 0);
              const newArea = currentArea + aggregate.area;
              updateData.area = newArea;
              console.log(`Updating area for item ${itemId}: ${currentArea} + ${aggregate.area} = ${newArea}`);
              break;

            case "volume":
              const currentVolume = parseFloat(item.volume || 0);
              const newVolume = currentVolume + aggregate.volume;
              updateData.volume = newVolume;
              console.log(`Updating volume for item ${itemId}: ${currentVolume} + ${aggregate.volume} = ${newVolume}`);
              break;

            default:
              // Default to quantity tracking
              const currentQuantity = parseFloat(item.quantity || 0);
              const newQuantity = currentQuantity + aggregate.quantity;
              updateData.quantity = newQuantity;
              console.log(`Updating quantity for item ${itemId}: ${currentQuantity} + ${aggregate.quantity} = ${newQuantity}`);
              break;
          }

          // Always update cost and price if we have valid cost data
          if (aggregate.maxCostPerUnit > 0) {
            updateData.cost = aggregate.maxCostPerUnit;
            updateData.price = aggregate.maxCostPerUnit;
            console.log(`Updating cost/price for item ${itemId} to ${aggregate.maxCostPerUnit} (highest cost per unit)`);
          } else if (aggregate.totalCost > 0 && aggregate.totalMeasurement > 0) {
            // Calculate average cost if direct cost per unit wasn't available
            const avgCost = aggregate.totalCost / aggregate.totalMeasurement;
            updateData.cost = avgCost;
            updateData.price = avgCost;
            console.log(`Updating cost/price for item ${itemId} to ${avgCost} (calculated from total cost / total measurement)`);
          }

          // Add last updated timestamp
          updateData.lastUpdated = new Date();

          // Apply the update to the item
          console.log(`Saving item ${itemId} with data:`, updateData);

          // Use itemRepository.update to ensure proper transaction handling
          const result = await this.itemRepository.update(itemId, updateData, transaction);

          console.log(`Item ${itemId} update result:`, result ? "Success" : "Failed");

          return {
            success: true,
            itemId,
            updateData,
            originalData: {
              trackingType: item.trackingType,
              quantity: item.quantity,
              weight: item.weight,
              length: item.length,
              area: item.area,
              volume: item.volume,
              cost: item.cost,
              price: item.price,
            },
          };
        } catch (error) {
          console.error(`Error updating inventory for item ${itemId}:`, error);
          return {
            success: false,
            itemId,
            error: error.message,
          };
        }
      })());
    }

    try {
      // Execute all update promises and wait for all to complete
      console.log(`Executing ${updatePromises.length} inventory update operations`);
      const results = await Promise.all(updatePromises);

      const successCount = results.filter((r) => r && r.success).length;
      const failureCount = results.length - successCount;

      console.log(`Inventory update complete: ${successCount} successes, ${failureCount} failures`);

      return results;
    } catch (error) {
      console.error(`Fatal error during inventory update:`, error);
      throw error;
    }
  }

  /**
   * Update inventory for purchase update
   * @param {Array} originalItems Original items in the purchase
   * @param {Array} updatedItems Updated items in the purchase
   * @param {Object} [transaction] Database transaction/session
   * @return {Promise<void>}
   */
  async updateInventoryForPurchaseUpdate(originalItems,
      updatedItems, transaction) {
    // First, revert the inventory changes from the original purchase
    await this.revertInventoryForPurchase(originalItems, transaction);

    // Then, apply the inventory changes for the updated purchase
    await this.updateInventoryForPurchase(updatedItems, transaction);
  }

  /**
   * Revert inventory when deleting a purchase
   * @param {Array} items Items in the purchase
   * @param {Object} [transaction] Database transaction/session
   * @return {Promise<void>}
   */
  async revertInventoryForPurchase(items, transaction) {
    if (!this.itemRepository) {
      throw new Error(`ItemRepository not available in MongoPurchaseRepository`);
    }

    console.log(`Starting inventory revert for ${items && items.length || 0} purchase items`);

    // Exit early if no items to process
    if (!items || items.length === 0) {
      console.log("No items to revert inventory for");
      return [];
    }

    // Group items by item ID to consolidate updates for the same item
    const itemGroups = {};

    // First pass: group items by their ID
    for (const purchaseItem of items) {
      if (!purchaseItem.item) {
        console.warn("Skipping purchase item with no item reference");
        continue;
      }

      const itemId = typeof purchaseItem.item === "object" ?
        purchaseItem.item._id.toString() : purchaseItem.item.toString();

      if (!itemGroups[itemId]) {
        itemGroups[itemId] = [];
      }

      itemGroups[itemId].push(purchaseItem);
    }

    console.log(`Grouped purchase items into ${Object.keys(itemGroups).length} unique items for revert`);

    // Create an array of revert promises - one for each unique item
    const revertPromises = [];

    // Process each unique item with all its purchase entries
    for (const [itemId, purchaseItems] of Object.entries(itemGroups)) {
      revertPromises.push((async () => {
        try {
          console.log(`Processing ${purchaseItems.length} purchases to revert for item ${itemId}`);

          // Get the current state of the item
          const item = await this.itemRepository.findById(itemId);

          if (!item) {
            console.warn(`Item ${itemId} not found when reverting inventory for purchase`);
            return {
              success: false,
              itemId,
              error: "Item not found",
            };
          }

          console.log(`Found item ${itemId}: ${item.name}, tracking type: ${item.trackingType || "quantity"}`);

          // Aggregate all values from purchase items for this item
          const aggregate = {
            quantity: 0,
            weight: 0,
            length: 0,
            area: 0,
            volume: 0,
          };

          // Calculate totals for all purchase items for this product
          for (const purchaseItem of purchaseItems) {
            // Sum up quantities based on tracking type
            aggregate.quantity += parseFloat(purchaseItem.quantity || 0);
            aggregate.weight += parseFloat(purchaseItem.weight || 0);
            aggregate.length += parseFloat(purchaseItem.length || 0);
            aggregate.area += parseFloat(purchaseItem.area || 0);
            aggregate.volume += parseFloat(purchaseItem.volume || 0);
          }

          console.log(`Aggregate values to revert for item ${itemId}: `, aggregate);

          // Update data to apply to the item
          const updateData = {};

          // Apply the appropriate measurement value based on tracking type
          switch (item.trackingType) {
            case "weight":
              const currentWeight = parseFloat(item.weight || 0);
              const newWeight = Math.max(0, currentWeight - aggregate.weight);
              updateData.weight = newWeight;
              console.log(`Reverting weight for item ${itemId}: ${currentWeight} - ${aggregate.weight} = ${newWeight}`);
              break;

            case "length":
              const currentLength = parseFloat(item.length || 0);
              const newLength = Math.max(0, currentLength - aggregate.length);
              updateData.length = newLength;
              console.log(`Reverting length for item ${itemId}: ${currentLength} - ${aggregate.length} = ${newLength}`);
              break;

            case "area":
              const currentArea = parseFloat(item.area || 0);
              const newArea = Math.max(0, currentArea - aggregate.area);
              updateData.area = newArea;
              console.log(`Reverting area for item ${itemId}: ${currentArea} - ${aggregate.area} = ${newArea}`);
              break;

            case "volume":
              const currentVolume = parseFloat(item.volume || 0);
              const newVolume = Math.max(0, currentVolume - aggregate.volume);
              updateData.volume = newVolume;
              console.log(`Reverting volume for item ${itemId}: ${currentVolume} - ${aggregate.volume} = ${newVolume}`);
              break;

            default:
              // Default to quantity tracking
              const currentQuantity = parseFloat(item.quantity || 0);
              const newQuantity = Math.max(0, currentQuantity - aggregate.quantity);
              updateData.quantity = newQuantity;
              console.log(`Reverting quantity for item ${itemId}: ${currentQuantity} - ${aggregate.quantity} = ${newQuantity}`);
              break;
          }

          // Add last updated timestamp
          updateData.lastUpdated = new Date();

          // Apply the update to the item
          console.log(`Saving reverted item ${itemId} with data:`, updateData);

          // Use itemRepository.update to ensure proper transaction handling
          const result = await this.itemRepository.update(itemId, updateData, transaction);

          console.log(`Item ${itemId} revert result:`, result ? "Success" : "Failed");

          return {
            success: true,
            itemId,
            updateData,
          };
        } catch (error) {
          console.error(`Error reverting inventory for item ${itemId}:`, error);
          return {
            success: false,
            itemId,
            error: error.message,
          };
        }
      })());
    }

    try {
      // Execute all revert promises and wait for all to complete
      console.log(`Executing ${revertPromises.length} inventory revert operations`);
      const results = await Promise.all(revertPromises);

      const successCount = results.filter((r) => r && r.success).length;
      const failureCount = results.length - successCount;

      console.log(`Inventory revert complete: ${successCount} successes, ${failureCount} failures`);

      return results;
    } catch (error) {
      console.error(`Fatal error during inventory revert:`, error);
      throw error;
    }
  }

  /**
   * Get purchase report
   * @param {Object} filter Query filters
   * @param {string} [startDate] Start date for report
   * @param {string} [endDate] End date for report
   * @return {Promise<Object>} Report data
   */
  async getReport(filter, startDate, endDate) {
    // Create date filters if provided
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        purchaseDate: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      };
    }

    // Combine filters
    const combinedFilter = {...filter, ...dateFilter};

    // Get purchases within the date range
    const purchases = await this.findAll(combinedFilter);

    // Calculate metrics
    const totalPurchases = purchases.length;
    const totalSpent = purchases.reduce((sum, purchase) =>
      sum + purchase.total, 0);
    const averagePurchaseValue = totalPurchases > 0 ?
      totalSpent / totalPurchases : 0;

    return {
      totalPurchases,
      totalSpent,
      averagePurchaseValue,
      purchases,
    };
  }

  /**
   * Get purchase trends
   * @param {Object} filter Query filters
   * @param {string} startDate Start date for trends
   * @param {string} endDate End date for trends
   * @return {Promise<Object>} Trends data
   */
  async getTrends(filter, startDate, endDate) {
    const dateFilter = {
      purchaseDate: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    };

    const combinedFilter = {...filter, ...dateFilter};

    // Get daily purchases
    const dailyPurchases = await Purchase.aggregate([
      {$match: combinedFilter},
      {
        $group: {
          _id: {
            year: {$year: "$purchaseDate"},
            month: {$month: "$purchaseDate"},
            day: {$dayOfMonth: "$purchaseDate"},
          },
          count: {$sum: 1},
          total: {$sum: "$total"},
        },
      },
      {$sort: {"_id.year": 1, "_id.month": 1, "_id.day": 1}},
    ]);

    // Format results for front-end visualization
    const formattedResults = dailyPurchases.map((day) => ({
      date: `${day._id.year}-${day._id.month.toString().padStart(2, "0")}
        -${day._id.day.toString().padStart(2, "0")}`,
      purchases: day.count,
      spent: day.total,
    }));

    return {
      trends: formattedResults,
      summary: {
        totalDays: formattedResults.length,
        averageDailyPurchases: formattedResults.reduce((sum, day) =>
          sum + day.purchases, 0) / Math.max(1, formattedResults.length),
        averageDailySpend: formattedResults.reduce((sum, day) =>
          sum + day.spent, 0) / Math.max(1, formattedResults.length),
      },
    };
  }

  /**
   * Get all purchases containing a specific item
   * @param {string} itemId - ID of the item to filter by
   * @return {Promise<Array>} List of purchases containing the item
   */
  async getAllByItemId(itemId) {
    try {
      const mongoose = require("mongoose");
      let objectId;

      // Try to convert the itemId to an ObjectId if it's a valid format
      try {
        objectId = new mongoose.Types.ObjectId(itemId);
      } catch (error) {
        objectId = null;
      }

      // Create a query that handles both string IDs and ObjectIds
      const query = {
        "items.item": objectId ?
          {$in: [itemId, objectId]} :
          itemId,
      };

      return await Purchase.find(query).sort({purchaseDate: -1});
    } catch (error) {
      console.error("Error getting purchases by item ID:", error);
      throw error;
    }
  }
}

module.exports = MongoPurchaseRepository;
