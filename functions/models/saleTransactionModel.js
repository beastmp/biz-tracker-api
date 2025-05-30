/**
 * Sale Transaction Model
 * Defines the model for sale transactions, extending BaseTransaction
 */
const { FieldTypes, defineModel } = require("./baseModel");
const { BaseTransaction } = require("./baseTransactionModel");

/**
 * Create the sale transaction model definition
 */
const saleTransactionModel = defineModel("SaleTransaction", {
  // Relationships
  saleId: {
    type: FieldTypes.REFERENCE,
    ref: "Sale",
    required: true,
  },
  // Sale-specific fields
  shippingAddress: {
    type: FieldTypes.STRING,
    required: false,
  },
  billingAddress: {
    type: FieldTypes.STRING,
    required: false,
  },
  expectedShipDate: {
    type: FieldTypes.DATE,
    required: false,
  },
  actualShipDate: {
    type: FieldTypes.DATE,
    required: false,
  },
  trackingNumber: {
    type: FieldTypes.STRING,
    required: false,
  },
  fulfillmentStatus: {
    type: FieldTypes.ENUM,
    values: ["pending", "partial", "fulfilled", "cancelled"],
    default: "pending",
  },
  salesChannel: {
    type: FieldTypes.STRING,
    required: false,
  },
}, {
  timestamps: true,
  indexes: [
    { fields: { saleId: 1 }, options: { unique: true } },
    { fields: { expectedShipDate: 1 } },
    { fields: { actualShipDate: 1 } },
    { fields: { fulfillmentStatus: 1 } },
    { fields: { salesChannel: 1 } },
    { fields: { trackingNumber: 1 } },
  ]
});

/**
 * SaleTransaction class for sale-specific transaction logic
 */
class SaleTransaction extends BaseTransaction {
  /**
   * Creates a new SaleTransaction instance
   * @param {Object} data - SaleTransaction data
   */
  constructor(data = {}) {
    super(data);

    // Relationships
    this.saleId = data.saleId || null;
    
    // Sale-specific fields
    this.shippingAddress = data.shippingAddress || "";
    this.billingAddress = data.billingAddress || "";
    this.expectedShipDate = data.expectedShipDate || null;
    this.actualShipDate = data.actualShipDate || null;
    this.trackingNumber = data.trackingNumber || "";
    this.fulfillmentStatus = data.fulfillmentStatus || "pending";
    this.salesChannel = data.salesChannel || "";
  }

  /**
   * Validate the sale transaction
   * @return {boolean} True if valid, throws error if invalid
   */
  validate() {
    super.validate();

    if (!this.saleId) {
      throw new Error("Sale ID is required");
    }

    // Validate fulfillment status
    const validFulfillmentStatuses = ["pending", "partial", "fulfilled", "cancelled"];
    if (!validFulfillmentStatuses.includes(this.fulfillmentStatus)) {
      throw new Error(`Invalid fulfillment status: ${this.fulfillmentStatus}`);
    }

    return true;
  }

  /**
   * Update fulfillment status
   * @param {string} newStatus - New fulfillment status
   * @param {Date} shipDate - Actual ship date when status is fulfilled
   * @param {string} trackingNumber - Optional tracking number
   * @return {SaleTransaction} Updated transaction
   */
  updateFulfillmentStatus(newStatus, shipDate = null, trackingNumber = null) {
    const validFulfillmentStatuses = ["pending", "partial", "fulfilled", "cancelled"];
    
    if (!validFulfillmentStatuses.includes(newStatus)) {
      throw new Error(`Invalid fulfillment status: ${newStatus}`);
    }
    
    this.fulfillmentStatus = newStatus;
    
    // Set actual ship date if status is fulfilled and date is provided
    if (newStatus === "fulfilled" && shipDate) {
      this.actualShipDate = shipDate;
    }
    
    // Set tracking number if provided
    if (trackingNumber) {
      this.trackingNumber = trackingNumber;
    }
    
    return this;
  }

  /**
   * Get the plain object representation of the sale transaction
   * @return {Object} Plain object representation
   */
  toObject() {
    return {
      ...super.toObject(),
      saleId: this.saleId,
      shippingAddress: this.shippingAddress,
      billingAddress: this.billingAddress,
      expectedShipDate: this.expectedShipDate,
      actualShipDate: this.actualShipDate,
      trackingNumber: this.trackingNumber,
      fulfillmentStatus: this.fulfillmentStatus,
      salesChannel: this.salesChannel,
    };
  }

  /**
   * Create a new sale transaction from a sale
   * @param {Object} sale - Sale object
   * @param {string} transactionId - Optional transaction ID
   * @return {SaleTransaction} New sale transaction
   */
  static createFromSale(sale, transactionId = null) {
    if (!sale) {
      throw new Error("Sale is required");
    }
    
    // Create a new transaction using party information from the sale
    return new SaleTransaction({
      // Transaction identification
      transactionId: transactionId || `ST-${Date.now()}`,
      transactionDate: sale.saleDate,
      saleId: sale._id,
      
      // Party information - leveraging base transaction fields
      partyName: sale.customer,
      partyId: sale.customerId,
      partyEmail: sale.customerEmail,
      partyPhone: sale.customerPhone,
      partyAddress: sale.customerAddress,
      
      // Shipping and billing may be different from party address
      shippingAddress: sale.shippingAddress || sale.customerAddress,
      billingAddress: sale.billingAddress || sale.customerAddress,
      
      // Status and financial information
      status: sale.status === "draft" ? "draft" : "confirmed",
      subTotal: sale.totalAmount,
      total: sale.totalAmount,
      paymentStatus: sale.paymentStatus,
      paymentAmount: sale.amountPaid,
      paymentMethod: sale.paymentMethod,
      paymentDate: sale.paymentDate,
      
      // Sales channel information
      salesChannel: sale.salesChannel || "",
      
      // Additional information
      documentUrl: sale.documentUrl,
      notes: sale.notes,
      tags: sale.tags,
    });
  }

  /**
   * Get the name of this model
   * @return {string} Model name
   */
  static getModelName() {
    return "SaleTransaction";
  }
}

// Export a structure compatible with the schema generator
module.exports = {
  fields: saleTransactionModel.fields,
  name: saleTransactionModel.name,
  timestamps: saleTransactionModel.timestamps,
  indexes: saleTransactionModel.indexes,
  virtuals: saleTransactionModel.virtuals,
  methods: saleTransactionModel.methods,
  statics: saleTransactionModel.statics,
  saleTransactionModel,
  SaleTransaction,
};