/**
 * Sale Service
 * Contains business logic for sale transaction operations
 */

const { Sale } = require("../models/saleModel");
const providerFactory = require("../providers/providerFactory");
const itemService = require("./itemService");

/**
 * Sale Service class
 * Handles business logic for sale transactions
 */
class SaleService {
  /**
   * Create a new SaleService instance
   */
  constructor() {
    this.saleRepository = providerFactory.createSaleRepository();
  }

  /**
   * Get all sales
   * 
   * @param {Object} query - Query parameters for filtering sales
   * @param {Object} options - Options for pagination, sorting, etc.
   * @returns {Promise<Array>} Array of sales
   */
  async getAllSales(query = {}, options = {}) {
    return this.saleRepository.findAll(query, options);
  }

  /**
   * Get a single sale by ID
   * 
   * @param {string} id - Sale ID
   * @returns {Promise<Object>} Sale data
   */
  async getSaleById(id) {
    return this.saleRepository.findById(id);
  }

  /**
   * Get a sale by sale number
   * 
   * @param {string} saleNumber - Sale number
   * @returns {Promise<Object>} Sale data
   */
  async getSaleByNumber(saleNumber) {
    const sales = await this.saleRepository.findAll({ saleNumber }, { limit: 1 });
    return sales[0] || null;
  }

  /**
   * Create a new sale
   * 
   * @param {Object} saleData - Sale data
   * @returns {Promise<Object>} Created sale
   */
  async createSale(saleData) {
    const sale = new Sale(saleData);
    sale.validate();
    
    // Calculate totals based on items, discounts, and taxes
    sale.updateItemTotals();
    
    return this.saleRepository.create(sale.toObject());
  }

  /**
   * Update an existing sale
   * 
   * @param {string} id - Sale ID
   * @param {Object} saleData - Updated sale data
   * @returns {Promise<Object>} Updated sale
   */
  async updateSale(id, saleData) {
    const existingSale = await this.saleRepository.findById(id);
    if (!existingSale) {
      throw new Error(`Sale with ID ${id} not found`);
    }

    // Create sale with existing data merged with updates
    const sale = new Sale({
      ...existingSale,
      ...saleData
    });
    
    sale.validate();
    sale.updateItemTotals();
    
    return this.saleRepository.update(id, sale.toObject());
  }

  /**
   * Delete a sale
   * 
   * @param {string} id - Sale ID
   * @returns {Promise<boolean>} True if deleted
   */
  async deleteSale(id) {
    return this.saleRepository.delete(id);
  }

  /**
   * Mark a sale as confirmed
   * 
   * @param {string} id - Sale ID
   * @returns {Promise<Object>} Updated sale
   */
  async markAsConfirmed(id) {
    const saleData = await this.saleRepository.findById(id);
    if (!saleData) {
      throw new Error(`Sale with ID ${id} not found`);
    }

    const sale = new Sale(saleData);
    sale.markAsConfirmed();
    
    return this.saleRepository.update(id, sale.toObject());
  }

  /**
   * Ship items for a sale
   * 
   * @param {string} id - Sale ID
   * @param {Array} shippedItems - Array of shipped items with quantities
   * @param {Object} shippingInfo - Shipping information
   * @param {boolean} updateInventory - Whether to update inventory levels
   * @returns {Promise<Object>} Updated sale
   */
  async shipItems(id, shippedItems, shippingInfo = {}, updateInventory = true) {
    const saleData = await this.saleRepository.findById(id);
    if (!saleData) {
      throw new Error(`Sale with ID ${id} not found`);
    }

    const sale = new Sale(saleData);
    sale.shipItems(shippedItems, shippingInfo);
    
    // Update inventory for each shipped item (deduct from inventory)
    if (updateInventory) {
      for (const shippedItem of shippedItems) {
        if (shippedItem.itemId && shippedItem.quantity > 0) {
          await itemService.updateInventory(
            shippedItem.itemId, 
            -shippedItem.quantity // Negative quantity to reduce inventory
          );
        }
      }
    }
    
    return this.saleRepository.update(id, sale.toObject());
  }

  /**
   * Mark a sale as completed
   * 
   * @param {string} id - Sale ID
   * @returns {Promise<Object>} Updated sale
   */
  async markAsCompleted(id) {
    const saleData = await this.saleRepository.findById(id);
    if (!saleData) {
      throw new Error(`Sale with ID ${id} not found`);
    }

    const sale = new Sale(saleData);
    sale.markAsCompleted();
    
    return this.saleRepository.update(id, sale.toObject());
  }

