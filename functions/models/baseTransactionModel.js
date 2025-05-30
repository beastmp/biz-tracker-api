/**
 * Base Transaction Model
 * Defines a foundation for all transaction models
 */
const { FieldTypes, defineModel, BaseModel } = require("./baseModel");

/**
 * Transaction status values
 * @type {string[]}
 */
const TRANSACTION_STATUSES = [
  "draft", 
  "pending", 
  "confirmed", 
  "processing", 
  "completed", 
  "cancelled"
];

/**
 * Payment status values
 * @type {string[]}
 */
const PAYMENT_STATUSES = [
  "unpaid", 
  "partial", 
  "paid", 
  "refunded", 
  "voided"
];

/**
 * Payment method values
 * @type {string[]}
 */
const PAYMENT_METHODS = [
  "cash", 
  "check", 
  "credit_card", 
  "debit_card", 
  "bank_transfer", 
  "online_payment", 
  "store_credit", 
  "other"
];

/**
 * Create the base transaction model definition
 */
const baseTransactionModel = defineModel("BaseTransaction", {
  // Transaction Identification
  transactionId: {
    type: FieldTypes.STRING,
    required: true,
    unique: true,
  },
  transactionDate: {
    type: FieldTypes.DATE,
    required: true,
    default: () => new Date(),
  },
  // Party Information
  partyName: {
    type: FieldTypes.STRING,
    required: true,
  },
  partyId: {
    type: FieldTypes.STRING,
    required: false,
  },
  partyEmail: {
    type: FieldTypes.STRING,
    required: false,
  },
  partyPhone: {
    type: FieldTypes.STRING,
    required: false,
  },
  partyAddress: {
    type: FieldTypes.STRING,
    required: false,
  },
  // Order Status
  status: {
    type: FieldTypes.ENUM,
    values: TRANSACTION_STATUSES,
    default: "draft",
  },
  // Financial Information
  subTotal: {
    type: FieldTypes.NUMBER,
    default: 0,
  },
  discount: {
    type: FieldTypes.NUMBER,
    default: 0,
  },
  taxRate: {
    type: FieldTypes.NUMBER,
    default: 0,
  },
  taxAmount: {
    type: FieldTypes.NUMBER,
    default: 0,
  },
  shippingCost: {
    type: FieldTypes.NUMBER,
    default: 0,
  },
  total: {
    type: FieldTypes.NUMBER,
    default: 0,
  },
  // Payment Information
  paymentAmount: {
    type: FieldTypes.NUMBER,
    default: 0,
  },
  paymentMethod: {
    type: FieldTypes.ENUM,
    values: PAYMENT_METHODS,
    required: false,
  },
  paymentStatus: {
    type: FieldTypes.ENUM,
    values: PAYMENT_STATUSES,
    default: "unpaid",
  },
  paymentDate: {
    type: FieldTypes.DATE,
    required: false,
  },
  paymentDueDate: {
    type: FieldTypes.DATE,
    required: false,
  },
  // Additional Information
  documentUrl: {
    type: FieldTypes.STRING,
    required: false,
  },
  notes: {
    type: FieldTypes.STRING,
    required: false,
  },
  tags: {
    type: FieldTypes.ARRAY,
    items: { type: FieldTypes.STRING },
    default: [],
  },
}, {
  timestamps: true,
  indexes: [
    { fields: { transactionId: 1 }, options: { unique: true } },
    { fields: { transactionDate: -1 } },
    { fields: { partyName: 1 } },
    { fields: { partyId: 1 } },
    { fields: { status: 1 } },
    { fields: { paymentStatus: 1 } },
    { fields: { 
        transactionId: "text", 
        partyName: "text", 
        notes: "text",
        tags: "text" 
      } 
    },
  ]
});

/**
 * BaseTransaction class for shared business logic across all transaction types
 */
class BaseTransaction extends BaseModel {
  /**
   * Creates a new BaseTransaction instance
   * @param {Object} data - BaseTransaction data
   */
  constructor(data = {}) {
    super(data);

    // Transaction Identification
    this.transactionId = data.transactionId || "";
    this.transactionDate = data.transactionDate || new Date();
    
    // Party Information
    this.partyName = data.partyName || "";
    this.partyId = data.partyId || null;
    this.partyEmail = data.partyEmail || "";
    this.partyPhone = data.partyPhone || "";
    this.partyAddress = data.partyAddress || "";
    
    // Order Status
    this.status = data.status || "draft";
    
    // Financial Information
    this.subTotal = data.subTotal || 0;
    this.discount = data.discount || 0;
    this.taxRate = data.taxRate || 0;
    this.taxAmount = data.taxAmount || 0;
    this.shippingCost = data.shippingCost || 0;
    this.total = data.total || 0;
    
    // Payment Information
    this.paymentAmount = data.paymentAmount || 0;
    this.paymentMethod = data.paymentMethod || null;
    this.paymentStatus = data.paymentStatus || "unpaid";
    this.paymentDate = data.paymentDate || null;
    this.paymentDueDate = data.paymentDueDate || null;
    
    // Additional Information
    this.documentUrl = data.documentUrl || null;
    this.notes = data.notes || "";
    this.tags = data.tags || [];
  }

