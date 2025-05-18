/**
 * Purchase Service
 * Contains business logic for purchase transaction operations
 */

const { Purchase } = require("../models/purchaseModel");
const providerFactory = require("../providers/providerFactory");
const itemService = require("./itemService");

/**
 * Purchase Service class
 * Handles business logic for purchase transactions
 */
class PurchaseService {
  /**
   * Create a new PurchaseService instance
   */
  constructor() {
    this.purchaseRepository = providerFactory.createPurchaseRepository();
  }

  /**
   * Get all purchases
   * 
   * @param {Object} query - Query parameters for filtering purchases
   * @param {Object} options - Options for pagination, sorting, etc.
   * @returns {Promise<Array>} Array of purchases
   */
  async getAllPurchases(query = {}, options = {}) {
    return this.purchaseRepository.findAll(query, options);
  }

  /**
   * Get a single purchase by ID
   * 
   * @param {string} id - Purchase ID
   * @returns {Promise<Object>} Purchase data
   */
  async getPurchaseById(id) {
    return this.purchaseRepository.findById(id);
  }

  /**
   * Get a purchase by purchase number
   * 
   * @param {string} purchaseNumber - Purchase number
   * @returns {Promise<Object>} Purchase data
   */
  async getPurchaseByNumber(purchaseNumber) {
    const purchases = await this.purchaseRepository.findAll({ purchaseNumber }, { limit: 1 });
    return purchases[0] || null;
  }

  /**
   * Create a new purchase
   * 
   * @param {Object} purchaseData - Purchase data
   * @returns {Promise<Object>} Created purchase
   */
  async createPurchase(purchaseData) {
    const purchase = new Purchase(purchaseData);
    purchase.validate();
    
    // Calculate totals based on items
    purchase.updateItemTotals();
    
    return this.purchaseRepository.create(purchase.toObject());
  }

  /**
   * Update an existing purchase
   * 
   * @param {string} id - Purchase ID
   * @param {Object} purchaseData - Updated purchase data
   * @returns {Promise<Object>} Updated purchase
   */
  async updatePurchase(id, purchaseData) {
    const existingPurchase = await this.purchaseRepository.findById(id);
    if (!existingPurchase) {
      throw new Error(`Purchase with ID ${id} not found`);
    }

    // Create purchase with existing data merged with updates
    const purchase = new Purchase({
      ...existingPurchase,
      ...purchaseData
    });
    
    purchase.validate();
    purchase.updateItemTotals();
    
    return this.purchaseRepository.update(id, purchase.toObject());
  }

  /**
   * Delete a purchase
   * 
   * @param {string} id - Purchase ID
   * @returns {Promise<boolean>} True if deleted
   */
  async deletePurchase(id) {
    return this.purchaseRepository.delete(id);
  }

  /**
   * Mark a purchase as ordered
   * 
   * @param {string} id - Purchase ID
   * @returns {Promise<Object>} Updated purchase
   */
  async markAsOrdered(id) {
    const purchaseData = await this.purchaseRepository.findById(id);
    if (!purchaseData) {
      throw new Error(`Purchase with ID ${id} not found`);
    }

    const purchase = new Purchase(purchaseData);
    purchase.markAsOrdered();
    
    return this.purchaseRepository.update(id, purchase.toObject());
  }

  /**
   * Receive items for a purchase
   * 
   * @param {string} id - Purchase ID
   * @param {Array} receivedItems - Array of received items with quantities
   * @param {boolean} updateInventory - Whether to update inventory levels
   * @returns {Promise<Object>} Updated purchase
   */
  async receiveItems(id, receivedItems, updateInventory = true) {
    const purchaseData = await this.purchaseRepository.findById(id);
    if (!purchaseData) {
      throw new Error(`Purchase with ID ${id} not found`);
    }

    const purchase = new Purchase(purchaseData);
    purchase.receiveItems(receivedItems);
    
    // Update inventory for each received item
    if (updateInventory) {
      for (const receivedItem of receivedItems) {
        if (receivedItem.itemId && receivedItem.quantity > 0) {
          await itemService.updateInventory(
            receivedItem.itemId, 
            receivedItem.quantity
          );
        }
      }
    }
    
    return this.purchaseRepository.update(id, purchase.toObject());
  }

