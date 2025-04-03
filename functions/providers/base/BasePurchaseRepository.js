const PurchaseRepository = require("../interfaces/purchaseRepository");

/**
 * Base implementation of PurchaseRepository with common functionality
 * @abstract
 */
class BasePurchaseRepository extends PurchaseRepository {
  /**
   * Creates a new instance of BasePurchaseRepository
   */
  constructor() {
    super();
    this.itemRepository = null;
  }

  /**
   * Set the item repository dependency
   * @param {ItemRepository} itemRepository The item repository implementation
   */
  setItemRepository(itemRepository) {
    this.itemRepository = itemRepository;
  }

  /**
   * Update inventory when creating a purchase
   * @param {Array} items Items in the purchase
   * @param {Object} [transaction] Database transaction/session
   * @return {Promise<void>}
   */
  async updateInventoryForPurchase(items, transaction) {
    // This is just a base implementation
    // The MongoDB implementation will override
    // this with a more efficient version
    if (!this.itemRepository) {
      throw new Error(`ItemRepository not available in BasePurchaseRepository`);
    }

    console.log(`Base implementation - Starting inventory update for
      ${items && items.length || 0} purchase items`);

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

    console.log(`Grouped purchase items into ${Object.keys(itemGroups).length}
      unique items`);

    // Use Promise.all to handle all updates in parallel
    const updatePromises = [];

    for (const [itemId, purchaseItems] of Object.entries(itemGroups)) {
      updatePromises.push(this.updateInventoryForItem(itemId,
          purchaseItems, transaction));
    }

    try {
      // Execute all update promises and wait for all to complete
      console.log(`Executing ${updatePromises.length}
        inventory update operations`);
      return await Promise.all(updatePromises);
    } catch (error) {
      console.error(`Fatal error during inventory update:`, error);
      throw error;
    }
  }

