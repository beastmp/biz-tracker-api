const {BasePurchaseRepository} = require("../../base");
const {
  PutCommand,
  GetCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");
const {v4: uuidv4} = require("uuid");

/**
 * DynamoDB implementation of PurchaseRepository
 */
class DynamoPurchaseRepository extends BasePurchaseRepository {
  /**
   * Create a new DynamoPurchaseRepository
   * @param {Object} documentClient - DynamoDB Document Client
   * @param {string} tablePrefix - Prefix for table names
   */
  constructor(documentClient, tablePrefix) {
    super();
    this.documentClient = documentClient;
    this.tableName = `${tablePrefix}purchases`;
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
      // Use query if filtering by date range
      if (filter.startDate && filter.endDate) {
        const params = {
          TableName: this.tableName,
          IndexName: "PurchaseDateIndex",
          KeyConditionExpression: `purchaseDate BETWEEN
            :startDate AND :endDate`,
          ExpressionAttributeValues: {
            ":startDate": filter.startDate,
            ":endDate": filter.endDate,
          },
        };

        const result = await this.documentClient.send(new QueryCommand(params));
        return result.Items || [];
      }

      // Use query if filtering by supplier name
      if (filter.supplierName) {
        const params = {
          TableName: this.tableName,
          IndexName: "SupplierNameIndex",
          KeyConditionExpression: "supplierName = :supplierName",
          ExpressionAttributeValues: {
            ":supplierName": filter.supplierName,
          },
        };

        const result = await this.documentClient.send(new QueryCommand(params));
        return result.Items || [];
      }

      // Otherwise use scan with filter expression
      const {expressionAttributes, filterExpression} =
        this._buildFilterExpression(filter);

      const params = {
        TableName: this.tableName,
      };

      if (filterExpression) {
        params.FilterExpression = filterExpression;
        params.ExpressionAttributeValues = expressionAttributes;
      }

      const result = await this.documentClient.send(new ScanCommand(params));
      return result.Items || [];
    } catch (error) {
      console.error("DynamoDB findAll purchases error:", error);
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
      const params = {
        TableName: this.tableName,
        Key: {id},
      };

      const result = await this.documentClient.send(new GetCommand(params));
      return result.Item || null;
    } catch (error) {
      console.error(`DynamoDB findById error for purchase ${id}:`, error);
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
      const purchase = {
        ...purchaseData,
        id: purchaseData.id || uuidv4(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // Extract supplier name for index if available
        supplierName: purchaseData.supplier && purchaseData.supplier.name ?
          purchaseData.supplier.name : null,
      };

      // Format purchase date if it exists
      if (purchase.purchaseDate && !(purchase.purchaseDate instanceof String)) {
        purchase.purchaseDate = new Date(purchase.purchaseDate).toISOString();
      }

      if (transaction) {
        // Add to transaction
        transaction.addWriteOperation(transaction,
            "purchases", "Put", purchase);
      } else {
        // Direct insertion
        const params = {
          TableName: this.tableName,
          Item: purchase,
          ConditionExpression: "attribute_not_exists(id)",
        };

        await this.documentClient.send(new PutCommand(params));
      }

      // Update inventory quantities
      if (purchase.items && purchase.items.length > 0) {
        await this.updateInventoryForPurchase(purchase.items, transaction);
      }

      return purchase;
    } catch (error) {
      console.error("DynamoDB create purchase error:", error);
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
      // Get existing purchase first
      const existingPurchase = await this.findById(id);
      if (!existingPurchase) {
        return null;
      }

      // Update supplier name index if supplier name changed
      if (purchaseData.supplier && purchaseData.supplier.name) {
        purchaseData.supplierName = purchaseData.supplier.name;
      }

      // Format purchase date if it exists and changed
      if (purchaseData.purchaseDate &&
          !(purchaseData.purchaseDate instanceof String)) {
        purchaseData.purchaseDate =
          new Date(purchaseData.purchaseDate).toISOString();
      }

      // Update the items inventory if changed
      if (purchaseData.items &&
        JSON.stringify(existingPurchase.items) !==
        JSON.stringify(purchaseData.items)) {
        await this.updateInventoryForPurchaseUpdate(existingPurchase.items,
            purchaseData.items, transaction);
      }

      // Merge existing data with updates
      const updatedPurchase = {
        ...existingPurchase,
        ...purchaseData,
        updatedAt: new Date().toISOString(),
      };

      if (transaction) {
        // Add to transaction
        transaction.addWriteOperation(transaction,
            "purchases", "Update", updatedPurchase);
      } else {
        // Direct update
        const params = {
          TableName: this.tableName,
          Item: updatedPurchase,
          ConditionExpression: "attribute_exists(id)",
        };

        await this.documentClient.send(new PutCommand(params));
      }

      return updatedPurchase;
    } catch (error) {
      console.error(`DynamoDB update error for purchase ${id}:`, error);
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
      // Get the purchase first to check if it exists and revert inventory
      const purchase = await this.findById(id);
      if (!purchase) {
        return false;
      }

      // Revert inventory quantities
      if (purchase.items && purchase.items.length > 0) {
        await this.revertInventoryForPurchase(purchase.items, transaction);
      }

      if (transaction) {
        // Add to transaction
        transaction.addWriteOperation(transaction, "purchases", "Delete", {id});
      } else {
        // Direct delete
        const params = {
          TableName: this.tableName,
          Key: {id},
          ConditionExpression: "attribute_exists(id)",
        };

        await this.documentClient.send(new DeleteCommand(params));
      }

      return true;
    } catch (error) {
      if (error.name === "ConditionalCheckFailedException") {
        return false;
      }
      console.error(`DynamoDB delete error for purchase ${id}:`, error);
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
        in DynamoPurchaseRepository`);
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
        in DynamoPurchaseRepository`);
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
        const newQuantity = Math.max(0,
            (item.quantity || 0) - purchaseItem.quantity);
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
      // Create date filters if provided
      if (startDate && endDate) {
        filter.startDate = startDate;
        filter.endDate = endDate;
      }

      // Get purchases within the date range
      const purchases = await this.findAll(filter);

      // Calculate metrics
      const totalPurchases = purchases.length;
      const totalSpent = purchases.reduce((sum, purchase) =>
        sum + purchase.total, 0);
      const averagePurchaseValue = totalPurchases >
        0 ? totalSpent / totalPurchases : 0;

      return {
        totalPurchases,
        totalSpent,
        averagePurchaseValue,
        purchases,
      };
    } catch (error) {
      console.error("DynamoDB getReport error:", error);
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
      filter.startDate = startDate;
      filter.endDate = endDate;

      // Get purchases within date range
      const purchases = await this.findAll(filter);

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
      console.error("DynamoDB getTrends error:", error);
      throw error;
    }
  }

  /**
   * Build a DynamoDB filter expression from a filter object
   * @param {Object} filter Filter object
   * @return {Object} Filter expression and attributes
   * @private
   */
  _buildFilterExpression(filter) {
    const expressionParts = [];
    const expressionAttributes = {};

    Object.entries(filter).forEach(([key, value]) => {
      // Skip date range filters as they're handled separately
      if (key !== "startDate" && key !==
          "endDate" && value !== undefined && value !== null) {
        const attrKey = `:${key}`;
        expressionParts.push(`${key} = ${attrKey}`);
        expressionAttributes[attrKey] = value;
      }
    });

    return {
      expressionAttributes,
      filterExpression: expressionParts.length >
        0 ? expressionParts.join(" AND ") : undefined,
    };
  }
}

module.exports = DynamoPurchaseRepository;
