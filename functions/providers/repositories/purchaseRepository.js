/**
 * Purchase Repository
 * Implements provider-agnostic business logic and operations for the Purchase entity
 */

const PurchaseInterface = require("../interfaces/purchaseInterface");
const {Purchase} = require("../../models/purchaseModel");

/**
 * Base repository for Purchase operations with provider-agnostic implementation
 */
class PurchaseRepository extends PurchaseInterface {
  /**
   * Creates a new PurchaseRepository instance
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    super();
    this.config = config;
    this.transactionProvider = null;
    this.relationshipRepository = null;
    this.itemRepository = null;
    this.assetRepository = null;
  }

  /**
   * Set the transaction provider dependency
   * @param {Object} provider - Transaction provider instance
   */
  setTransactionProvider(provider) {
    this.transactionProvider = provider;
  }

  /**
   * Set the relationship repository dependency
   * @param {Object} repository - Relationship repository instance
   */
  setRelationshipRepository(repository) {
    this.relationshipRepository = repository;
  }

  /**
   * Set the item repository dependency
   * @param {Object} repository - Item repository instance
   */
  setItemRepository(repository) {
    this.itemRepository = repository;
  }

  /**
   * Set the asset repository dependency
   * @param {Object} repository - Asset repository instance
   */
  setAssetRepository(repository) {
    this.assetRepository = repository;
  }

  /**
   * Get all unique suppliers from purchases
   * @return {Promise<Array<string>>} List of suppliers
   */
  async getSuppliers() {
    try {
      const purchases = await this.findAll({});
      // Extract unique suppliers, filter out undefined/null/empty values
      const suppliers = new Set(
          purchases.map((purchase) => purchase.supplier).filter(Boolean),
      );
      return [...suppliers].sort();
    } catch (error) {
      console.error("Error getting suppliers:", error);
      throw error;
    }
  }

  /**
   * Get all unique tags from purchases
   * @return {Promise<Array<string>>} List of tags
   */
  async getTags() {
    try {
      const purchases = await this.findAll({});
      // Extract all tags from all purchases, flatten array, get unique values
      const tagsSet = new Set(
          purchases.flatMap((purchase) => purchase.tags || []).filter(Boolean),
      );
      return [...tagsSet].sort();
    } catch (error) {
      console.error("Error getting purchase tags:", error);
      throw error;
    }
  }

  /**
   * Generate the next purchase number
   * @return {Promise<string>} Next purchase number
   */
  async generatePurchaseNumber() {
    try {
      const purchases = await this.findAll({});

      // Extract purchase numbers that follow the pattern "PO-XXXXX"
      const pattern = /^PO-(\d+)$/;
      const poNumbers = purchases
          .map((purchase) => purchase.purchaseNumber || "")
          .filter((num) => pattern.test(num))
          .map((num) => {
            const match = num.match(pattern);
            return match ? parseInt(match[1], 10) : 0;
          });

      // Get the highest number and increment
      const maxNumber = poNumbers.length > 0 ? Math.max(...poNumbers) : 0;
      const nextNumber = maxNumber + 1;

      // Format as PO-XXXXX (padded to 5 digits)
      return `PO-${nextNumber.toString().padStart(5, "0")}`;
    } catch (error) {
      console.error("Error generating next purchase number:", error);
      throw error;
    }
  }

  /**
   * Receive items for a purchase
   * @param {string} id - Purchase ID
   * @param {Array} receivedItems - Array of received items with quantities
   * @param {Object} [transaction] - Optional transaction
   * @return {Promise<Object|null>} Updated purchase or null if not found
   */
  async receiveItems(id, receivedItems, transaction = null) {
    try {
      const purchase = await this.findById(id);
      if (!purchase) return null;

      // Create a new Purchase instance to use its business logic
      const purchaseInstance = new Purchase(purchase);

      // Update received items
      purchaseInstance.receiveItems(receivedItems);

      // Update the purchase with the new state
      return await this.update(
          id,
          {
            items: purchaseInstance.items,
            status: purchaseInstance.status,
          },
          transaction,
      );
    } catch (error) {
      console.error(`Error receiving items for purchase ${id}:`, error);
      throw error;
    }
  }

