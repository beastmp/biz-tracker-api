/**
 * Purchase Transaction Repository
 * Implements provider-agnostic business logic and operations for the Purchase Transaction entity
 */

const BaseTransactionRepository = require("./baseTransactionRepository");
const PurchaseTransactionInterface = require("../interfaces/purchaseTransactionInterface");
// eslint-disable-next-line no-unused-vars
const {PurchaseTransaction} = require("../../models/purchaseTransactionModel");

/**
 * Base repository for Purchase Transaction operations with provider-agnostic implementation
 * @extends BaseTransactionRepository
 * @implements PurchaseTransactionInterface
 */
class PurchaseTransactionRepository extends BaseTransactionRepository {
  /**
   * Creates a new PurchaseTransactionRepository instance
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    super(config);
    this.purchaseItemRepository = null;
  }

  /**
   * Set the purchase item repository dependency
   * @param {Object} repository - Purchase item repository instance
   */
  setPurchaseItemRepository(repository) {
    this.purchaseItemRepository = repository;
  }

  /**
   * Find transactions by supplier ID
   * @param {string} supplierId - Supplier ID
   * @param {Object} options - Query options
   * @return {Promise<Array>} - List of purchase transactions
   */
  async findBySupplier(supplierId, options = {}) {
    try {
      const filter = {
        supplierId: supplierId,
        ...options.filter,
      };
      
      return await this.findAll(filter, options);
    } catch (error) {
      console.error(`Error finding purchases for supplier ${supplierId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate total spend by supplier
   * @param {string} supplierId - Supplier ID
   * @param {Object} options - Date range options
   * @return {Promise<number>} - Total spend amount
   */
  async calculateTotalSpendBySupplier(supplierId, options = {}) {
    try {
      const {
        dateFrom,
        dateTo,
      } = options;

      // Build filter
      const filter = { supplierId };
      
      if (dateFrom || dateTo) {
        filter.transactionDate = {};
        if (dateFrom) filter.transactionDate.$gte = new Date(dateFrom);
        if (dateTo) filter.transactionDate.$lte = new Date(dateTo);
      }

      // Get completed purchases only
      filter.status = "completed";

      // Get purchases for this supplier
      const purchases = await this.findAll(filter);

      if (!purchases || purchases.length === 0) {
        return 0;
      }

      // Calculate total spend
      return purchases.reduce((total, purchase) => {
        return total + (purchase.totalAmount || 0);
      }, 0);
    } catch (error) {
      console.error(`Error calculating total spend for supplier ${supplierId}:`, error);
      throw error;
    }
  }

  /**
   * Get purchase history summary
   * @param {Object} options - Filter and grouping options
   * @return {Promise<Array>} - Summary data
   */
  async getPurchaseHistorySummary(options = {}) {
    try {
      const {
        dateFrom,
        dateTo,
        groupBy = "month",
      } = options;

      // Implementation depends on specific provider
      throw new Error("Not implemented in base class");
    } catch (error) {
      console.error("Error getting purchase history summary:", error);
      throw error;
    }
  }

  /**
   * Generate purchase report
   * @param {Object} options - Report criteria and options
   * @return {Promise<Object>} - Report data
   */
  async generatePurchaseReport(options = {}) {
    try {
      const {
        dateFrom,
        dateTo,
        groupBy = "supplier",
        includeItems = false,
      } = options;

      // Build filter for transactions
      const filter = {};
      
      if (dateFrom || dateTo) {
        filter.transactionDate = {};
        if (dateFrom) filter.transactionDate.$gte = new Date(dateFrom);
        if (dateTo) filter.transactionDate.$lte = new Date(dateTo);
      }

      // Get completed purchases only
      filter.status = "completed";

      // Get purchases
      const purchases = await this.findAll(filter);

      // Calculate totals
      const totalAmount = purchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
      const totalPurchases = purchases.length;

      // Group data according to the groupBy option
      let groupedData = {};
      
      if (groupBy === "supplier") {
        // Group by supplier
        groupedData = purchases.reduce((grouped, purchase) => {
          const supplierId = purchase.supplierId || "unknown";
          
          if (!grouped[supplierId]) {
            grouped[supplierId] = {
              supplierId,
              supplierName: purchase.supplierName || "Unknown Supplier",
              totalAmount: 0,
              purchaseCount: 0,
              purchases: [],
            };
          }
          
          grouped[supplierId].totalAmount += purchase.totalAmount || 0;
          grouped[supplierId].purchaseCount += 1;
          
          if (includeItems) {
            grouped[supplierId].purchases.push(purchase);
          }
          
          return grouped;
        }, {});
      } else if (groupBy === "month") {
        // Group by month
        groupedData = purchases.reduce((grouped, purchase) => {
          const date = new Date(purchase.transactionDate);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
          
          if (!grouped[monthKey]) {
            grouped[monthKey] = {
              month: monthKey,
              totalAmount: 0,
              purchaseCount: 0,
              purchases: [],
            };
          }
          
          grouped[monthKey].totalAmount += purchase.totalAmount || 0;
          grouped[monthKey].purchaseCount += 1;
          
          if (includeItems) {
            grouped[monthKey].purchases.push(purchase);
          }
          
          return grouped;
        }, {});
      }

      // Convert to array
      const groupedResults = Object.values(groupedData);

      // Include purchase items if requested and repository is available
      if (includeItems && this.purchaseItemRepository) {
        // Get all purchase IDs
        const purchaseIds = purchases.map(p => p._id);
        
        // Get all purchase items
        const allItems = [];
        for (const purchaseId of purchaseIds) {
          const items = await this.purchaseItemRepository.findByPurchaseId(purchaseId);
          allItems.push(...items);
        }
        
        // Add items to their respective purchases
        for (const group of Object.values(groupedData)) {
          if (group.purchases && group.purchases.length > 0) {
            for (const purchase of group.purchases) {
              purchase.items = allItems.filter(item => 
                item.purchaseId && item.purchaseId.toString() === purchase._id.toString()
              );
            }
          }
        }
      }

      return {
        summary: {
          totalAmount,
          totalPurchases,
          dateRange: {
            from: dateFrom,
            to: dateTo,
          },
        },
        groupedBy: groupBy,
        data: groupedResults,
      };
    } catch (error) {
      console.error("Error generating purchase report:", error);
      throw error;
    }
  }
}

// Ensure the repository implements the interface
Object.getOwnPropertyNames(PurchaseTransactionInterface.prototype)
  .filter(prop => prop !== "constructor")
  .forEach(method => {
    if (!PurchaseTransactionRepository.prototype[method]) {
      throw new Error(
        `PurchaseTransactionRepository must implement ${method} from PurchaseTransactionInterface`
      );
    }
  });

module.exports = PurchaseTransactionRepository;