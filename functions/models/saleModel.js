/**
 * Sale Model
 * Defines the domain model for sale transactions
 */

const {FieldTypes, defineModel, BaseModel} = require("./baseModel");

/**
 * Create the sale model definition
 */
const saleModel = defineModel("Sale", {
  saleNumber: {
    type: FieldTypes.STRING,
    required: true,
    unique: true,
  },
  saleDate: {
    type: FieldTypes.DATE,
    required: true,
    default: () => new Date(),
  },
  customer: {
    type: FieldTypes.STRING,
    required: true,
  },
  customerId: {
    type: FieldTypes.STRING,
  },
  status: {
    type: FieldTypes.ENUM,
    values: ["draft", "confirmed", "shipped", "completed", "cancelled"],
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
  shippingAddress: {
    type: FieldTypes.OBJECT,
    fields: {
      street: {type: FieldTypes.STRING},
      city: {type: FieldTypes.STRING},
      state: {type: FieldTypes.STRING},
      postalCode: {type: FieldTypes.STRING},
      country: {type: FieldTypes.STRING},
    },
  },
  shippingMethod: {
    type: FieldTypes.STRING,
  },
  shippingCost: {
    type: FieldTypes.NUMBER,
    default: 0,
  },
  trackingNumber: {
    type: FieldTypes.STRING,
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
        shippedQuantity: {
          type: FieldTypes.NUMBER,
          default: 0,
        },
      },
    },
    default: [],
  },
  discounts: {
    type: FieldTypes.ARRAY,
    items: {
      type: FieldTypes.OBJECT,
      fields: {
        type: {
          type: FieldTypes.ENUM,
          values: ["percentage", "fixed"],
          required: true,
        },
        value: {
          type: FieldTypes.NUMBER,
          required: true,
        },
        description: {
          type: FieldTypes.STRING,
        },
      },
    },
    default: [],
  },
  taxes: {
    type: FieldTypes.ARRAY,
    items: {
      type: FieldTypes.OBJECT,
      fields: {
        name: {
          type: FieldTypes.STRING,
          required: true,
        },
        rate: {
          type: FieldTypes.NUMBER,
          required: true,
        },
        amount: {
          type: FieldTypes.NUMBER,
          default: 0,
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
    {fields: {saleNumber: 1}, options: {unique: true}},
    {fields: {customer: 1}},
    {fields: {customerId: 1}},
    {fields: {saleDate: -1}},
    {fields: {status: 1}},
    {fields: {paymentStatus: 1}},
    {
      fields: {
        saleNumber: "text",
        customer: "text",
        notes: "text",
      },
    },
  ],
});

/**
 * Sale class for business logic related to sales
 */
class Sale extends BaseModel {
  /**
   * Creates a new Sale instance
   * @param {Object} data - Sale data
   */
  constructor(data = {}) {
    super(data);

    // Required fields
    this.saleNumber = data.saleNumber || "";
    this.saleDate = data.saleDate || new Date();
    this.customer = data.customer || "";

    // Optional customer identifier
    this.customerId = data.customerId || null;

    // Status tracking
    this.status = data.status || "draft";

    // Financial information
    this.totalAmount = data.totalAmount || 0;
    this.paymentMethod = data.paymentMethod || null;
    this.paymentStatus = data.paymentStatus || "unpaid";
    this.paymentDueDate = data.paymentDueDate || null;
    this.paymentDate = data.paymentDate || null;
    this.amountPaid = data.amountPaid || 0;

    // Shipping information
    this.shippingAddress = data.shippingAddress || null;
    this.shippingMethod = data.shippingMethod || null;
    this.shippingCost = data.shippingCost || 0;
    this.trackingNumber = data.trackingNumber || null;

    // Items, discounts, taxes
    this.items = data.items || [];
    this.discounts = data.discounts || [];
    this.taxes = data.taxes || [];

    // Additional information
    this.notes = data.notes || "";
    this.documentUrl = data.documentUrl || null;
    this.tags = data.tags || [];
  }

  /**
   * Validate the sale
   * @return {boolean} True if valid, throws error if invalid
   */
  validate() {
    super.validate();

    if (!this.saleNumber || this.saleNumber.trim() === "") {
      throw new Error("Sale number is required");
    }

    if (!this.customer || this.customer.trim() === "") {
      throw new Error("Customer is required");
    }

    if (!this.saleDate) {
      throw new Error("Sale date is required");
    }

    // Validate status
    const validStatuses = [
      "draft",
      "confirmed",
      "shipped",
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

    // Validate discounts if they exist
    if (this.discounts && this.discounts.length > 0) {
      this.discounts.forEach((discount, index) => {
        if (!discount.type || !["percentage", "fixed"].includes(discount.type)) {
          throw new Error(
              `Discount at index ${index} has an invalid type: ${discount.type}`,
          );
        }

        if (typeof discount.value !== "number" || discount.value < 0) {
          throw new Error(
              `Discount at index ${index} has an invalid value: ${discount.value}`,
          );
        }

        // Percentage discounts should be <= 100%
        if (
          discount.type === "percentage" &&
          (discount.value < 0 || discount.value > 100)
        ) {
          throw new Error(
              `Percentage discount at index ${index} must be between 0 and 100`,
          );
        }
      });
    }

    // Validate taxes if they exist
    if (this.taxes && this.taxes.length > 0) {
      this.taxes.forEach((tax, index) => {
        if (!tax.name || tax.name.trim() === "") {
          throw new Error(`Tax at index ${index} is missing a name`);
        }

        if (typeof tax.rate !== "number" || tax.rate < 0) {
          throw new Error(
              `Tax at index ${index} has an invalid rate: ${tax.rate}`,
          );
        }
      });
    }

    return true;
  }

  /**
   * Calculate the subtotal amount for this sale (before discounts and taxes)
   * @return {number} Subtotal sale amount
   */
  calculateSubtotal() {
    // Return 0 if no items
    if (!this.items || this.items.length === 0) {
      return 0;
    }

    // Calculate subtotal from items
    const subtotal = this.items.reduce((sum, item) => {
      const itemTotal = (item.unitPrice || 0) * (item.quantity || 0);
      return sum + itemTotal;
    }, 0);

    return subtotal;
  }

  /**
   * Calculate discount amount based on the subtotal
   * @param {number} subtotal - Subtotal to apply discounts to
   * @return {number} Total discount amount
   */
  calculateDiscountAmount(subtotal) {
    if (!this.discounts || this.discounts.length === 0 || subtotal <= 0) {
      return 0;
    }

    let totalDiscountAmount = 0;

    // Calculate and sum up all discounts
    this.discounts.forEach((discount) => {
      if (discount.type === "percentage") {
        // Percentage discount
        const discountAmount = subtotal * (discount.value / 100);
        totalDiscountAmount += discountAmount;
      } else if (discount.type === "fixed") {
        // Fixed amount discount
        totalDiscountAmount += discount.value;
      }
    });

    // Ensure discount doesn't exceed subtotal
    return Math.min(totalDiscountAmount, subtotal);
  }

  /**
   * Calculate tax amounts based on the taxable amount (after discounts)
   * @param {number} taxableAmount - Amount to apply taxes to
   * @return {Object} Updated taxes array with calculated amounts
   */
  calculateTaxes(taxableAmount) {
    if (!this.taxes || this.taxes.length === 0 || taxableAmount <= 0) {
      return this.taxes || [];
    }

    // Calculate tax amounts
    const updatedTaxes = this.taxes.map((tax) => ({
      ...tax,
      amount: taxableAmount * (tax.rate / 100),
    }));

    this.taxes = updatedTaxes;
    return updatedTaxes;
  }

  /**
   * Calculate the total tax amount
   * @return {number} Total tax amount
   */
  calculateTotalTaxAmount() {
    if (!this.taxes || this.taxes.length === 0) {
      return 0;
    }

    // Sum up all tax amounts
    return this.taxes.reduce((sum, tax) => sum + (tax.amount || 0), 0);
  }

  /**
   * Calculate the total amount for this sale
   * including subtotal, discounts, taxes, and shipping
   * @return {number} Total sale amount
   */
  calculateTotal() {
    // Calculate subtotal from items
    const subtotal = this.calculateSubtotal();

    // Calculate discount amount
    const discountAmount = this.calculateDiscountAmount(subtotal);

    // Calculate taxable amount (after discounts)
    const taxableAmount = subtotal - discountAmount;

    // Calculate taxes based on taxable amount
    this.calculateTaxes(taxableAmount);
    const taxAmount = this.calculateTotalTaxAmount();

    // Calculate total including shipping
    const total = taxableAmount + taxAmount + (this.shippingCost || 0);

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
   * Ship items in this sale
   * @param {Array} shippedItems - Array of shipped items with quantities
   * @param {Object} shippingInfo - Shipping information
   * @return {Object} Updated sale with shipped items
   */
  shipItems(shippedItems = [], shippingInfo = {}) {
    if (!this.items || this.items.length === 0 || !shippedItems) {
      return this;
    }

    // Update shipped quantities for each item
    this.items = this.items.map((item) => {
      const shipped = shippedItems.find((si) => si.itemId === item.itemId);

      if (shipped) {
        const newShippedQuantity = (item.shippedQuantity || 0) +
          (shipped.quantity || 0);

        // Cap shipped quantity at ordered quantity
        const shippedQuantity = Math.min(
            newShippedQuantity,
            item.quantity || 0,
        );

        return {
          ...item,
          shippedQuantity,
        };
      }

      return item;
    });

    // Update shipping information if provided
    if (shippingInfo.method) {
      this.shippingMethod = shippingInfo.method;
    }

    if (shippingInfo.trackingNumber) {
      this.trackingNumber = shippingInfo.trackingNumber;
    }

    if (typeof shippingInfo.cost === "number" && shippingInfo.cost >= 0) {
      this.shippingCost = shippingInfo.cost;
      // Recalculate total as shipping cost changed
      this.calculateTotal();
    }

    // Check if all items are fully shipped
    const allShipped = this.items.every((item) =>
      (item.shippedQuantity || 0) >= (item.quantity || 0),
    );

    // Update status if needed
    if (allShipped && this.status === "confirmed") {
      this.status = "shipped";
    }

    return this;
  }

  /**
   * Mark sale as confirmed
   * @return {Object} Updated sale
   */
  markAsConfirmed() {
    if (this.status === "draft") {
      this.status = "confirmed";

      // Ensure item totals are calculated
      this.updateItemTotals();
    }

    return this;
  }

  /**
   * Mark sale as completed
   * @return {Object} Updated sale
   */
  markAsCompleted() {
    if (this.status === "shipped" || this.status === "confirmed") {
      this.status = "completed";
    }

    return this;
  }

  /**
   * Cancel the sale
   * @param {string} reason - Reason for cancellation
   * @return {Object} Updated sale
   */
  cancel(reason = "") {
    // Only draft or confirmed sales can be cancelled
    if (this.status === "draft" || this.status === "confirmed") {
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
   * Record a payment for this sale
   * @param {number} amount - Payment amount
   * @param {string} method - Payment method
   * @param {Date} date - Payment date
   * @return {Object} Updated sale
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
   * Apply a discount to this sale
   * @param {string} type - Discount type ('percentage' or 'fixed')
   * @param {number} value - Discount value
   * @param {string} description - Optional description
   * @return {Object} Updated sale
   */
  applyDiscount(type, value, description = "") {
    if (!type || !["percentage", "fixed"].includes(type)) {
      throw new Error("Discount type must be 'percentage' or 'fixed'");
    }

    if (typeof value !== "number" || value < 0) {
      throw new Error("Discount value must be a non-negative number");
    }

    // Validate percentage discount value
    if (type === "percentage" && value > 100) {
      throw new Error("Percentage discount cannot exceed 100%");
    }

    // Add the discount
    this.discounts.push({
      type,
      value,
      description,
    });

    // Recalculate total
    this.calculateTotal();

    return this;
  }

  /**
   * Apply a tax to this sale
   * @param {string} name - Tax name
   * @param {number} rate - Tax rate as percentage
   * @return {Object} Updated sale
   */
  applyTax(name, rate) {
    if (!name || name.trim() === "") {
      throw new Error("Tax name is required");
    }

    if (typeof rate !== "number" || rate < 0) {
      throw new Error("Tax rate must be a non-negative number");
    }

    // Add the tax
    this.taxes.push({
      name,
      rate,
      amount: 0, // Will be calculated when total is calculated
    });

    // Recalculate total
    this.calculateTotal();

    return this;
  }

  /**
   * Get the plain object representation of the sale
   * @return {Object} Plain object representation
   */
  toObject() {
    return {
      ...super.toObject(),
      saleNumber: this.saleNumber,
      saleDate: this.saleDate,
      customer: this.customer,
      customerId: this.customerId,
      status: this.status,
      totalAmount: this.totalAmount,
      paymentMethod: this.paymentMethod,
      paymentStatus: this.paymentStatus,
      paymentDueDate: this.paymentDueDate,
      paymentDate: this.paymentDate,
      amountPaid: this.amountPaid,
      shippingAddress: this.shippingAddress,
      shippingMethod: this.shippingMethod,
      shippingCost: this.shippingCost,
      trackingNumber: this.trackingNumber,
      items: this.items,
      discounts: this.discounts,
      taxes: this.taxes,
      notes: this.notes,
      documentUrl: this.documentUrl,
      tags: this.tags,
    };
  }

  /**
   * Get the name of this model
   * @return {string} Model name
   */
  static getModelName() {
    return "Sale";
  }
}

module.exports = {
  saleModel,
  Sale,
};
