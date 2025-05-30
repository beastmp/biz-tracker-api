/**
 * Base Transaction Service
 * Contains business logic for base transaction management operations
 */

const { BaseTransaction } = require("../models/baseTransactionModel");
const providerFactory = require("../providers/providerFactory");

/**
 * Base Transaction Service class
 * Handles business logic for all transaction types
 */
class BaseTransactionService {
  /**
   * Create a new BaseTransactionService instance
   */
  constructor() {
    this.baseTransactionRepository = providerFactory.createBaseTransactionRepository();
  }

  /**
   * Create a new transaction
   * 
   * @param {Object} data - Transaction data
   * @return {Promise<Object>} New transaction instance
   */
  async createTransaction(data = {}) {
    const transaction = new BaseTransaction(data);
    transaction.validate();
    
    // Calculate total
    transaction.calculateTotal();
    
    // Update payment status based on amount paid
    transaction.updatePaymentStatus();
    
    return this.baseTransactionRepository.create(transaction.toObject());
  }

  /**
   * Get all transactions
   * 
   * @param {Object} query - Query parameters for filtering transactions
   * @param {Object} options - Options for pagination, sorting, etc.
   * @returns {Promise<Array>} Array of transactions
   */
  async getAllTransactions(query = {}, options = {}) {
    return this.baseTransactionRepository.findAll(query, options);
  }

  /**
   * Get a single transaction by ID
   * 
   * @param {string} id - Transaction ID
   * @returns {Promise<Object>} Transaction data
   */
  async getTransactionById(id) {
    return this.baseTransactionRepository.findById(id);
  }

  /**
   * Get a single transaction by transaction ID (not database ID)
   * 
   * @param {string} transactionId - Transaction reference ID
   * @returns {Promise<Object>} Transaction data
   */
  async getTransactionByTransactionId(transactionId) {
    const transactions = await this.baseTransactionRepository.findAll({ transactionId }, { limit: 1 });
    return transactions[0] || null;
  }

  /**
   * Update an existing transaction
   * 
   * @param {string} id - Transaction ID
   * @param {Object} transactionData - Updated transaction data
   * @returns {Promise<Object>} Updated transaction
   */
  async updateTransaction(id, transactionData) {
    const existingTransaction = await this.baseTransactionRepository.findById(id);
    if (!existingTransaction) {
      throw new Error(`Transaction with ID ${id} not found`);
    }

    // Create transaction with existing data merged with updates
    const transaction = new BaseTransaction({
      ...existingTransaction,
      ...transactionData
    });
    
    // Recalculate totals and update payment status
    transaction.calculateTotal();
    transaction.updatePaymentStatus();
    
    transaction.validate();
    
    return this.baseTransactionRepository.update(id, transaction.toObject());
  }

  /**
   * Delete a transaction
   * 
   * @param {string} id - Transaction ID
   * @returns {Promise<boolean>} True if deleted
   */
  async deleteTransaction(id) {
    return this.baseTransactionRepository.delete(id);
  }

  /**
   * Record a payment for a transaction
   * 
   * @param {string} id - Transaction ID
   * @param {number} amount - Amount of payment
   * @param {string} method - Payment method
   * @param {Date} date - Date of payment
   * @returns {Promise<Object>} Updated transaction
   */
  async recordPayment(id, amount, method, date = new Date()) {
    const transactionData = await this.baseTransactionRepository.findById(id);
    if (!transactionData) {
      throw new Error(`Transaction with ID ${id} not found`);
    }

    const transaction = new BaseTransaction(transactionData);
    transaction.recordPayment(amount, method, date);
    
    return this.baseTransactionRepository.update(id, transaction.toObject());
  }

  /**
   * Change status of a transaction
   * 
   * @param {string} id - Transaction ID
   * @param {string} status - New status
   * @returns {Promise<Object>} Updated transaction
   */
  async changeStatus(id, status) {
    const transactionData = await this.baseTransactionRepository.findById(id);
    if (!transactionData) {
      throw new Error(`Transaction with ID ${id} not found`);
    }

    const transaction = new BaseTransaction(transactionData);
    transaction.changeStatus(status);
    
    return this.baseTransactionRepository.update(id, transaction.toObject());
  }

  /**
   * Search for transactions
   * 
   * @param {string} searchText - Text to search for
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Matching transactions
   */
  async searchTransactions(searchText, options = {}) {
    return this.baseTransactionRepository.search(searchText, options);
  }

  /**
   * Generate a unique transaction ID
   * 
   * @param {string} prefix - Prefix for the transaction ID
   * @returns {Promise<string>} Unique transaction ID
   */
  async generateTransactionId(prefix = "") {
    // Get current date components
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2); // Last 2 digits
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    
    // Date part of the transaction ID
    const datePart = `${year}${month}${day}`;
    
    // Find the highest sequence number for today
    const pattern = `${prefix}${datePart}`;
    const transactions = await this.baseTransactionRepository.findAll({
      transactionId: { $regex: `^${pattern}` }
    });
    
    // Extract sequence numbers
    const sequenceNumbers = transactions
      .map(tx => {
        const sequencePart = tx.transactionId.substring(pattern.length);
        return parseInt(sequencePart, 10);
      })
      .filter(num => !isNaN(num));
    
    // Find highest sequence or default to 0
    const highestSequence = sequenceNumbers.length > 0 
      ? Math.max(...sequenceNumbers) 
      : 0;
    
    // Create new ID with incremented sequence
    const nextSequence = (highestSequence + 1).toString().padStart(4, '0');
    return `${prefix}${datePart}${nextSequence}`;
  }

  /**
   * Get transaction statistics
   * 
   * @param {Object} query - Query parameters for filtering transactions
   * @param {Date} startDate - Start date for statistics
   * @param {Date} endDate - End date for statistics
   * @returns {Promise<Object>} Transaction statistics
   */
  async getTransactionStats(query = {}, startDate = null, endDate = null) {
    // Add date range to query if provided
    if (startDate || endDate) {
      query.transactionDate = {};
      if (startDate) {
        query.transactionDate.$gte = startDate;
      }
      if (endDate) {
        query.transactionDate.$lte = endDate;
      }
    }
    
    const transactions = await this.baseTransactionRepository.findAll(query);
    
    // Calculate statistics
    const stats = {
      count: transactions.length,
      totalValue: 0,
      averageValue: 0,
      byStatus: {},
      byPaymentStatus: {}
    };
    
    // Process transactions
    transactions.forEach(tx => {
      // Sum up total value
      stats.totalValue += tx.total || 0;
      
      // Count by status
      const status = tx.status || 'unknown';
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
      
      // Count by payment status
      const paymentStatus = tx.paymentStatus || 'unknown';
      stats.byPaymentStatus[paymentStatus] = (stats.byPaymentStatus[paymentStatus] || 0) + 1;
    });
    
    // Calculate average
    stats.averageValue = stats.count > 0 ? stats.totalValue / stats.count : 0;
    
    return stats;
  }

  /**
   * Get transactions by party (customer/vendor)
   * 
   * @param {string} partyId - Party ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Transactions for the party
   */
  async getTransactionsByParty(partyId, options = {}) {
    return this.baseTransactionRepository.findAll({ partyId }, options);
  }

  /**
   * Get transaction totals by date range
   * 
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {string} groupBy - Group by day, week, month, or year
   * @returns {Promise<Object>} Totals grouped by date
   */
  async getTransactionTotalsByDate(startDate, endDate, groupBy = 'day') {
    return this.baseTransactionRepository.getTotalsByDate(startDate, endDate, groupBy);
  }
}

module.exports = new BaseTransactionService();