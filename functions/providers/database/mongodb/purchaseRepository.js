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
      throw new Error(`ItemRepository not available
        in MongoPurchaseRepository`);
    }

    for (const purchaseItem of items) {
      if (!purchaseItem.item) continue;

      const itemId = typeof purchaseItem.item ===
        "object" ? purchaseItem.item._id : purchaseItem.item;
      const item = await this.itemRepository.findById(itemId);

      if (!item) {
        console.warn(`Item ${itemId} not found
          when updating inventory for purchase`);
        continue;
      }

      let updateData = {};

      // Handle different tracking types
      if (purchaseItem.weight && item.trackingType === "weight") {
        // For weight tracked items
        const newWeight = (item.weight || 0) + purchaseItem.weight;
        updateData = {weight: newWeight};
      } else {
        // For quantity tracked items (default)
        const newQuantity = (item.quantity || 0) + purchaseItem.quantity;
        updateData = {quantity: newQuantity};
      }

      // Update the item
      await this.itemRepository.update(itemId, updateData, transaction);
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
      throw new Error(`ItemRepository not available
        in MongoPurchaseRepository`);
    }

    for (const purchaseItem of items) {
      if (!purchaseItem.item) continue;

      const itemId = typeof purchaseItem.item ===
        "object" ? purchaseItem.item._id : purchaseItem.item;
      const item = await this.itemRepository.findById(itemId);

      if (!item) {
        console.warn(`Item ${itemId} not found
          when reverting inventory for purchase`);
        continue;
      }

      let updateData = {};

      if (purchaseItem.weight && item.trackingType === "weight") {
        // For weight tracked items
        const newWeight = Math.max(0, (item.weight || 0) -
          (purchaseItem.weight || 0));
        updateData = {weight: newWeight};
      } else {
        // For quantity tracked items (default)
        const newQuantity = Math.max(0, (item.quantity || 0) -
          (purchaseItem.quantity || 0));
        updateData = {quantity: newQuantity};
      }

      // Update the item
      await this.itemRepository.update(itemId, updateData, transaction);
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
}

module.exports = MongoPurchaseRepository;
