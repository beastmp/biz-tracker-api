const {BasePurchaseRepository} = require("../../base");
const {v4: uuidv4} = require("uuid");

/**
 * Firestore implementation of PurchaseRepository
 */
class FirestorePurchaseRepository extends BasePurchaseRepository {
  /**
   * Create a new FirestorePurchaseRepository
   * @param {Object} db - Firestore database instance
   * @param {string} collectionPrefix - Prefix for collection names
   */
  constructor(db, collectionPrefix = "") {
    super();
    this.db = db;
    this.collection = `${collectionPrefix}purchases`;
    this.itemCollection = `${collectionPrefix}items`;
    this.itemRepository = null;
  }

  /**
   * Set the item repository
   * @param {ItemRepository} itemRepository - Item repository
   */
  setItemRepository(itemRepository) {
    this.itemRepository = itemRepository;
  }

  /**
   * Find all purchases matching filter criteria
   * @param {Object} filter Query filters
   * @return {Promise<Array>} List of purchases
   */
  async findAll(filter = {}) {
    try {
      let query = this.db.collection(this.collection);

      // Handle date range filters
      if (filter.startDate && filter.endDate) {
        query = query.where("purchaseDate", ">=", filter.startDate)
            .where("purchaseDate", "<=", filter.endDate);

        // Remove date filters so they're not applied again
        const {...restFilter} = filter;
        filter = restFilter;
      }

      // Apply remaining filters
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          // Special handling for supplier name
          // which is nested in 'supplier' object
          if (key === "supplierName") {
            query = query.where("supplier.name", "==", value);
          } else {
            query = query.where(key, "==", value);
          }
        }
      });

      // Order by purchase date, newest first
      query = query.orderBy("purchaseDate", "desc");

      const snapshot = await query.get();
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error("Firestore findAll purchases error:", error);
      throw error;
    }
  }

  /**
   * Find purchase by ID
   * @param {string} id Purchase ID
   * @return {Promise<Object|null>} Purchase object or null if not found
   */
  async findById(id) {
    try {
      const doc = await this.db.collection(this.collection).doc(id).get();
      if (!doc.exists) {
        return null;
      }
      return {
        id: doc.id,
        ...doc.data(),
      };
    } catch (error) {
      console.error(`Firestore findById error for purchase ${id}:`, error);
      throw error;
    }
  }

  /**
   * Create a new purchase
   * @param {Object} purchaseData Purchase data
   * @param {Object} [transaction] Database transaction/session
   * @return {Promise<Object>} Created purchase
   */
  async create(purchaseData, transaction) {
    try {
      // Generate ID and timestamps
      const id = purchaseData.id || uuidv4();
      const purchase = {
        ...purchaseData,
        id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Ensure purchase date is in ISO format
      if (purchase.purchaseDate && !(purchase.purchaseDate instanceof String)) {
        purchase.purchaseDate = new Date(purchase.purchaseDate).toISOString();
      }

      if (transaction && transaction.firestoreTransaction) {
        // Using transaction
        const docRef = this.db.collection(this.collection).doc(id);
        transaction.firestoreTransaction.set(docRef, purchase);

        // Update inventory quantities within transaction
        if (this.itemRepository &&
            purchase.items && purchase.items.length > 0) {
          await this.updateInventoryForPurchase(purchase.items, transaction);
        }
      } else {
        // Direct insertion
        await this.db.collection(this.collection).doc(id).set(purchase);

        // Update inventory quantities
        if (this.itemRepository &&
            purchase.items && purchase.items.length > 0) {
          await this.updateInventoryForPurchase(purchase.items);
        }
      }

      return purchase;
    } catch (error) {
      console.error("Firestore create purchase error:", error);
      throw error;
    }
  }

  /**
   * Update an existing purchase
   * @param {string} id Purchase ID
   * @param {Object} purchaseData Updated purchase data
   * @param {Object} [transaction] Database transaction/session
   * @return {Promise<Object|null>} Updated purchase or null if not found
   */
  async update(id, purchaseData, transaction) {
    try {
      // Get existing purchase
      let existingPurchase;

      if (transaction && transaction.firestoreTransaction) {
        const docRef = this.db.collection(this.collection).doc(id);
        const doc = await transaction.firestoreTransaction.get(docRef);
        existingPurchase = doc.exists ? {id: doc.id, ...doc.data()} : null;
      } else {
        existingPurchase = await this.findById(id);
      }

      if (!existingPurchase) {
        return null;
      }

      // Format purchase date if provided
      if (purchaseData.purchaseDate &&
          !(purchaseData.purchaseDate instanceof String)) {
        purchaseData.purchaseDate =
          new Date(purchaseData.purchaseDate).toISOString();
      }

      // Handle inventory updates if items changed
      if (this.itemRepository && purchaseData.items &&
          JSON.stringify(existingPurchase.items) !==
            JSON.stringify(purchaseData.items)) {
        await this.updateInventoryForPurchaseUpdate(
            existingPurchase.items || [],
            purchaseData.items || [],
            transaction,
        );
      }

      // Merge with updated data
      const updatedPurchase = {
        ...existingPurchase,
        ...purchaseData,
        updatedAt: new Date().toISOString(),
      };

      // Save updates
      if (transaction && transaction.firestoreTransaction) {
        const docRef = this.db.collection(this.collection).doc(id);
        transaction.firestoreTransaction.update(docRef, updatedPurchase);
      } else {
        await
        this.db.collection(this.collection).doc(id).update(updatedPurchase);
      }

      return updatedPurchase;
    } catch (error) {
      console.error(`Firestore update error for purchase ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a purchase
   * @param {string} id Purchase ID
   * @param {Object} [transaction] Database transaction/session
   * @return {Promise<boolean>} True if deleted, false if not found
   */
  async delete(id, transaction) {
    try {
      // Get purchase to revert inventory
      const purchase = await this.findById(id);
      if (!purchase) {
        return false;
      }

      // Revert inventory quantities
      if (this.itemRepository && purchase.items && purchase.items.length > 0) {
        await this.revertInventoryForPurchase(purchase.items, transaction);
      }

      // Delete the purchase
      if (transaction && transaction.firestoreTransaction) {
        const docRef = this.db.collection(this.collection).doc(id);
        transaction.firestoreTransaction.delete(docRef);
      } else {
        await this.db.collection(this.collection).doc(id).delete();
      }

      return true;
    } catch (error) {
      console.error(`Firestore delete error for purchase ${id}:`, error);
      throw error;
    }
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
        in FirestorePurchaseRepository`);
    }

    for (const purchaseItem of items) {
      if (!purchaseItem.item) continue;

      const itemId = typeof purchaseItem.item ===
        "object" ? purchaseItem.item.id : purchaseItem.item;
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
   * Update inventory when updating a purchase
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
        in FirestorePurchaseRepository`);
    }

    for (const purchaseItem of items) {
      if (!purchaseItem.item) continue;

      const itemId = typeof purchaseItem.item ===
        "object" ? purchaseItem.item.id : purchaseItem.item;
      const item = await this.itemRepository.findById(itemId);

      if (!item) {
        console.warn(`Item ${itemId} not found
          when reverting inventory for purchase`);
        continue;
      }

      let updateData = {};

      if (purchaseItem.weight && item.trackingType === "weight") {
        // For weight tracked items
        const newWeight = Math.max(0, (item.weight || 0) - purchaseItem.weight);
        updateData = {weight: newWeight};
      } else {
        // For quantity tracked items (default)
        const newQuantity = Math.max(0, (item.quantity || 0) -
          purchaseItem.quantity);
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
    try {
      // Add date range to filter if provided
      const queryFilter = {...filter};
      if (startDate && endDate) {
        queryFilter.startDate = startDate;
        queryFilter.endDate = endDate;
      }

      // Get purchases within date range
      const purchases = await this.findAll(queryFilter);

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
    } catch (error) {
      console.error("Firestore getReport error:", error);
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
      // Add date range to filter
      const queryFilter = {
        ...filter,
        startDate,
        endDate,
      };

      // Get purchases within date range
      const purchases = await this.findAll(queryFilter);

      // Group purchases by date
      const purchasesByDate = purchases.reduce((acc, purchase) => {
        // Extract date part only from ISO date
        const date = purchase.purchaseDate ?
          purchase.purchaseDate.split("T")[0] :
          purchase.createdAt.split("T")[0];

        if (!acc[date]) {
          acc[date] = {
            count: 0,
            total: 0,
          };
        }

        acc[date].count += 1;
        acc[date].total += purchase.total;
        return acc;
      }, {});

      // Format for frontend
      const formattedResults =
        Object.entries(purchasesByDate).map(([date, data]) => ({
          date,
          purchases: data.count,
          spent: data.total,
        })).sort((a, b) => a.date.localeCompare(b.date));

      // Calculate summary metrics
      const totalDays = formattedResults.length;
      const averageDailyPurchases = totalDays > 0 ?
        formattedResults.reduce((sum, day) =>
          sum + day.purchases, 0) / totalDays :
        0;
      const averageDailySpend = totalDays > 0 ?
        formattedResults.reduce((sum, day) => sum + day.spent, 0) / totalDays :
        0;

      return {
        trends: formattedResults,
        summary: {
          totalDays,
          averageDailyPurchases,
          averageDailySpend,
        },
      };
    } catch (error) {
      console.error("Firestore getTrends error:", error);
      throw error;
    }
  }
}

module.exports = FirestorePurchaseRepository;
