/**
 * Purchase Model
 * Defines the domain model for purchase transactions
 */

const {FieldTypes, defineModel, BaseModel} = require("./baseModel");

/**
 * Create the purchase model definition
 */
const purchaseModel = defineModel("Purchase", {
  purchaseNumber: {
    type: FieldTypes.STRING,
    required: true,
    unique: true,
  },
  purchaseDate: {
    type: FieldTypes.DATE,
    required: true,
    default: () => new Date(),
  },
  supplier: {
    type: FieldTypes.STRING,
    required: true,
  },
  supplierId: {
    type: FieldTypes.STRING,
  },
  status: {
    type: FieldTypes.ENUM,
    values: ["draft", "ordered", "received", "completed", "cancelled"],
    default: "draft",
  },
  totalAmount: {
    type: FieldTypes.NUMBER,
    default: 0,
  },
  paymentMethod: {
    type: FieldTypes.STRING,
  },
  paymentStatus: {
    type: FieldTypes.ENUM,
    values: ["unpaid", "partial", "paid"],
    default: "unpaid",
  },
  paymentDueDate: {
    type: FieldTypes.DATE,
  },
  paymentDate: {
    type: FieldTypes.DATE,
  },
  amountPaid: {
    type: FieldTypes.NUMBER,
    default: 0,
  },
  notes: {
    type: FieldTypes.STRING,
  },
  documentUrl: {
    type: FieldTypes.STRING,
  },
  items: {
    type: FieldTypes.ARRAY,
    items: {
      type: FieldTypes.OBJECT,
      fields: {
        itemId: {
          type: FieldTypes.REFERENCE,
          ref: "Item",
          required: true,
        },
        description: {
          type: FieldTypes.STRING,
        },
        quantity: {
          type: FieldTypes.NUMBER,
          required: true,
          default: 1,
        },
        unit: {
          type: FieldTypes.STRING,
        },
        unitPrice: {
          type: FieldTypes.NUMBER,
          required: true,
          default: 0,
        },
        total: {
          type: FieldTypes.NUMBER,
          default: 0,
        },
        receivedQuantity: {
          type: FieldTypes.NUMBER,
          default: 0,
        },
        isAsset: {
          type: FieldTypes.BOOLEAN,
          default: false,
        },
      },
    },
    default: [],
  },
  tags: {
    type: FieldTypes.ARRAY,
    items: {type: FieldTypes.STRING},
    default: [],
  },
}, {
  timestamps: true,
  indexes: [
    {fields: {purchaseNumber: 1}, options: {unique: true}},
    {fields: {supplier: 1}},
    {fields: {supplierId: 1}},
    {fields: {purchaseDate: -1}},
    {fields: {status: 1}},
    {fields: {paymentStatus: 1}},
    {
      fields: {
        purchaseNumber: "text",
        supplier: "text",
        notes: "text",
      },
    },
  ],
});

/**
 * Purchase class for business logic related to purchases
 */
class Purchase extends BaseModel {
  /**
   * Creates a new Purchase instance
   * @param {Object} data - Purchase data
   */
  constructor(data = {}) {
    super(data);

    // Required fields
    this.purchaseNumber = data.purchaseNumber || "";
    this.purchaseDate = data.purchaseDate || new Date();
    this.supplier = data.supplier || "";

    // Optional supplier identifier
    this.supplierId = data.supplierId || null;

    // Status tracking
    this.status = data.status || "draft";

    // Financial information
    this.totalAmount = data.totalAmount || 0;
    this.paymentMethod = data.paymentMethod || null;
    this.paymentStatus = data.paymentStatus || "unpaid";
    this.paymentDueDate = data.paymentDueDate || null;
    this.paymentDate = data.paymentDate || null;
    this.amountPaid = data.amountPaid || 0;

    // Additional information
    this.notes = data.notes || "";
    this.documentUrl = data.documentUrl || null;
    this.items = data.items || [];
    this.tags = data.tags || [];
  }

  /**
   * Validate the purchase
   * @return {boolean} True if valid, throws error if invalid
   */
  validate() {
    super.validate();

    if (!this.purchaseNumber || this.purchaseNumber.trim() === "") {
      throw new Error("Purchase number is required");
    }

    if (!this.supplier || this.supplier.trim() === "") {
      throw new Error("Supplier is required");
    }

    if (!this.purchaseDate) {
      throw new Error("Purchase date is required");
    }

    // Validate status
    const validStatuses = [
      "draft",
      "ordered",
      "received",
      "completed",
      "cancelled",
    ];
    if (!validStatuses.includes(this.status)) {
      throw new Error(`Invalid status: ${this.status}`);
    }

    // Validate payment status
    const validPaymentStatuses = ["unpaid", "partial", "paid"];
    if (!validPaymentStatuses.includes(this.paymentStatus)) {
      throw new Error(`Invalid payment status: ${this.paymentStatus}`);
    }

    // Validate items if they exist
    if (this.items && this.items.length > 0) {
      this.items.forEach((item, index) => {
        if (!item.itemId) {
          throw new Error(`Item at index ${index} is missing an item ID`);
        }

        if (item.quantity <= 0) {
          throw new Error(
              `Item at index ${index} has an invalid quantity: ${item.quantity}`,
          );
        }

        if (item.unitPrice < 0) {
          throw new Error(
              `Item at index ${index} has an invalid unit price: ${item.unitPrice}`,
          );
        }
      });
    }

    return true;
  }

