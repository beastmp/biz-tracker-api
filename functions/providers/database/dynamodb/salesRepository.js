const {BaseSalesRepository} = require("../../base");
const {
  PutCommand,
  GetCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");
const {v4: uuidv4} = require("uuid");

/**
 * DynamoDB implementation of SalesRepository
 */
class DynamoSalesRepository extends BaseSalesRepository {
  /**
   * Create a new DynamoSalesRepository
   * @param {Object} documentClient - DynamoDB Document Client
   * @param {string} tablePrefix - Prefix for table names
   */
  constructor(documentClient, tablePrefix) {
    super();
    this.documentClient = documentClient;
    this.tableName = `${tablePrefix}sales`;
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
      // Use query if filtering by date range
      if (filter.startDate && filter.endDate) {
        const params = {
          TableName: this.tableName,
          IndexName: "CreatedAtIndex",
          KeyConditionExpression: "createdAt BETWEEN :startDate AND :endDate",
          ExpressionAttributeValues: {
            ":startDate": filter.startDate,
            ":endDate": filter.endDate,
          },
        };

        const result = await this.documentClient.send(new QueryCommand(params));
        return result.Items || [];
      }

      // Use query if filtering by customer email
      if (filter.customerEmail) {
        const params = {
          TableName: this.tableName,
          IndexName: "CustomerEmailIndex",
          KeyConditionExpression: "customerEmail = :customerEmail",
          ExpressionAttributeValues: {
            ":customerEmail": filter.customerEmail,
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
      console.error("DynamoDB findAll sales error:", error);
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
      const params = {
        TableName: this.tableName,
        Key: {id},
      };

      const result = await this.documentClient.send(new GetCommand(params));
      return result.Item || null;
    } catch (error) {
      console.error(`DynamoDB findById error for sale ${id}:`, error);
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
      const sale = {
        ...saleData,
        id: saleData.id || uuidv4(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (transaction) {
        // Add to transaction
        transaction.addWriteOperation(transaction, "sales", "Put", sale);
      } else {
        // Direct insertion
        const params = {
          TableName: this.tableName,
          Item: sale,
          ConditionExpression: "attribute_not_exists(id)",
        };

        await this.documentClient.send(new PutCommand(params));
      }

      // Update inventory quantities
      if (sale.items && sale.items.length > 0) {
        await this.updateInventoryForSale(sale.items, transaction);
      }

      return sale;
    } catch (error) {
      console.error("DynamoDB create sale error:", error);
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
      // Get existing sale first
      const existingSale = await this.findById(id);
      if (!existingSale) {
        return null;
      }

      // Update the items inventory if changed
      if (saleData.items && JSON.stringify(existingSale.items) !==
        JSON.stringify(saleData.items)) {
        await this.updateInventoryForSaleUpdate(existingSale.items,
            saleData.items, transaction);
      }

      // Merge existing data with updates
      const updatedSale = {
        ...existingSale,
        ...saleData,
        updatedAt: new Date().toISOString(),
      };

      if (transaction) {
        // Add to transaction
        transaction.addWriteOperation(transaction,
            "sales", "Update", updatedSale);
      } else {
        // Direct update
        const params = {
          TableName: this.tableName,
          Item: updatedSale,
          ConditionExpression: "attribute_exists(id)",
        };

        await this.documentClient.send(new PutCommand(params));
      }

      return updatedSale;
    } catch (error) {
      console.error(`DynamoDB update error for sale ${id}:`, error);
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
      // Get the sale first to check if it exists and restore inventory
      const sale = await this.findById(id);
      if (!sale) {
        return false;
      }

      // Restore inventory quantities
      if (sale.items && sale.items.length > 0) {
        await this.restoreInventoryForSale(sale.items, transaction);
      }

      if (transaction) {
        // Add to transaction
        transaction.addWriteOperation(transaction, "sales", "Delete", {id});
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
      console.error(`DynamoDB delete error for sale ${id}:`, error);
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
      throw new Error("ItemRepository not available in DynamoSalesRepository");
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
      throw new Error("ItemRepository not available in DynamoSalesRepository");
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
      // Create date filters if provided
      if (startDate && endDate) {
        filter.startDate = startDate;
        filter.endDate = endDate;
      }

      // Get sales within the date range
      const sales = await this.findAll(filter);

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
      console.error("DynamoDB getReport error:", error);
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
      filter.startDate = startDate;
      filter.endDate = endDate;

      // Get sales within date range
      const sales = await this.findAll(filter);

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
        formattedResults.reduce((sum, day) =>
          sum + day.sales, 0) / totalDays :
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

module.exports = DynamoSalesRepository;
