/**
 * Purchase Transaction Model
 * Defines the model for purchase transactions, extending BaseTransaction
 */
const { FieldTypes, defineModel } = require("./baseModel");
const { BaseTransaction } = require("./baseTransactionModel");

/**
 * Create the purchase transaction model definition
 */
const purchaseTransactionModel = defineModel("PurchaseTransaction", {
  // Relationships
  purchaseId: {
    type: FieldTypes.REFERENCE,
    ref: "Purchase",
    required: true,
  },
  // Purchase-specific fields
  expectedDeliveryDate: {
    type: FieldTypes.DATE,
    required: false,
  },
  actualDeliveryDate: {
    type: FieldTypes.DATE,
    required: false,
  },
  deliveryStatus: {
    type: FieldTypes.ENUM,
    values: ["pending", "partial", "complete", "cancelled"],
    default: "pending",
  },
}, {
  timestamps: true,
  indexes: [
    { fields: { purchaseId: 1 }, options: { unique: true } },
    { fields: { expectedDeliveryDate: 1 } },
    { fields: { deliveryStatus: 1 } },
  ]
});

/**
 * PurchaseTransaction class for purchase-specific transaction logic
 */
class PurchaseTransaction extends BaseTransaction {
  /**
   * Creates a new PurchaseTransaction instance
   * @param {Object} data - PurchaseTransaction data
   */
  constructor(data = {}) {
    super(data);

    // Relationships
    this.purchaseId = data.purchaseId || null;
    
    // Purchase-specific fields
    this.expectedDeliveryDate = data.expectedDeliveryDate || null;
    this.actualDeliveryDate = data.actualDeliveryDate || null;
    this.deliveryStatus = data.deliveryStatus || "pending";
  }

  /**
   * Validate the purchase transaction
   * @return {boolean} True if valid, throws error if invalid
   */
  validate() {
    super.validate();

    if (!this.purchaseId) {
      throw new Error("Purchase ID is required");
    }

    // Validate delivery status
    const validDeliveryStatuses = ["pending", "partial", "complete", "cancelled"];
    if (!validDeliveryStatuses.includes(this.deliveryStatus)) {
      throw new Error(`Invalid delivery status: ${this.deliveryStatus}`);
    }

    return true;
  }

  /**
   * Update delivery status
   * @param {string} newStatus - New delivery status
   * @param {Date} deliveryDate - Actual delivery date when status is complete
   * @return {PurchaseTransaction} Updated transaction
   */
  updateDeliveryStatus(newStatus, deliveryDate = null) {
    const validDeliveryStatuses = ["pending", "partial", "complete", "cancelled"];
    
    if (!validDeliveryStatuses.includes(newStatus)) {
      throw new Error(`Invalid delivery status: ${newStatus}`);
    }
    
    this.deliveryStatus = newStatus;
    
    // Set actual delivery date if status is complete and date is provided
    if (newStatus === "complete" && deliveryDate) {
      this.actualDeliveryDate = deliveryDate;
    }
    
    return this;
  }

  /**
   * Get the plain object representation of the purchase transaction
   * @return {Object} Plain object representation
   */
  toObject() {
    return {
      ...super.toObject(),
      purchaseId: this.purchaseId,
      expectedDeliveryDate: this.expectedDeliveryDate,
      actualDeliveryDate: this.actualDeliveryDate,
      deliveryStatus: this.deliveryStatus,
    };
  }

  /**
   * Create a new purchase transaction from a purchase
   * @param {Object} purchase - Purchase object
   * @param {string} transactionId - Optional transaction ID
   * @return {PurchaseTransaction} New purchase transaction
   */
  static createFromPurchase(purchase, transactionId = null) {
    if (!purchase) {
      throw new Error("Purchase is required");
    }
    
    // Create a new transaction using party information from the purchase
    return new PurchaseTransaction({
      // Transaction identification
      transactionId: transactionId || `PT-${Date.now()}`,
      transactionDate: purchase.purchaseDate,
      purchaseId: purchase._id,
      
      // Party information - leveraging base transaction fields
      partyName: purchase.supplier,
      partyId: purchase.supplierId,
      partyEmail: purchase.supplierEmail,
      partyPhone: purchase.supplierPhone,
      partyAddress: purchase.supplierAddress,
      
      // Status and financial information
      status: purchase.status === "draft" ? "draft" : "confirmed",
      subTotal: purchase.totalAmount,
      total: purchase.totalAmount,
      paymentStatus: purchase.paymentStatus,
      paymentAmount: purchase.amountPaid,
      paymentMethod: purchase.paymentMethod,
      paymentDate: purchase.paymentDate,
      
      // Additional information
      documentUrl: purchase.documentUrl,
      notes: purchase.notes,
      tags: purchase.tags,
    });
  }

  /**
   * Get the name of this model
   * @return {string} Model name
   */
  static getModelName() {
    return "PurchaseTransaction";
  }
}

// Export a structure compatible with the schema generator
module.exports = {
  fields: purchaseTransactionModel.fields,
  name: purchaseTransactionModel.name,
  timestamps: purchaseTransactionModel.timestamps,
  indexes: purchaseTransactionModel.indexes,
  virtuals: purchaseTransactionModel.virtuals,
  methods: purchaseTransactionModel.methods,
  statics: purchaseTransactionModel.statics,
  purchaseTransactionModel,
  PurchaseTransaction,
};