  /**
   * Record payment for a purchase
   * @param {string} id - Purchase ID
   * @param {Object} paymentData - Payment data
   * @param {Object} [transaction] - Optional transaction
   * @return {Promise<Object|null>} Updated purchase or null if not found
   */
  async recordPayment(id, paymentData, transaction = null) {
    try {
      const {amount, method, date = new Date()} = paymentData;

      if (!amount || amount <= 0) {
        throw new Error("Payment amount must be greater than zero");
      }

      const purchase = await this.findById(id);
      if (!purchase) return null;

      // Create a new Purchase instance to use its business logic
      const purchaseInstance = new Purchase(purchase);

      // Record the payment
      purchaseInstance.recordPayment(amount, method, date);

      // Update the purchase with the new state
      return await this.update(
          id,
          {
            amountPaid: purchaseInstance.amountPaid,
            paymentMethod: purchaseInstance.paymentMethod,
            paymentStatus: purchaseInstance.paymentStatus,
            paymentDate: purchaseInstance.paymentDate,
          },
          transaction,
      );
    } catch (error) {
      console.error(`Error recording payment for purchase ${id}:`, error);
      throw error;
    }
  }

  /**
   * Mark purchase as ordered
   * @param {string} id - Purchase ID
   * @param {Object} [transaction] - Optional transaction
   * @return {Promise<Object|null>} Updated purchase or null if not found
   */
  async markAsOrdered(id, transaction = null) {
    try {
      const purchase = await this.findById(id);
      if (!purchase) return null;

      // Create a new Purchase instance to use its business logic
      const purchaseInstance = new Purchase(purchase);

      // Mark as ordered
      purchaseInstance.markAsOrdered();

      // Update the purchase with the new state
      return await this.update(
          id,
          {
            status: purchaseInstance.status,
            totalAmount: purchaseInstance.calculateTotal(),
            items: purchaseInstance.updateItemTotals(),
          },
          transaction,
      );
    } catch (error) {
      console.error(`Error marking purchase ${id} as ordered:`, error);
      throw error;
    }
  }

  /**
   * Mark purchase as completed
   * @param {string} id - Purchase ID
   * @param {Object} [transaction] - Optional transaction
   * @return {Promise<Object|null>} Updated purchase or null if not found
   */
  async markAsCompleted(id, transaction = null) {
    try {
      const purchase = await this.findById(id);
      if (!purchase) return null;

      // Create a new Purchase instance to use its business logic
      const purchaseInstance = new Purchase(purchase);

      // Mark as completed
      purchaseInstance.markAsCompleted();

      // Update the purchase with the new state
      return await this.update(
          id,
          {
            status: purchaseInstance.status,
          },
          transaction,
      );
    } catch (error) {
      console.error(`Error marking purchase ${id} as completed:`, error);
      throw error;
    }
  }