  /**
   * Cancel a sale
   * 
   * @param {string} id - Sale ID
   * @param {string} reason - Reason for cancellation
   * @returns {Promise<Object>} Updated sale
   */
  async cancelSale(id, reason) {
    const saleData = await this.saleRepository.findById(id);
    if (!saleData) {
      throw new Error(`Sale with ID ${id} not found`);
    }

    const sale = new Sale(saleData);
    sale.cancel(reason);
    
    return this.saleRepository.update(id, sale.toObject());
  }

  /**
   * Record a payment for a sale
   * 
   * @param {string} id - Sale ID
   * @param {number} amount - Payment amount
   * @param {string} method - Payment method
   * @param {Date} date - Payment date
   * @returns {Promise<Object>} Updated sale
   */
  async recordPayment(id, amount, method, date = new Date()) {
    const saleData = await this.saleRepository.findById(id);
    if (!saleData) {
      throw new Error(`Sale with ID ${id} not found`);
    }

    const sale = new Sale(saleData);
    sale.recordPayment(amount, method, date);
    
    return this.saleRepository.update(id, sale.toObject());
  }

  /**
   * Apply a discount to a sale
   * 
   * @param {string} id - Sale ID
   * @param {string} type - Discount type ('percentage' or 'fixed')
   * @param {number} value - Discount value
   * @param {string} description - Optional description
   * @returns {Promise<Object>} Updated sale
   */
  async applyDiscount(id, type, value, description = "") {
    const saleData = await this.saleRepository.findById(id);
    if (!saleData) {
      throw new Error(`Sale with ID ${id} not found`);
    }

    const sale = new Sale(saleData);
    sale.applyDiscount(type, value, description);
    
    return this.saleRepository.update(id, sale.toObject());
  }

  /**
   * Apply a tax to a sale
   * 
   * @param {string} id - Sale ID
   * @param {string} name - Tax name
   * @param {number} rate - Tax rate as percentage
   * @returns {Promise<Object>} Updated sale
   */
  async applyTax(id, name, rate) {
    const saleData = await this.saleRepository.findById(id);
    if (!saleData) {
      throw new Error(`Sale with ID ${id} not found`);
    }

    const sale = new Sale(saleData);
    sale.applyTax(name, rate);
    
    return this.saleRepository.update(id, sale.toObject());
  }

  /**
   * Get sale statistics
   * 
   * @param {Object} query - Query to filter sales
   * @param {Date} startDate - Start date for statistics
   * @param {Date} endDate - End date for statistics
   * @returns {Promise<Object>} Sale statistics
   */
  async getSaleStats(query = {}, startDate = null, endDate = null) {
    // Build date filter if dates are provided
    const dateFilter = {};
    if (startDate) {
      dateFilter.saleDate = dateFilter.saleDate || {};
      dateFilter.saleDate.$gte = startDate;
    }
    
    if (endDate) {
      dateFilter.saleDate = dateFilter.saleDate || {};
      dateFilter.saleDate.$lte = endDate;
    }
    
    // Combine with other query filters
    const finalQuery = {
      ...query,
      ...dateFilter
    };
    
    const sales = await this.saleRepository.findAll(finalQuery);
    
    // Calculate statistics
    const stats = {
      totalCount: sales.length,
      totalAmount: 0,
      paidAmount: 0,
      unpaidAmount: 0,
      statusCounts: {
        draft: 0,
        confirmed: 0,
        shipped: 0,
        completed: 0,
        cancelled: 0
      },
      paymentStatusCounts: {
        unpaid: 0,
        partial: 0,
        paid: 0
      }
    };
    
    for (const saleData of sales) {
      const sale = new Sale(saleData);
      
      // Add to total amount
      stats.totalAmount += sale.totalAmount || 0;
      
      // Add to paid/unpaid amounts
      stats.paidAmount += sale.amountPaid || 0;
      stats.unpaidAmount += (sale.totalAmount || 0) - (sale.amountPaid || 0);
      
      // Count by status
      if (stats.statusCounts[sale.status] !== undefined) {
        stats.statusCounts[sale.status]++;
      }
      
      // Count by payment status
      if (stats.paymentStatusCounts[sale.paymentStatus] !== undefined) {
        stats.paymentStatusCounts[sale.paymentStatus]++;
      }
    }
    
    return stats;
  }
}

module.exports = new SaleService();