/**
 * Base Transaction Repository
 * Implements provider-agnostic business logic and operations for the BaseTransaction entity
 */

const BaseTransactionInterface = require("../interfaces/baseTransactionInterface");
// eslint-disable-next-line no-unused-vars
const { BaseTransaction } = require("../../models/baseTransactionModel");

/**
 * Base repository for BaseTransaction operations with provider-agnostic implementation
 */
class BaseTransactionRepository extends BaseTransactionInterface {
  /**
   * Creates a new BaseTransactionRepository instance
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    super();
    this.config = config;
    this.transactionProvider = null;
  }

  /**
   * Set the transaction provider dependency
   * @param {Object} provider - Transaction provider instance
   */
  setTransactionProvider(provider) {
    this.transactionProvider = provider;
  }

  /**
   * Get transactions grouped by status
   * 
   * @param {Object} filter - Filter criteria
   * @return {Promise<Object>} Transactions grouped by status
   */
  async getByStatus(filter = {}) {
    try {
      const transactions = await this.findAll(filter);
      
      // Group transactions by status
      return transactions.reduce((result, transaction) => {
        const status = transaction.status || "unknown";
        if (!result[status]) {
          result[status] = [];
        }
        result[status].push(transaction);
        return result;
      }, {});
    } catch (error) {
      console.error("Error getting transactions by status:", error);
      throw error;
    }
  }

  /**
   * Get transactions grouped by payment status
   * 
   * @param {Object} filter - Filter criteria
   * @return {Promise<Object>} Transactions grouped by payment status
   */
  async getByPaymentStatus(filter = {}) {
    try {
      const transactions = await this.findAll(filter);
      
      // Group transactions by payment status
      return transactions.reduce((result, transaction) => {
        const paymentStatus = transaction.paymentStatus || "unknown";
        if (!result[paymentStatus]) {
          result[paymentStatus] = [];
        }
        result[paymentStatus].push(transaction);
        return result;
      }, {});
    } catch (error) {
      console.error("Error getting transactions by payment status:", error);
      throw error;
    }
  }

  /**
   * Get transaction totals by date range
   * 
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {string} groupBy - Group by day, week, month, or year
   * @return {Promise<Object>} Totals grouped by date
   */
  async getTotalsByDate(startDate, endDate, groupBy = "day") {
    try {
      // Create date range filter
      const filter = {};
      if (startDate || endDate) {
        filter.transactionDate = {};
        if (startDate) {
          filter.transactionDate.$gte = startDate;
        }
        if (endDate) {
          filter.transactionDate.$lte = endDate;
        }
      }
      
      // Find transactions within date range
      const transactions = await this.findAll(filter);
      
      // Group transactions by date according to groupBy parameter
      const groupedData = {};
      
      transactions.forEach(transaction => {
        if (!transaction.transactionDate) return;
        
        const date = new Date(transaction.transactionDate);
        let groupKey;
        
        switch (groupBy.toLowerCase()) {
          case "day":
            groupKey = date.toISOString().slice(0, 10); // YYYY-MM-DD
            break;
          case "week":
            // Get the first day of the week (assuming Sunday is first day)
            const day = date.getDay();
            const diff = date.getDate() - day;
            const firstDayOfWeek = new Date(date);
            firstDayOfWeek.setDate(diff);
            groupKey = firstDayOfWeek.toISOString().slice(0, 10);
            break;
          case "month":
            groupKey = date.toISOString().slice(0, 7); // YYYY-MM
            break;
          case "year":
            groupKey = date.getFullYear().toString();
            break;
          default:
            groupKey = date.toISOString().slice(0, 10); // Default to day
        }
        
        if (!groupedData[groupKey]) {
          groupedData[groupKey] = {
            count: 0,
            total: 0
          };
        }
        
        groupedData[groupKey].count++;
        groupedData[groupKey].total += transaction.total || 0;
      });
      
      return groupedData;
    } catch (error) {
      console.error("Error getting transaction totals by date:", error);
      throw error;
    }
  }

  /**
   * Get total transaction value
   * 
   * @param {Object} filter - Filter criteria
   * @return {Promise<number>} Total transaction value
   */
  async getTotalValue(filter = {}) {
    try {
      const transactions = await this.findAll(filter);
      
      return transactions.reduce((total, transaction) => {
        return total + (transaction.total || 0);
      }, 0);
    } catch (error) {
      console.error("Error getting total transaction value:", error);
      throw error;
    }
  }