  /**
   * Update inventory for a single item
   * @param {string} itemId Item ID
   * @param {Array} purchaseItems Purchase items for this item
   * @param {Object} [transaction] Database transaction/session
   * @return {Promise<Object>} Result of the update
   * @private
   */
  async updateInventoryForItem(itemId, purchaseItems, transaction) {
    try {
      console.log(`Processing ${purchaseItems.length}
        purchases for item ${itemId}`);

      // Get the current state of the item
      const item = await this.itemRepository.findById(itemId);

      if (!item) {
        console.warn(`Item ${itemId} not found
          when updating inventory for purchase`);
        return {
          success: false,
          itemId,
          error: "Item not found",
        };
      }

      // Aggregate all values from purchase items for this item
      const aggregate = {
        quantity: 0,
        weight: 0,
        length: 0,
        area: 0,
        volume: 0,
        maxCostPerUnit: 0,
        totalCost: 0,
        totalMeasurement: 0,
      };

      // Calculate totals for all purchase items for this product
      for (const purchaseItem of purchaseItems) {
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

        aggregate.totalCost += parseFloat(purchaseItem.totalCost || 0);

        if (item.trackingType === "weight") {
          aggregate.totalMeasurement += parseFloat(purchaseItem.weight || 0);
        } else if (item.trackingType === "length") {
          aggregate.totalMeasurement += parseFloat(purchaseItem.length || 0);
        } else if (item.trackingType === "area") {
          aggregate.totalMeasurement += parseFloat(purchaseItem.area || 0);
        } else if (item.trackingType === "volume") {
          aggregate.totalMeasurement += parseFloat(purchaseItem.volume || 0);
        } else {
          aggregate.totalMeasurement += parseFloat(purchaseItem.quantity || 0);
        }
      }

      // Update data to apply to the item
      const updateData = {};

      // Apply the appropriate measurement value based on tracking type
      switch (item.trackingType) {
        case "weight":
          updateData.weight = (item.weight || 0) + aggregate.weight;
          break;
        case "length":
          updateData.length = (item.length || 0) + aggregate.length;
          break;
        case "area":
          updateData.area = (item.area || 0) + aggregate.area;
          break;
        case "volume":
          updateData.volume = (item.volume || 0) + aggregate.volume;
          break;
        default:
          // Default to quantity tracking
          updateData.quantity = (item.quantity || 0) + aggregate.quantity;
          break;
      }

      // Always update cost and price if we have valid cost data
      if (aggregate.maxCostPerUnit > 0) {
        updateData.cost = aggregate.maxCostPerUnit;
        updateData.price = aggregate.maxCostPerUnit;
      }

      // Add last updated timestamp
      updateData.lastUpdated = new Date();

      // Apply the update to the item
      const result = await this.itemRepository.update(itemId,
          updateData, transaction);

      return {
        success: true,
        itemId,
        updateData,
        item: result,
      };
    } catch (error) {
      console.error(`Error updating inventory for item ${itemId}:`, error);
      return {
        success: false,
        itemId,
        error: error.message,
      };
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
    try {
      // Get purchases within date range
      const query = {...filter};
      if (startDate || endDate) {
        query.purchaseDate = {};
        if (startDate) {
          query.purchaseDate.$gte = new Date(startDate);
        }
        if (endDate) {
          query.purchaseDate.$lte = new Date(endDate);
        }
      }

      const purchases = await this.findAll(query);

      // Calculate report statistics
      const totalPurchases = purchases.length;
      const totalCost = purchases.reduce((sum, purchase) =>
        sum + purchase.total, 0);
      const averagePurchaseValue = totalPurchases > 0 ?
        totalCost / totalPurchases : 0;

      return {
        totalPurchases,
        totalCost,
        averagePurchaseValue,
        purchases,
      };
    } catch (error) {
      console.error("Error generating purchase report:", error);
      throw error;
    }
  }

  /**
   * Get purchase trends
   * @param {Object} filter Query filters
   * @param {string} startDate Start date for trends
   * @param {string} endDate End date for trends
   * @return {Promise<Object>} Trends data
   */
  async getTrends(filter, startDate, endDate) {
    try {
      // Get purchases within date range
      const query = {...filter};
      if (startDate || endDate) {
        query.purchaseDate = {};
        if (startDate) {
          query.purchaseDate.$gte = new Date(startDate);
        }
        if (endDate) {
          query.purchaseDate.$lte = new Date(endDate);
        }
      }

      const purchases = await this.findAll(query);

      // Group purchases by date
      const trendData = {};
      purchases.forEach((purchase) => {
        // Format the date as YYYY-MM-DD
        const date = purchase.purchaseDate ?
          new Date(purchase.purchaseDate).toISOString().split("T")[0] :
          new Date().toISOString().split("T")[0];

        if (!trendData[date]) {
          trendData[date] = {
            date,
            count: 0,
            total: 0,
            measurementBreakdown: {
              quantity: {count: 0, total: 0},
              weight: {count: 0, total: 0},
              length: {count: 0, total: 0},
              area: {count: 0, total: 0},
              volume: {count: 0, total: 0},
            },
          };
        }

        trendData[date].count += 1;
        trendData[date].total += purchase.total;

        // Analyze items by measurement type
        purchase.items.forEach((item) => {
          const measurementType = item.purchasedBy || "quantity";
          trendData[date].measurementBreakdown[measurementType].count += 1;
          trendData[date].measurementBreakdown[measurementType].total +=
            item.totalCost;
        });
      });

      // Convert to array and sort by date
      return Object.values(trendData).sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
    } catch (error) {
      console.error("Error generating purchase trends:", error);
      throw error;
    }
  }

  /**
   * Get all purchases containing a specific item
   * @param {string} itemId - ID of the item to filter by
   * @return {Promise<Array>} List of purchases containing the item
   */
  async getAllByItemId(itemId) {
    try {
      // This is a basic implementation that filters in memory
      const allPurchases = await this.findAll({});
      return allPurchases.filter((purchase) =>
        purchase.items.some((item) =>
          (typeof item.item === "string" && item.item === itemId) ||
          (item.item && item.item._id === itemId),
        ),
      );
    } catch (error) {
      console.error(`Error getting purchases by item ID ${itemId}:`, error);
      throw error;
    }
  }

  /**
   * Create a business asset from a purchase item
   * @param {string} purchaseId - ID of the purchase
   * @param {number} itemIndex - Index of the item in the purchase
   * @param {Object} assetData - Additional asset data
   * @return {Promise<Object>} Created business asset
   */
  async createAssetFromPurchaseItem(purchaseId, itemIndex, assetData) {
    throw new Error("Method not implemented: createAssetFromPurchaseItem");
  }
}

module.exports = BasePurchaseRepository;
