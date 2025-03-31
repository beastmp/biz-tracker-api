const {BaseSalesRepository} = require("../../base");
const {v4: uuidv4} = require("uuid");

/**
 * Firestore implementation of SalesRepository
 */
class FirestoreSalesRepository extends BaseSalesRepository {
  /**
   * Create a new FirestoreSalesRepository
   * @param {Object} db - Firestore database instance
   * @param {string} collectionPrefix - Prefix for collection names
   */
  constructor(db, collectionPrefix = "") {
    super();
    this.db = db;
    this.collection = `${collectionPrefix}sales`;
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
   * Find all sales matching filter criteria
   * @param {Object} filter Query filters
   * @return {Promise<Array>} List of sales
   */
  async findAll(filter = {}) {
    try {
      let query = this.db.collection(this.collection);

      // Handle date range filters
      if (filter.startDate && filter.endDate) {
        query = query.where("createdAt", ">=", filter.startDate)
            .where("createdAt", "<=", filter.endDate);

        // Remove from filter so they're not applied again
        const {...restFilter} = filter;
        filter = restFilter;
      }

      // Apply remaining filters
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.where(key, "==", value);
        }
      });

      // Order by creation date, newest first
      query = query.orderBy("createdAt", "desc");

      const snapshot = await query.get();
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error("Firestore findAll sales error:", error);
      throw error;
    }
  }

  /**
   * Find sale by ID
   * @param {string} id Sale ID
   * @return {Promise<Object|null>} Sale object or null if not found
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
      console.error(`Firestore findById error for sale ${id}:`, error);
      throw error;
    }
  }

  /**
   * Create a new sale
   * @param {Object} saleData Sale data
   * @param {Object} [transaction] Database transaction/session
   * @return {Promise<Object>} Created sale
   */
  async create(saleData, transaction) {
    try {
      // Generate ID and timestamps
      const id = saleData.id || uuidv4();
      const sale = {
        ...saleData,
        id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (transaction && transaction.firestoreTransaction) {
        // Using transaction
        const docRef = this.db.collection(this.collection).doc(id);
        transaction.firestoreTransaction.set(docRef, sale);

        // Update inventory quantities within transaction
        if (this.itemRepository && sale.items && sale.items.length > 0) {
          await this.updateInventoryForSale(sale.items, transaction);
        }
      } else {
        // Direct insertion
        await this.db.collection(this.collection).doc(id).set(sale);

        // Update inventory quantities
        if (this.itemRepository && sale.items && sale.items.length > 0) {
          await this.updateInventoryForSale(sale.items);
        }
      }

      return sale;
    } catch (error) {
      console.error("Firestore create sale error:", error);
      throw error;
    }
  }

  /**
   * Update an existing sale
   * @param {string} id Sale ID
   * @param {Object} saleData Updated sale data
   * @param {Object} [transaction] Database transaction/session
   * @return {Promise<Object|null>} Updated sale or null if not found
   */
  async update(id, saleData, transaction) {
    try {
      // Get existing sale
      let existingSale;

      if (transaction && transaction.firestoreTransaction) {
        const docRef = this.db.collection(this.collection).doc(id);
        const doc = await transaction.firestoreTransaction.get(docRef);
        existingSale = doc.exists ? {id: doc.id, ...doc.data()} : null;
      } else {
        existingSale = await this.findById(id);
      }

      if (!existingSale) {
        return null;
      }

      // Handle inventory updates if items changed
      if (this.itemRepository && saleData.items &&
          JSON.stringify(existingSale.items) !==
          JSON.stringify(saleData.items)) {
        await this.updateInventoryForSaleUpdate(
            existingSale.items || [],
            saleData.items || [],
            transaction,
        );
      }

      // Merge with updated data
      const updatedSale = {
        ...existingSale,
        ...saleData,
        updatedAt: new Date().toISOString(),
      };

      // Save updates
      if (transaction && transaction.firestoreTransaction) {
        const docRef = this.db.collection(this.collection).doc(id);
        transaction.firestoreTransaction.update(docRef, updatedSale);
      } else {
        await this.db.collection(this.collection).doc(id).update(updatedSale);
      }

      return updatedSale;
    } catch (error) {
      console.error(`Firestore update error for sale ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a sale
   * @param {string} id Sale ID
   * @param {Object} [transaction] Database transaction/session
   * @return {Promise<boolean>} True if deleted, false if not found
   */
  async delete(id, transaction) {
    try {
      // Get sale to restore inventory
      const sale = await this.findById(id);
      if (!sale) {
        return false;
      }

      // Restore inventory quantities
      if (this.itemRepository && sale.items && sale.items.length > 0) {
        await this.restoreInventoryForSale(sale.items, transaction);
      }

      // Delete the sale
      if (transaction && transaction.firestoreTransaction) {
        const docRef = this.db.collection(this.collection).doc(id);
        transaction.firestoreTransaction.delete(docRef);
      } else {
        await this.db.collection(this.collection).doc(id).delete();
      }

      return true;
    } catch (error) {
      console.error(`Firestore delete error for sale ${id}:`, error);
      throw error;
    }
  }

  /**
   * Update inventory when creating a sale
   * @param {Array} items Items in the sale
   * @param {Object} [transaction] Database transaction/session
   * @return {Promise<void>}
   */
  async updateInventoryForSale(items, transaction) {
    if (!this.itemRepository) {
      throw new Error(`ItemRepository not available
        in FirestoreSalesRepository`);
    }

    for (const saleItem of items) {
      if (!saleItem.item) continue;

      const itemId = typeof saleItem.item ===
        "object" ? saleItem.item.id : saleItem.item;
      const item = await this.itemRepository.findById(itemId);

      if (!item) {
        console.warn(`Item ${itemId} not found
          when updating inventory for sale`);
        continue;
      }

      // Decrease quantity by the sold amount
      const newQuantity = Math.max(0, item.quantity - saleItem.quantity);

      // Update the item
      await this.itemRepository.update(itemId,
          {quantity: newQuantity}, transaction);
    }
  }

  /**
   * Update inventory when updating a sale
   * @param {Array} originalItems Original items in the sale
   * @param {Array} updatedItems Updated items in the sale
   * @param {Object} [transaction] Database transaction/session
   * @return {Promise<void>}
   */
  async updateInventoryForSaleUpdate(originalItems, updatedItems, transaction) {
    // First, restore inventory for original items
    await this.restoreInventoryForSale(originalItems, transaction);

    // Then, update inventory for the new items
    await this.updateInventoryForSale(updatedItems, transaction);
  }

  /**
   * Restore inventory when deleting a sale
   * @param {Array} items Items in the sale
   * @param {Object} [transaction] Database transaction/session
   * @return {Promise<void>}
   */
  async restoreInventoryForSale(items, transaction) {
    if (!this.itemRepository) {
      throw new Error(`ItemRepository not available
        in FirestoreSalesRepository`);
    }

    for (const saleItem of items) {
      if (!saleItem.item) continue;

      const itemId = typeof saleItem.item ===
        "object" ? saleItem.item.id : saleItem.item;
      const item = await this.itemRepository.findById(itemId);

      if (!item) {
        console.warn(`Item ${itemId} not found
          when restoring inventory for sale`);
        continue;
      }

      // Increase quantity by the sold amount
      const newQuantity = (item.quantity || 0) + saleItem.quantity;

      // Update the item
      await this.itemRepository.update(itemId,
          {quantity: newQuantity}, transaction);
    }
  }

  /**
   * Get sales report
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

      // Get sales within date range
      const sales = await this.findAll(queryFilter);

      // Calculate metrics
      const totalSales = sales.length;
      const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
      const averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;

      return {
        totalSales,
        totalRevenue,
        averageOrderValue,
        sales,
      };
    } catch (error) {
      console.error("Firestore getReport error:", error);
      throw error;
    }
  }

  /**
   * Get sales trends
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

      // Get sales within date range
      const sales = await this.findAll(queryFilter);

      // Group sales by date
      const salesByDate = sales.reduce((acc, sale) => {
        // Extract date part only from ISO date
        const date = sale.createdAt.split("T")[0];

        if (!acc[date]) {
          acc[date] = {
            count: 0,
            total: 0,
          };
        }

        acc[date].count += 1;
        acc[date].total += sale.total;
        return acc;
      }, {});

      // Format for frontend
      const formattedResults =
        Object.entries(salesByDate).map(([date, data]) => ({
          date,
          sales: data.count,
          revenue: data.total,
        })).sort((a, b) => a.date.localeCompare(b.date));

      // Calculate summary metrics
      const totalDays = formattedResults.length;
      const averageDailySales = totalDays > 0 ?
        formattedResults.reduce((sum, day) => sum + day.sales, 0) / totalDays :
        0;
      const averageDailyRevenue = totalDays > 0 ?
        formattedResults.reduce((sum, day) =>
          sum + day.revenue, 0) / totalDays :
        0;

      return {
        trends: formattedResults,
        summary: {
          totalDays,
          averageDailySales,
          averageDailyRevenue,
        },
      };
    } catch (error) {
      console.error("Firestore getTrends error:", error);
      throw error;
    }
  }
}

module.exports = FirestoreSalesRepository;
