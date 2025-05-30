/**
 * Purchase Transaction Service
 * 
 * Handles business logic related to purchase transactions
 */

const providerFactory = require("../providers/providerFactory");
const { AppError, ValidationError } = require("../validation/errors");
const { PurchaseTransaction } = require("../models/purchaseTransactionModel");
const { Purchase } = require("../models/purchaseModel");
const { PurchaseItem } = require("../models/purchaseItemModel");

/**
 * Service for handling purchase transaction operations
 */
class PurchaseTransactionService {
  /**
   * Creates a new purchase transaction service instance
   * 
   * @constructor
   */
  constructor() {
    this.purchaseTransactionRepository = providerFactory.createPurchaseTransactionRepository();
    this.itemRepository = providerFactory.createItemRepository();
    this.transactionProvider = providerFactory.getTransactionProvider();
  }

  /**
   * Get all purchase transactions matching a filter
   * 
   * @param {Object} filter - Filter criteria
   * @param {Object} options - Query options (pagination, sorting, etc.)
   * @returns {Promise<Array<Object>>} Array of purchase transactions
   */
  async getAllPurchaseTransactions(filter = {}, options = {}) {
    return this.purchaseTransactionRepository.findAll(filter, options);
  }

  /**
   * Get a purchase transaction by ID
   * 
   * @param {string} id - Purchase transaction ID
   * @returns {Promise<Object|null>} Purchase transaction or null if not found
   */
  async getPurchaseTransactionById(id) {
    if (!id) {
      throw new ValidationError("Purchase transaction ID is required", ["id"]);
    }

    return this.purchaseTransactionRepository.findById(id);
  }

  /**
   * Create a new purchase transaction
   * 
   * @param {Object} data - Purchase transaction data
   * @param {boolean} updateInventory - Whether to update inventory quantities
   * @returns {Promise<Object>} Created purchase transaction
   */
  async createPurchaseTransaction(data, updateInventory = true) {
    // Validate transaction data
    this.validatePurchaseTransactionData(data);

    // Start a database transaction
    const dbTransaction = await this.transactionProvider.beginTransaction();

    try {
      // Create the purchase transaction
      const purchaseTransaction = await this.purchaseTransactionRepository.create(
        new PurchaseTransaction(data).toJSON(),
        dbTransaction
      );

      // If updateInventory flag is true, update the inventory
      if (updateInventory && data.items && data.items.length > 0) {
        await this.updateInventoryForPurchase(purchaseTransaction, data.items, dbTransaction);
      }

      // Commit the transaction
      await this.transactionProvider.commitTransaction(dbTransaction);

      return purchaseTransaction;
    } catch (error) {
      // Rollback in case of error
      await this.transactionProvider.rollbackTransaction(dbTransaction);
      throw error;
    }
  }

  /**
   * Update a purchase transaction
   * 
   * @param {string} id - Purchase transaction ID
   * @param {Object} data - Updated purchase transaction data
   * @param {boolean} updateInventory - Whether to update inventory quantities
   * @returns {Promise<Object|null>} Updated purchase transaction or null if not found
   */
  async updatePurchaseTransaction(id, data, updateInventory = true) {
    if (!id) {
      throw new ValidationError("Purchase transaction ID is required", ["id"]);
    }

    // Get the existing transaction to handle inventory changes properly
    const existingTransaction = await this.purchaseTransactionRepository.findById(id);
    if (!existingTransaction) {
      return null;
    }

    // Start a database transaction
    const dbTransaction = await this.transactionProvider.beginTransaction();

    try {
      // If we're updating inventory and have item changes
      if (updateInventory && data.items) {
        // First, reverse the inventory effect of the existing transaction items
        if (existingTransaction.items && existingTransaction.items.length > 0) {
          await this.reverseInventoryForPurchase(existingTransaction, dbTransaction);
        }
      }

      // Update the transaction
      const updatedTransaction = await this.purchaseTransactionRepository.update(
        id,
        data,
        dbTransaction
      );

      // If updating inventory and we have updated items, apply the new inventory changes
      if (updateInventory && data.items && updatedTransaction) {
        await this.updateInventoryForPurchase(updatedTransaction, data.items, dbTransaction);
      }

      // Commit the transaction
      await this.transactionProvider.commitTransaction(dbTransaction);

      return updatedTransaction;
    } catch (error) {
      // Rollback in case of error
      await this.transactionProvider.rollbackTransaction(dbTransaction);
      throw error;
    }
  }

