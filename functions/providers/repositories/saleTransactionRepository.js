/**
 * Sale Transaction Repository
 * Implements provider-agnostic business logic and operations for the Sale Transaction entity
 */

const BaseTransactionRepository = require("./baseTransactionRepository");
const SaleTransactionInterface = require("../interfaces/saleTransactionInterface");
// eslint-disable-next-line no-unused-vars
const {SaleTransaction} = require("../../models/saleTransactionModel");

/**
 * Base repository for Sale Transaction operations with provider-agnostic implementation
 * @extends BaseTransactionRepository
 * @implements SaleTransactionInterface
 */
class SaleTransactionRepository extends BaseTransactionRepository {
  /**
   * Creates a new SaleTransactionRepository instance
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    super(config);
    this.saleItemRepository = null;
    this.purchaseItemRepository = null;
  }

  /**
   * Set the sale item repository dependency
   * @param {Object} repository - Sale item repository instance
   */
  setSaleItemRepository(repository) {
    this.saleItemRepository = repository;
  }

  /**
   * Set the purchase item repository dependency for cost and profit calculations
   * @param {Object} repository - Purchase item repository instance
   */
  setPurchaseItemRepository(repository) {
    this.purchaseItemRepository = repository;
  }

  /**
   * Find transactions by customer ID
   * @param {string} customerId - Customer ID
   * @param {Object} options - Query options
   * @return {Promise<Array>} - List of sale transactions
   */
  async findByCustomer(customerId, options = {}) {
    try {
      const filter = {
        customerId: customerId,
        ...options.filter,
      };
      
      return await this.findAll(filter, options);
    } catch (error) {
      console.error(`Error finding sales for customer ${customerId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate total revenue by customer
   * @param {string} customerId - Customer ID
   * @param {Object} options - Date range options
   * @return {Promise<number>} - Total revenue amount
   */
  async calculateTotalRevenueByCustomer(customerId, options = {}) {
    try {
      const {
        dateFrom,
        dateTo,
      } = options;

      // Build filter
      const filter = { customerId };
      
      if (dateFrom || dateTo) {
        filter.transactionDate = {};
        if (dateFrom) filter.transactionDate.$gte = new Date(dateFrom);
        if (dateTo) filter.transactionDate.$lte = new Date(dateTo);
      }

      // Get completed sales only
      filter.status = "completed";

      // Get sales for this customer
      const sales = await this.findAll(filter);

      if (!sales || sales.length === 0) {
        return 0;
      }

      // Calculate total revenue
      return sales.reduce((total, sale) => {
        return total + (sale.totalAmount || 0);
      }, 0);
    } catch (error) {
      console.error(`Error calculating total revenue for customer ${customerId}:`, error);
      throw error;
    }
  }

  /**
   * Get sale history summary
   * @param {Object} options - Filter and grouping options
   * @return {Promise<Array>} - Summary data
   */
  async getSaleHistorySummary(options = {}) {
    try {
      const {
        dateFrom,
        dateTo,
        groupBy = "month",
      } = options;

      // Implementation depends on specific provider
      throw new Error("Not implemented in base class");
    } catch (error) {
      console.error("Error getting sale history summary:", error);
      throw error;
    }
  }

  /**
   * Generate sales report
   * @param {Object} options - Report criteria and options
   * @return {Promise<Object>} - Report data
   */
  async generateSalesReport(options = {}) {
    try {
      const {
        dateFrom,
        dateTo,
        groupBy = "customer",
        includeItems = false,
      } = options;

      // Build filter for transactions
      const filter = {};
      
      if (dateFrom || dateTo) {
        filter.transactionDate = {};
        if (dateFrom) filter.transactionDate.$gte = new Date(dateFrom);
        if (dateTo) filter.transactionDate.$lte = new Date(dateTo);
      }

      // Get completed sales only
      filter.status = "completed";

      // Get sales
      const sales = await this.findAll(filter);

      // Calculate totals
      const totalAmount = sales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
      const totalSales = sales.length;

      // Group data according to the groupBy option
      let groupedData = {};
      
      if (groupBy === "customer") {
        // Group by customer
        groupedData = sales.reduce((grouped, sale) => {
          const customerId = sale.customerId || "unknown";
          
          if (!grouped[customerId]) {
            grouped[customerId] = {
              customerId,
              customerName: sale.customerName || "Unknown Customer",
              totalAmount: 0,
              saleCount: 0,
              sales: [],
            };
          }
          
          grouped[customerId].totalAmount += sale.totalAmount || 0;
          grouped[customerId].saleCount += 1;
          
          if (includeItems) {
            grouped[customerId].sales.push(sale);
          }
          
          return grouped;
        }, {});
      } else if (groupBy === "month") {
        // Group by month
        groupedData = sales.reduce((grouped, sale) => {
          const date = new Date(sale.transactionDate);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
          
          if (!grouped[monthKey]) {
            grouped[monthKey] = {
              month: monthKey,
              totalAmount: 0,
              saleCount: 0,
              sales: [],
            };
          }
          
          grouped[monthKey].totalAmount += sale.totalAmount || 0;
          grouped[monthKey].saleCount += 1;
          
          if (includeItems) {
            grouped[monthKey].sales.push(sale);
          }
          
          return grouped;
        }, {});
      }

      // Convert to array
      const groupedResults = Object.values(groupedData);

      // Include sale items if requested and repository is available
      if (includeItems && this.saleItemRepository) {
        // Get all sale IDs
        const saleIds = sales.map(s => s._id);
        
        // Get all sale items
        const allItems = [];
        for (const saleId of saleIds) {
          const items = await this.saleItemRepository.findBySaleId(saleId);
          allItems.push(...items);
        }
        
        // Add items to their respective sales
        for (const group of Object.values(groupedData)) {
          if (group.sales && group.sales.length > 0) {
            for (const sale of group.sales) {
              sale.items = allItems.filter(item => 
                item.saleId && item.saleId.toString() === sale._id.toString()
              );
            }
          }
        }
      }

      return {
        summary: {
          totalAmount,
          totalSales,
          dateRange: {
            from: dateFrom,
            to: dateTo,
          },
        },
        groupedBy: groupBy,
        data: groupedResults,
      };
    } catch (error) {
      console.error("Error generating sales report:", error);
      throw error;
    }
  }

  /**
   * Calculate profit margins
   * @param {Object} options - Calculation options
   * @return {Promise<Object>} - Profit margin data
   */
  async calculateProfitMargins(options = {}) {
    try {
      const {
        dateFrom,
        dateTo,
        groupBy = "item",
      } = options;

      // Ensure we have repositories for both sale items and purchase items
      if (!this.saleItemRepository || !this.purchaseItemRepository) {
        throw new Error("Sale item and purchase item repositories are required for profit calculations");
      }

      // Build filter for sales
      const filter = { status: "completed" };
      
      if (dateFrom || dateTo) {
        filter.transactionDate = {};
        if (dateFrom) filter.transactionDate.$gte = new Date(dateFrom);
        if (dateTo) filter.transactionDate.$lte = new Date(dateTo);
      }

      // Get sales
      const sales = await this.findAll(filter);
      
      // Get all sale IDs
      const saleIds = sales.map(s => s._id);
      
      // Calculate total revenue
      const totalRevenue = sales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
      
      // Get all sale items
      let allSaleItems = [];
      for (const saleId of saleIds) {
        const items = await this.saleItemRepository.findBySaleId(saleId);
        allSaleItems.push(...items);
      }

      // If grouping by item, calculate profit for each item
      let profitData = {};
      let totalCost = 0;
      
      if (groupBy === "item") {
        // Group items by itemId
        const itemsById = allSaleItems.reduce((grouped, item) => {
          const itemId = item.itemId;
          
          if (!grouped[itemId]) {
            grouped[itemId] = {
              itemId,
              itemName: item.itemName || "Unknown Item",
              totalRevenue: 0,
              totalCost: 0,
              totalProfit: 0,
              marginPercent: 0,
              quantitySold: 0,
            };
          }
          
          const revenue = item.unitPrice * item.quantity;
          grouped[itemId].totalRevenue += revenue;
          grouped[itemId].quantitySold += item.quantity;
          
          return grouped;
        }, {});
        
        // Calculate costs and profits for each item
        for (const itemId in itemsById) {
          const avgCost = await this.purchaseItemRepository.calculateAveragePurchaseCost(
            itemId, 
            { dateFrom, dateTo }
          );
          
          const itemData = itemsById[itemId];
          const cost = avgCost * itemData.quantitySold;
          
          itemData.totalCost = cost;
          itemData.totalProfit = itemData.totalRevenue - cost;
          itemData.marginPercent = itemData.totalRevenue > 0 
            ? (itemData.totalProfit / itemData.totalRevenue) * 100 
            : 0;
            
          totalCost += cost;
        }
        
        profitData = Object.values(itemsById);
      } else {
        // Simplified calculation without item grouping
        for (const item of allSaleItems) {
          const avgCost = await this.purchaseItemRepository.calculateAveragePurchaseCost(
            item.itemId, 
            { dateFrom, dateTo }
          );
          
          const itemCost = avgCost * item.quantity;
          totalCost += itemCost;
        }
      }
      
      // Calculate overall profit and margin
      const totalProfit = totalRevenue - totalCost;
      const overallMarginPercent = totalRevenue > 0 
        ? (totalProfit / totalRevenue) * 100 
        : 0;

      return {
        summary: {
          totalRevenue,
          totalCost,
          totalProfit,
          marginPercent: overallMarginPercent,
          dateRange: {
            from: dateFrom,
            to: dateTo,
          },
        },
        groupedBy: groupBy,
        data: groupBy === "item" ? profitData : [],
      };
    } catch (error) {
      console.error("Error calculating profit margins:", error);
      throw error;
    }
  }
}

// Ensure the repository implements the interface
Object.getOwnPropertyNames(SaleTransactionInterface.prototype)
  .filter(prop => prop !== "constructor")
  .forEach(method => {
    if (!SaleTransactionRepository.prototype[method]) {
      throw new Error(
        `SaleTransactionRepository must implement ${method} from SaleTransactionInterface`
      );
    }
  });

module.exports = SaleTransactionRepository;