  /**
   * Mark a purchase as completed
   * 
   * @param {string} id - Purchase ID
   * @returns {Promise<Object>} Updated purchase
   */
  async markAsCompleted(id) {
    const purchaseData = await this.purchaseRepository.findById(id);
    if (!purchaseData) {
      throw new Error(`Purchase with ID ${id} not found`);
    }

    const purchase = new Purchase(purchaseData);
    purchase.markAsCompleted();
    
    return this.purchaseRepository.update(id, purchase.toObject());
  }

  /**
   * Cancel a purchase
   * 
   * @param {string} id - Purchase ID
   * @param {string} reason - Reason for cancellation
   * @returns {Promise<Object>} Updated purchase
   */
  async cancelPurchase(id, reason) {
    const purchaseData = await this.purchaseRepository.findById(id);
    if (!purchaseData) {
      throw new Error(`Purchase with ID ${id} not found`);
    }

    const purchase = new Purchase(purchaseData);
    purchase.cancel(reason);
    
    return this.purchaseRepository.update(id, purchase.toObject());
  }

  /**
   * Record a payment for a purchase
   * 
   * @param {string} id - Purchase ID
   * @param {number} amount - Payment amount
   * @param {string} method - Payment method
   * @param {Date} date - Payment date
   * @returns {Promise<Object>} Updated purchase
   */
  async recordPayment(id, amount, method, date = new Date()) {
    const purchaseData = await this.purchaseRepository.findById(id);
    if (!purchaseData) {
      throw new Error(`Purchase with ID ${id} not found`);
    }

    const purchase = new Purchase(purchaseData);
    purchase.recordPayment(amount, method, date);
    
    return this.purchaseRepository.update(id, purchase.toObject());
  }

  /**
   * Get purchase statistics
   * 
   * @param {Object} query - Query to filter purchases
   * @param {Date} startDate - Start date for statistics
   * @param {Date} endDate - End date for statistics
   * @returns {Promise<Object>} Purchase statistics
   */
  async getPurchaseStats(query = {}, startDate = null, endDate = null) {
    // Build date filter if dates are provided
    const dateFilter = {};
    if (startDate) {
      dateFilter.purchaseDate = dateFilter.purchaseDate || {};
      dateFilter.purchaseDate.$gte = startDate;
    }
    
    if (endDate) {
      dateFilter.purchaseDate = dateFilter.purchaseDate || {};
      dateFilter.purchaseDate.$lte = endDate;
    }
    
    // Combine with other query filters
    const finalQuery = {
      ...query,
      ...dateFilter
    };
    
    const purchases = await this.purchaseRepository.findAll(finalQuery);
    
    // Calculate statistics
    const stats = {
      totalCount: purchases.length,
      totalAmount: 0,
      paidAmount: 0,
      unpaidAmount: 0,
      statusCounts: {
        draft: 0,
        ordered: 0,
        received: 0,
        completed: 0,
        cancelled: 0
      },
      paymentStatusCounts: {
        unpaid: 0,
        partial: 0,
        paid: 0
      }
    };
    
    for (const purchaseData of purchases) {
      const purchase = new Purchase(purchaseData);
      
      // Add to total amount
      stats.totalAmount += purchase.totalAmount || 0;
      
      // Add to paid/unpaid amounts
      stats.paidAmount += purchase.amountPaid || 0;
      stats.unpaidAmount += (purchase.totalAmount || 0) - (purchase.amountPaid || 0);
      
      // Count by status
      if (stats.statusCounts[purchase.status] !== undefined) {
        stats.statusCounts[purchase.status]++;
      }
      
      // Count by payment status
      if (stats.paymentStatusCounts[purchase.paymentStatus] !== undefined) {
        stats.paymentStatusCounts[purchase.paymentStatus]++;
      }
    }
    
    return stats;
  }
}

module.exports = new PurchaseService();