  /**
   * Calculate the total amount for this purchase
   * @return {number} Total purchase amount
   */
  calculateTotal() {
    // Return current total if no items
    if (!this.items || this.items.length === 0) {
      return this.totalAmount || 0;
    }

    // Calculate total from items
    const total = this.items.reduce((sum, item) => {
      const itemTotal = (item.unitPrice || 0) * (item.quantity || 0);
      return sum + itemTotal;
    }, 0);

    // Update the total amount property
    this.totalAmount = total;

    return total;
  }

  /**
   * Update item totals based on quantity and unit price
   * @return {Array} Updated items array
   */
  updateItemTotals() {
    if (!this.items || this.items.length === 0) {
      return this.items || [];
    }

    this.items = this.items.map((item) => ({
      ...item,
      total: (item.quantity || 0) * (item.unitPrice || 0),
    }));

    // Recalculate the overall total
    this.calculateTotal();

    return this.items;
  }

  /**
   * Update payment status based on amount paid
   * @return {string} Updated payment status
   */
  updatePaymentStatus() {
    if (!this.totalAmount || this.totalAmount <= 0) {
      this.paymentStatus = "unpaid";
      return this.paymentStatus;
    }

    if (this.amountPaid <= 0) {
      this.paymentStatus = "unpaid";
    } else if (this.amountPaid >= this.totalAmount) {
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
   * Receive items in this purchase
   * @param {Array} receivedItems - Array of received items with quantities
   * @return {Object} Updated purchase with received items
   */
  receiveItems(receivedItems = []) {
    if (!this.items || this.items.length === 0 || !receivedItems) {
      return this;
    }

    // Update received quantities for each item
    this.items = this.items.map((item) => {
      const received = receivedItems.find((ri) => ri.itemId === item.itemId);

      if (received) {
        const newReceivedQuantity = (item.receivedQuantity || 0) +
          (received.quantity || 0);

        // Cap received quantity at ordered quantity
        const receivedQuantity = Math.min(
            newReceivedQuantity,
            item.quantity || 0,
        );

        return {
          ...item,
          receivedQuantity,
        };
      }

      return item;
    });

    // Check if all items are fully received
    const allReceived = this.items.every((item) =>
      (item.receivedQuantity || 0) >= (item.quantity || 0),
    );

    // Update status if needed
    if (allReceived && this.status === "ordered") {
      this.status = "received";
    }

    return this;
  }

  /**
   * Mark purchase as ordered
   * @return {Object} Updated purchase
   */
  markAsOrdered() {
    if (this.status === "draft") {
      this.status = "ordered";

      // Ensure item totals are calculated
      this.updateItemTotals();
    }

    return this;
  }

  /**
   * Mark purchase as completed
   * @return {Object} Updated purchase
   */
  markAsCompleted() {
    if (this.status === "received" || this.status === "ordered") {
      this.status = "completed";
    }

    return this;
  }

  /**
   * Cancel the purchase
   * @param {string} reason - Reason for cancellation
   * @return {Object} Updated purchase
   */
  cancel(reason = "") {
    // Only draft or ordered purchases can be cancelled
    if (this.status === "draft" || this.status === "ordered") {
      this.status = "cancelled";

      // Add cancellation reason to notes
      if (reason) {
        const cancellationNote = `Cancelled on ${new Date().toISOString()}: ${reason}`;
        this.notes = this.notes ?
          `${this.notes}\n\n${cancellationNote}` :
          cancellationNote;
      }
    }

    return this;
  }

  /**
   * Record a payment for this purchase
   * @param {number} amount - Payment amount
   * @param {string} method - Payment method
   * @param {Date} date - Payment date
   * @return {Object} Updated purchase
   */
  recordPayment(amount, method, date = new Date()) {
    if (amount <= 0) {
      throw new Error("Payment amount must be greater than zero");
    }

    // Update amount paid
    this.amountPaid = (this.amountPaid || 0) + amount;

    // Update payment method if provided
    if (method) {
      this.paymentMethod = method;
    }

    // Set payment date to latest payment
    this.paymentDate = date;

    // Update payment status
    this.updatePaymentStatus();

    return this;
  }

  /**
   * Get the plain object representation of the purchase
   * @return {Object} Plain object representation
   */
  toObject() {
    return {
      ...super.toObject(),
      purchaseNumber: this.purchaseNumber,
      purchaseDate: this.purchaseDate,
      supplier: this.supplier,
      supplierId: this.supplierId,
      status: this.status,
      totalAmount: this.totalAmount,
      paymentMethod: this.paymentMethod,
      paymentStatus: this.paymentStatus,
      paymentDueDate: this.paymentDueDate,
      paymentDate: this.paymentDate,
      amountPaid: this.amountPaid,
      notes: this.notes,
      documentUrl: this.documentUrl,
      items: this.items,
      tags: this.tags,
    };
  }

  /**
   * Get the name of this model
   * @return {string} Model name
   */
  static getModelName() {
    return "Purchase";
  }
}

module.exports = {
  purchaseModel,
  Purchase,
};