  /**
   * Generate a transaction ID
   * 
   * @param {string} prefix - Prefix for the transaction ID
   * @return {Promise<string>} Generated transaction ID
   */
  async generateTransactionId(prefix = "") {
    try {
      // Get current date components
      const now = new Date();
      const year = now.getFullYear().toString().slice(-2); // Last 2 digits
      const month = (now.getMonth() + 1).toString().padStart(2, "0");
      const day = now.getDate().toString().padStart(2, "0");
      
      // Date part of the transaction ID
      const datePart = `${year}${month}${day}`;
      
      // Find the highest sequence number for today
      const pattern = `^${prefix}${datePart}`;
      
      // Use direct query if available in implementation
      let transactions;
      if (this.findByPattern) {
        transactions = await this.findByPattern(pattern);
      } else {
        // Fallback to regular findAll with regex in filter
        transactions = await this.findAll({
          transactionId: { $regex: pattern }
        });
      }
      
      // Extract sequence numbers
      const sequenceNumbers = transactions
        .map(tx => {
          const sequencePart = tx.transactionId.substring((prefix + datePart).length);
          return parseInt(sequencePart, 10);
        })
        .filter(num => !isNaN(num));
      
      // Find highest sequence or default to 0
      const highestSequence = sequenceNumbers.length > 0 
        ? Math.max(...sequenceNumbers) 
        : 0;
      
      // Create new ID with incremented sequence
      const nextSequence = (highestSequence + 1).toString().padStart(4, "0");
      return `${prefix}${datePart}${nextSequence}`;
    } catch (error) {
      console.error("Error generating transaction ID:", error);
      throw error;
    }
  }

  /**
   * Record a payment for a transaction
   * 
   * @param {string} id - Transaction ID
   * @param {number} amount - Payment amount
   * @param {string} method - Payment method
   * @param {Date} date - Payment date
   * @param {Object} [transaction] - Optional transaction
   * @return {Promise<Object>} Updated transaction
   */
  async recordPayment(id, amount, method, date = new Date(), transaction = null) {
    try {
      const tx = await this.findById(id);
      if (!tx) {
        throw new Error(`Transaction with ID ${id} not found`);
      }
      
      // Create a BaseTransaction instance to use its methods
      const baseTransaction = new BaseTransaction(tx);
      baseTransaction.recordPayment(amount, method, date);
      
      // Update the transaction in the database
      return await this.update(id, baseTransaction.toObject(), transaction);
    } catch (error) {
      console.error(`Error recording payment for transaction ${id}:`, error);
      throw error;
    }
  }

  /**
   * Update transaction status
   * 
   * @param {string} id - Transaction ID
   * @param {string} status - New status
   * @param {Object} [transaction] - Optional transaction
   * @return {Promise<Object>} Updated transaction
   */
  async updateStatus(id, status, transaction = null) {
    try {
      const tx = await this.findById(id);
      if (!tx) {
        throw new Error(`Transaction with ID ${id} not found`);
      }
      
      // Create a BaseTransaction instance to use its methods
      const baseTransaction = new BaseTransaction(tx);
      baseTransaction.changeStatus(status);
      
      // Update the transaction in the database
      return await this.update(id, baseTransaction.toObject(), transaction);
    } catch (error) {
      console.error(`Error updating status for transaction ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get transactions by party
   * 
   * @param {string} partyId - Party ID
   * @param {Object} options - Query options
   * @return {Promise<Array>} Transactions for the party
   */
  async getByParty(partyId, options = {}) {
    try {
      return await this.findAll({ partyId }, options);
    } catch (error) {
      console.error(`Error getting transactions for party ${partyId}:`, error);
      throw error;
    }
  }

  /**
   * Get transaction summaries by party
   * 
   * @param {Object} filter - Filter criteria
   * @return {Promise<Object>} Transaction summaries by party
   */
  async getSummariesByParty(filter = {}) {
    try {
      const transactions = await this.findAll(filter);
      
      // Group transactions by party
      const partyData = {};
      
      transactions.forEach(tx => {
        const partyId = tx.partyId || "unknown";
        const partyName = tx.partyName || "Unknown";
        
        if (!partyData[partyId]) {
          partyData[partyId] = {
            partyId,
            partyName,
            count: 0,
            total: 0,
            unpaid: 0,
            paid: 0
          };
        }
        
        partyData[partyId].count++;
        partyData[partyId].total += tx.total || 0;
        
        if (tx.paymentStatus === "paid") {
          partyData[partyId].paid += tx.total || 0;
        } else {
          partyData[partyId].unpaid += tx.total - (tx.paymentAmount || 0);
        }
      });
      
      return Object.values(partyData);
    } catch (error) {
      console.error("Error getting transaction summaries by party:", error);
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

module.exports = BaseTransactionRepository;