  /**
   * Delete a purchase transaction
   * 
   * @param {string} id - Purchase transaction ID
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  async deletePurchaseTransaction(id) {
    if (!id) {
      throw new ValidationError("Purchase transaction ID is required", ["id"]);
    }

    // Get the existing transaction to handle inventory changes properly
    const existingTransaction = await this.purchaseTransactionRepository.findById(id);
    if (!existingTransaction) {
      return false;
    }

    // Start a database transaction
    const dbTransaction = await this.transactionProvider.beginTransaction();

    try {
      // Reverse inventory effects if transaction has items
      if (existingTransaction.items && existingTransaction.items.length > 0) {
        await this.reverseInventoryForPurchase(existingTransaction, dbTransaction);
      }

      // Delete the transaction
      const result = await this.purchaseTransactionRepository.delete(id, dbTransaction);

      // Commit the database transaction
      await this.transactionProvider.commitTransaction(dbTransaction);

      return result;
    } catch (error) {
      // Rollback in case of error
      await this.transactionProvider.rollbackTransaction(dbTransaction);
      throw error;
    }
  }

  /**
   * Record a payment for a purchase transaction
   * 
   * @param {string} id - Purchase transaction ID
   * @param {number} amount - Payment amount
   * @param {string} method - Payment method
   * @param {Date} date - Payment date
   * @returns {Promise<Object|null>} Updated purchase transaction or null if not found
   */
  async recordPayment(id, amount, method, date = new Date()) {
    if (!id) {
      throw new ValidationError("Purchase transaction ID is required", ["id"]);
    }

    if (amount === undefined || amount === null) {
      throw new ValidationError("Payment amount is required", ["amount"]);
    }

    if (!method) {
      throw new ValidationError("Payment method is required", ["method"]);
    }

    // Get the existing transaction
    const existingTransaction = await this.purchaseTransactionRepository.findById(id);
    if (!existingTransaction) {
      return null;
    }

    // Create the payment record
    const payment = {
      amount,
      method,
      date,
      id: `pmt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    };

    // Calculate new payment status
    let payments = existingTransaction.payments || [];
    payments = [...payments, payment];
    
    // Calculate total paid amount
    const totalPaid = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    
    // Calculate total transaction amount
    const totalAmount = parseFloat(existingTransaction.totalAmount) || 0;
    
    // Determine payment status
    let paymentStatus = "unpaid";
    if (totalPaid >= totalAmount) {
      paymentStatus = "paid";
    } else if (totalPaid > 0) {
      paymentStatus = "partial";
    }

    // Update the transaction with the new payment and status
    const updateData = {
      payments,
      paymentStatus,
      amountPaid: totalPaid,
      balance: totalAmount - totalPaid,
      lastUpdated: new Date()
    };

    return this.purchaseTransactionRepository.update(id, updateData);
  }

  /**
   * Change the status of a purchase transaction
   * 
   * @param {string} id - Purchase transaction ID
   * @param {string} status - New status
   * @param {boolean} updateInventory - Whether to update inventory quantities
   * @returns {Promise<Object|null>} Updated purchase transaction or null if not found
   */
  async changePurchaseStatus(id, status, updateInventory = true) {
    if (!id) {
      throw new ValidationError("Purchase transaction ID is required", ["id"]);
    }

    if (!status) {
      throw new ValidationError("Status is required", ["status"]);
    }

    // Get the existing transaction
    const existingTransaction = await this.purchaseTransactionRepository.findById(id);
    if (!existingTransaction) {
      return null;
    }

    // If no inventory update needed or status isn't changing, just update the status
    if (!updateInventory || existingTransaction.status === status) {
      return this.purchaseTransactionRepository.update(id, { 
        status, 
        lastUpdated: new Date() 
      });
    }

    // Start a database transaction for inventory updates
    const dbTransaction = await this.transactionProvider.beginTransaction();

    try {
      // Handle inventory based on status changes
      // If changing from draft/pending to confirmed/completed, add to inventory
      if (
        (existingTransaction.status === "draft" || existingTransaction.status === "pending") &&
        (status === "confirmed" || status === "completed")
      ) {
        if (existingTransaction.items && existingTransaction.items.length > 0) {
          await this.updateInventoryForPurchase(existingTransaction, existingTransaction.items, dbTransaction);
        }
      }
      // If changing from confirmed/completed to canceled/returned, remove from inventory
      else if (
        (existingTransaction.status === "confirmed" || existingTransaction.status === "completed") &&
        (status === "canceled" || status === "returned")
      ) {
        if (existingTransaction.items && existingTransaction.items.length > 0) {
          await this.reverseInventoryForPurchase(existingTransaction, dbTransaction);
        }
      }

      // Update the transaction status
      const updatedTransaction = await this.purchaseTransactionRepository.update(
        id, 
        { status, lastUpdated: new Date() },
        dbTransaction
      );

      // Commit the transaction
      await this.transactionProvider.commitTransaction(dbTransaction);

      return updatedTransaction;
    } catch (error) {
      // Rollback in case of error
      await this.transactionProvider.rollbackTransaction(dbTransaction);
      throw error;
    }
  }

  /**
   * Get purchase transactions by vendor
   * 
   * @param {string} vendorId - Vendor ID
   * @param {Object} options - Query options
   * @returns {Promise<Array<Object>>} Purchase transactions for the vendor
   */
  async getPurchasesByVendor(vendorId, options = {}) {
    if (!vendorId) {
      throw new ValidationError("Vendor ID is required", ["vendorId"]);
    }

    return this.purchaseTransactionRepository.findAll({ vendorId }, options);
  }

  /**
   * Get purchase transaction statistics
   * 
   * @param {Object} filter - Filter criteria
   * @param {Date} startDate - Start date for statistics
   * @param {Date} endDate - End date for statistics
   * @returns {Promise<Object>} Purchase statistics
   */
  async getPurchaseStats(filter = {}, startDate = null, endDate = null) {
    // Apply date filter if provided
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        date: {
          $gte: startDate,
          $lte: endDate
        }
      };
    } else if (startDate) {
      dateFilter = {
        date: {
          $gte: startDate
        }
      };
    } else if (endDate) {
      dateFilter = {
        date: {
          $lte: endDate
        }
      };
    }

    // Combine with other filters
    const combinedFilter = {
      ...filter,
      ...dateFilter
    };

    // Get all matching transactions
    const transactions = await this.purchaseTransactionRepository.findAll(combinedFilter);

    // Calculate total amounts by status
    let totalAmount = 0;
    let paidAmount = 0;
    let outstandingAmount = 0;
    let countByStatus = {};
    let countByMonth = {};
    let spendByVendor = {};

    transactions.forEach(transaction => {
      // Add to total amount
      const transactionAmount = parseFloat(transaction.totalAmount) || 0;
      totalAmount += transactionAmount;

      // Add to paid/outstanding amounts
      const amountPaid = parseFloat(transaction.amountPaid) || 0;
      paidAmount += amountPaid;
      outstandingAmount += (transactionAmount - amountPaid);

      // Count by status
      const status = transaction.status || "unknown";
      countByStatus[status] = (countByStatus[status] || 0) + 1;

      // Group by month
      if (transaction.date) {
        const date = new Date(transaction.date);
        const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}`;
        if (!countByMonth[monthKey]) {
          countByMonth[monthKey] = {
            count: 0,
            amount: 0
          };
        }
        countByMonth[monthKey].count += 1;
        countByMonth[monthKey].amount += transactionAmount;
      }

      // Group by vendor
      if (transaction.vendorId) {
        if (!spendByVendor[transaction.vendorId]) {
          spendByVendor[transaction.vendorId] = 0;
        }
        spendByVendor[transaction.vendorId] += transactionAmount;
      }
    });

    // Format spend by vendor as an array
    const vendorSpending = Object.entries(spendByVendor).map(([vendorId, amount]) => ({
      vendorId,
      amount
    })).sort((a, b) => b.amount - a.amount);

    // Return comprehensive statistics
    return {
      totalAmount,
      paidAmount,
      outstandingAmount,
      transactionCount: transactions.length,
      countByStatus,
      countByMonth,
      vendorSpending: vendorSpending.slice(0, 10) // Top 10 vendors
    };
  }

  // Private helper methods

  /**
   * Validate purchase transaction data
   * 
   * @param {Object} data - Purchase transaction data to validate
   * @throws {ValidationError} If validation fails
   * @private
   */
  validatePurchaseTransactionData(data) {
    const errors = [];

    if (!data.vendorId) {
      errors.push("vendorId");
    }

    if (!data.date) {
      errors.push("date");
    }

    // Validate items if present
    if (data.items && Array.isArray(data.items)) {
      data.items.forEach((item, index) => {
        if (!item.itemId) {
          errors.push(`items[${index}].itemId`);
        }
        if (item.quantity === undefined || item.quantity === null) {
          errors.push(`items[${index}].quantity`);
        }
        if (item.unitPrice === undefined || item.unitPrice === null) {
          errors.push(`items[${index}].unitPrice`);
        }
      });
    }

    if (errors.length > 0) {
      throw new ValidationError("Invalid purchase transaction data", errors);
    }
  }

  /**
   * Update inventory for purchase items
   * 
   * @param {Object} transaction - Purchase transaction
   * @param {Array<Object>} items - Purchase items
   * @param {Object} dbTransaction - Database transaction
   * @returns {Promise<void>}
   * @private
   */
  async updateInventoryForPurchase(transaction, items, dbTransaction) {
    // Only update inventory for confirmed or completed transactions
    if (transaction.status !== "confirmed" && transaction.status !== "completed") {
      return;
    }

    // Process each item to update inventory
    for (const item of items) {
      const itemId = item.itemId;
      const quantity = parseFloat(item.quantity) || 0;

      if (itemId && quantity > 0) {
        // Get the current item
        const existingItem = await this.itemRepository.findById(itemId);
        
        if (existingItem) {
          // Calculate new quantity
          const currentQuantity = parseFloat(existingItem.quantity) || 0;
          const newQuantity = currentQuantity + quantity;
          
          // Update the item quantity
          await this.itemRepository.update(
            itemId,
            { 
              quantity: newQuantity,
              lastUpdated: new Date()
            },
            dbTransaction
          );
        }
      }
    }
  }

  /**
   * Reverse inventory changes for purchase items
   * 
   * @param {Object} transaction - Purchase transaction
   * @param {Object} dbTransaction - Database transaction
   * @returns {Promise<void>}
   * @private
   */
  async reverseInventoryForPurchase(transaction, dbTransaction) {
    // Only reverse inventory for confirmed or completed transactions
    if (transaction.status !== "confirmed" && transaction.status !== "completed") {
      return;
    }

    // Process each item to reverse inventory changes
    for (const item of transaction.items || []) {
      const itemId = item.itemId;
      const quantity = parseFloat(item.quantity) || 0;

      if (itemId && quantity > 0) {
        // Get the current item
        const existingItem = await this.itemRepository.findById(itemId);
        
        if (existingItem) {
          // Calculate new quantity (subtract the purchase quantity)
          const currentQuantity = parseFloat(existingItem.quantity) || 0;
          const newQuantity = Math.max(0, currentQuantity - quantity); // Prevent negative
          
          // Update the item quantity
          await this.itemRepository.update(
            itemId,
            { 
              quantity: newQuantity,
              lastUpdated: new Date()
            },
            dbTransaction
          );
        }
      }
    }
  }
}

module.exports = new PurchaseTransactionService();