  /**
   * Cancel a purchase
   * @param {string} id - Purchase ID
   * @param {string} reason - Cancellation reason
   * @param {Object} [transaction] - Optional transaction
   * @return {Promise<Object|null>} Updated purchase or null if not found
   */
  async cancelPurchase(id, reason, transaction = null) {
    try {
      const purchase = await this.findById(id);
      if (!purchase) return null;

      // Create a new Purchase instance to use its business logic
      const purchaseInstance = new Purchase(purchase);

      // Cancel the purchase
      purchaseInstance.cancel(reason);

      // Update the purchase with the new state
      return await this.update(
          id,
          {
            status: purchaseInstance.status,
            notes: purchaseInstance.notes,
          },
          transaction,
      );
    } catch (error) {
      console.error(`Error cancelling purchase ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get purchases by supplier
   * @param {string} supplierId - Supplier ID
   * @return {Promise<Array>} List of purchases from the supplier
   */
  async getPurchasesBySupplier(supplierId) {
    try {
      // Try to find by supplierId field first
      let purchases = [];

      if (supplierId) {
        purchases = await this.findAll({supplierId});
      }

      // If no results and we have a supplier name instead of ID, search by name
      if (purchases.length === 0 && typeof supplierId === "string") {
        purchases = await this.findAll({supplier: supplierId});
      }

      return purchases;
    } catch (error) {
      console.error(`Error getting purchases for supplier ${supplierId}:`, error);
      throw error;
    }
  }

  /**
   * Get purchases by item
   * @param {string} itemId - Item ID
   * @return {Promise<Array>} List of purchases containing the item
   */
  async getPurchasesByItem(itemId) {
    try {
      if (!itemId) return [];

      const purchases = await this.findAll({});

      // Filter purchases that contain the specified item
      return purchases.filter((purchase) =>
        purchase.items && purchase.items.some((item) =>
          item.itemId === itemId,
        ),
      );
    } catch (error) {
      console.error(`Error getting purchases for item ${itemId}:`, error);
      throw error;
    }
  }

  /**
   * Generate purchase report
   * @param {Object} options - Report options
   * @return {Promise<Object>} Purchase report data
   */
  async generateReport(options = {}) {
    try {
      const {
        startDate = null,
        endDate = null,
        supplier = null,
        status = null,
        paymentStatus = null,
        groupBy = "month",
      } = options;

      // Build filter based on options
      const filter = {};

      if (startDate || endDate) {
        filter.purchaseDate = {};
        if (startDate) filter.purchaseDate.$gte = new Date(startDate);
        if (endDate) filter.purchaseDate.$lte = new Date(endDate);
      }

      if (supplier) filter.supplier = supplier;
      if (status) filter.status = status;
      if (paymentStatus) filter.paymentStatus = paymentStatus;

      // Get purchases based on filter
      const purchases = await this.findAll(filter, {sort: {purchaseDate: 1}});

      // Calculate summary statistics
      const totalAmount = purchases.reduce(
          (sum, purchase) => sum + (purchase.totalAmount || 0),
          0,
      );

      const totalPaid = purchases.reduce(
          (sum, purchase) => sum + (purchase.amountPaid || 0),
          0,
      );

      const totalUnpaid = totalAmount - totalPaid;

      // Group purchases by the selected grouping
      const groupedPurchases = {};
      const groupSummaries = {};

      purchases.forEach((purchase) => {
        let groupKey;
        const purchaseDate = new Date(purchase.purchaseDate);

        switch (groupBy) {
          case "day":
            groupKey = purchaseDate.toISOString().split("T")[0];
            break;
          case "week": {
            // Get the week number (approximate by dividing days by 7)
            const startOfYear = new Date(purchaseDate.getFullYear(), 0, 1);
            const days = Math.floor(
                (purchaseDate - startOfYear) / (24 * 60 * 60 * 1000),
            );
            const weekNumber = Math.ceil(days / 7);
            groupKey = `${purchaseDate.getFullYear()}-W${weekNumber}`;
            break;
          }
          case "month": {
            groupKey = `${purchaseDate.getFullYear()}-${String(
                purchaseDate.getMonth() + 1,
            ).padStart(2, "0")}`;
            break;
          }
          case "quarter": {
            const quarter = Math.ceil((purchaseDate.getMonth() + 1) / 3);
            groupKey = `${purchaseDate.getFullYear()}-Q${quarter}`;
            break;
          }
          case "year":
            groupKey = `${purchaseDate.getFullYear()}`;
            break;
          case "supplier":
            groupKey = purchase.supplier || "Unknown";
            break;
          case "status":
            groupKey = purchase.status || "Unknown";
            break;
          default:
            groupKey = "all";
        }

        // Add purchase to the group
        if (!groupedPurchases[groupKey]) {
          groupedPurchases[groupKey] = [];
          groupSummaries[groupKey] = {
            count: 0,
            totalAmount: 0,
            amountPaid: 0,
            amountUnpaid: 0,
          };
        }

        groupedPurchases[groupKey].push(purchase);

        // Update group summary
        groupSummaries[groupKey].count++;
        groupSummaries[groupKey].totalAmount += purchase.totalAmount || 0;
        groupSummaries[groupKey].amountPaid += purchase.amountPaid || 0;
        groupSummaries[groupKey].amountUnpaid =
          groupSummaries[groupKey].totalAmount -
          groupSummaries[groupKey].amountPaid;
      });

      // Count by status
      const countByStatus = {};
      purchases.forEach((purchase) => {
        const status = purchase.status || "unknown";
        if (!countByStatus[status]) {
          countByStatus[status] = {
            count: 0,
            totalAmount: 0,
          };
        }
        countByStatus[status].count++;
        countByStatus[status].totalAmount += purchase.totalAmount || 0;
      });

      // Count by payment status
      const countByPaymentStatus = {};
      purchases.forEach((purchase) => {
        const status = purchase.paymentStatus || "unknown";
        if (!countByPaymentStatus[status]) {
          countByPaymentStatus[status] = {
            count: 0,
            totalAmount: 0,
          };
        }
        countByPaymentStatus[status].count++;
        countByPaymentStatus[status].totalAmount += purchase.totalAmount || 0;
      });

      // Return the report
      return {
        generatedAt: new Date(),
        reportOptions: {
          startDate,
          endDate,
          supplier,
          status,
          paymentStatus,
          groupBy,
        },
        summary: {
          totalPurchases: purchases.length,
          totalAmount,
          totalPaid,
          totalUnpaid,
          paymentRate: totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0,
        },
        groupSummaries,
        countByStatus,
        countByPaymentStatus,
        groups: groupedPurchases,
      };
    } catch (error) {
      console.error("Error generating purchase report:", error);
      throw error;
    }
  }

  /**
   * Add document to purchase
   * @param {string} id - Purchase ID
   * @param {string} documentUrl - URL to the document
   * @return {Promise<Object|null>} Updated purchase or null if not found
   */
  async addDocument(id, documentUrl) {
    try {
      if (!id || !documentUrl) {
        throw new Error("Purchase ID and document URL are required");
      }

      return await this.update(id, {documentUrl});
    } catch (error) {
      console.error(`Error adding document to purchase ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get purchase relationships
   * @param {string} purchaseId - Purchase ID
   * @return {Promise<Object>} Relationship information
   */
  async getPurchaseRelationships(purchaseId) {
    try {
      // Check if relationship repository is available
      if (!this.relationshipRepository) {
        return {hasRelationships: false};
      }

      // Get relationships from the relationship repository
      const relationships = await this.relationshipRepository
          .getRelationshipsForEntity(purchaseId, "Purchase");

      return relationships;
    } catch (error) {
      console.error(
          `Error getting relationships for purchase ${purchaseId}:`,
          error,
      );
      throw error;
    }
  }

  /**
   * Update a purchase with raw MongoDB operators
   *
   * @param {string} id - ID of the purchase to update
   * @param {Object} updateData - Update data with MongoDB operators like $set, $unset, etc.
   * @param {Object} [transaction] - Optional transaction
   * @return {Promise<Object|null>} Updated purchase or null if not found
   */
  async updateRaw(id, updateData, transaction = null) {
    try {
      // Get the database provider implementation
      const provider = this.getProvider();

      // Call the provider's raw update method if available
      if (provider.updateRaw) {
        return await provider.updateRaw("purchases", id, updateData, transaction);
      }

      // Fallback to regular update if raw update not supported by provider
      console.warn("Provider does not support raw updates, falling back to regular update");

      // Remove MongoDB operators from the update
      const cleanData = {};
      if (updateData.$set) {
        Object.assign(cleanData, updateData.$set);
      }

      // Attempt standard update as fallback
      return await this.update(id, cleanData, transaction);
    } catch (error) {
      console.error(`Error in raw update for purchase ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get the database provider instance
   *
   * @return {Object} Provider instance
   */
  getProvider() {
    // If this is a MongoDB repository, it will have a direct provider reference
    if (this.provider) {
      return this.provider;
    }

    // Otherwise try to get it from the provider factory
    try {
      const providerFactory = require("../providerFactory");
      return providerFactory.getDatabaseProvider();
    } catch (error) {
      console.error("Failed to get database provider:", error);
      throw new Error("Database provider not available");
    }
  }
}

module.exports = PurchaseRepository;