  /**
   * Validate the base transaction
   * @return {boolean} True if valid, throws error if invalid
   */
  validate() {
    super.validate();

    if (!this.transactionId || this.transactionId.trim() === "") {
      throw new Error("Transaction ID is required");
    }

    if (!this.transactionDate) {
      throw new Error("Transaction date is required");
    }

    if (!this.partyName || this.partyName.trim() === "") {
      throw new Error("Party name is required");
    }

    // Validate status
    if (!TRANSACTION_STATUSES.includes(this.status)) {
      throw new Error(`Invalid status: ${this.status}`);
    }

    // Validate payment status
    if (!PAYMENT_STATUSES.includes(this.paymentStatus)) {
      throw new Error(`Invalid payment status: ${this.paymentStatus}`);
    }

    // Validate payment method if provided
    if (this.paymentMethod && !PAYMENT_METHODS.includes(this.paymentMethod)) {
      throw new Error(`Invalid payment method: ${this.paymentMethod}`);
    }

    return true;
  }

  /**
   * Calculate the transaction total
   * @return {number} Transaction total
   */
  calculateTotal() {
    // Calculate tax amount based on tax rate and subtotal after discount
    const discountedSubtotal = this.subTotal * (1 - (this.discount / 100));
    this.taxAmount = discountedSubtotal * (this.taxRate / 100);
    
    // Calculate total
    this.total = discountedSubtotal + this.taxAmount + this.shippingCost;
    
    return this.total;
  }

  /**
   * Update payment status based on amount paid
   * @return {string} Updated payment status
   */
  updatePaymentStatus() {
    if (!this.total || this.total <= 0) {
      this.paymentStatus = "unpaid";
      return this.paymentStatus;
    }

    if (this.paymentAmount <= 0) {
      this.paymentStatus = "unpaid";
    } else if (this.paymentAmount >= this.total) {
      this.paymentStatus = "paid";
      
      // Set payment date if not already set
      if (!this.paymentDate) {
        this.paymentDate = new Date();
      }
    } else {
      this.paymentStatus = "partial";
    }

    return this.paymentStatus;
  }

  /**
   * Record a payment for this transaction
   * @param {number} amount - Payment amount
   * @param {string} method - Payment method
   * @param {Date} date - Payment date
   * @return {Object} Updated transaction
   */
  recordPayment(amount, method, date = new Date()) {
    if (amount <= 0) {
      throw new Error("Payment amount must be greater than zero");
    }

    // Update amount paid
    this.paymentAmount = (this.paymentAmount || 0) + amount;

    // Update payment method if provided
    if (method && PAYMENT_METHODS.includes(method)) {
      this.paymentMethod = method;
    }

    // Set payment date to latest payment
    this.paymentDate = date;

    // Update payment status
    this.updatePaymentStatus();

    return this;
  }

  /**
   * Change the transaction status
   * @param {string} newStatus - New status value
   * @return {BaseTransaction} Updated transaction
   */
  changeStatus(newStatus) {
    if (!TRANSACTION_STATUSES.includes(newStatus)) {
      throw new Error(`Invalid status: ${newStatus}`);
    }
    
    this.status = newStatus;
    return this;
  }

  /**
   * Get the plain object representation of the transaction
   * @return {Object} Plain object representation
   */
  toObject() {
    return {
      ...super.toObject(),
      transactionId: this.transactionId,
      transactionDate: this.transactionDate,
      partyName: this.partyName,
      partyId: this.partyId,
      partyEmail: this.partyEmail,
      partyPhone: this.partyPhone,
      partyAddress: this.partyAddress,
      status: this.status,
      subTotal: this.subTotal,
      discount: this.discount,
      taxRate: this.taxRate,
      taxAmount: this.taxAmount,
      shippingCost: this.shippingCost,
      total: this.total,
      paymentAmount: this.paymentAmount,
      paymentMethod: this.paymentMethod,
      paymentStatus: this.paymentStatus,
      paymentDate: this.paymentDate,
      paymentDueDate: this.paymentDueDate,
      documentUrl: this.documentUrl,
      notes: this.notes,
      tags: this.tags,
    };
  }

  /**
   * Get the name of this model
   * @return {string} Model name
   */
  static getModelName() {
    return "BaseTransaction";
  }
}

// Export a structure compatible with the schema generator
module.exports = {
  TRANSACTION_STATUSES,
  PAYMENT_STATUSES,
  PAYMENT_METHODS,
  fields: baseTransactionModel.fields,
  name: baseTransactionModel.name,
  timestamps: baseTransactionModel.timestamps,
  indexes: baseTransactionModel.indexes,
  virtuals: baseTransactionModel.virtuals,
  methods: baseTransactionModel.methods,
  statics: baseTransactionModel.statics,
  baseTransactionModel,
  BaseTransaction,
};