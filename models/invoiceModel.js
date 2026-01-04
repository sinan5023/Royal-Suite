const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const invoiceSchema = new Schema(
  {
    invoiceNumber: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      unique: true, // One invoice per booking
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },

    // Invoice Status
    status: {
      type: String,
      enum: [
        "Draft",
        "Issued",
        "Paid",
        "Partially Paid",
        "Overdue",
        "Cancelled",
      ],
      default: "Draft",
      index: true,
    },

    // Dates
    issueDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    dueDate: {
      type: Date,
    },
    paymentTerms: {
      type: String,
      enum: ["Due on Receipt", "Net 7", "Net 15", "Net 30", "Custom"],
      default: "Due on Receipt",
    },

    // Billing Information (copied from customer at time of invoice generation)
    billTo: {
      name: {
        type: String,
        required: true,
      },
      email: {
        type: String,
      },
      phone: {
        type: String,
      },
      street: {
        type: String,
      },
      city: {
        type: String,
      },
      state: {
        type: String,
      },
      postalCode: {
        type: String,
      },
      country: {
        type: String,
        default: "India",
      },
    },

    // Items from booking (snapshot at time of invoice generation)
    items: [
      {
        productId: {
          type: Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        productName: {
          type: String,
          required: true,
        },
        sku: {
          type: String,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        rentalPrice: {
          type: Number,
          required: true,
          min: 0,
        },
        rentalDays: {
          type: Number,
          required: true,
          min: 1,
        },
        subtotal: {
          type: Number,
          default: 0,
        },
      },
    ],

    // Financial Details
    subtotal: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    discountType: {
      type: String,
      enum: ["None", "Percentage", "Fixed Amount", "Promotional Code"],
      default: "None",
    },
    discountValue: {
      type: Number,
      default: 0,
      min: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    taxRate: {
      type: Number,
      default: 18,
      min: 0,
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Security Deposit Tracking
    securityDeposit: {
      type: Number,
      default: 0,
      min: 0,
    },
    securityDepositRefunded: {
      type: Number,
      default: 0,
      min: 0,
    },
    securityDepositRefundDate: {
      type: Date,
    },
    securityDepositRefundMethod: {
      type: String,
      enum: ["Cash", "UPI", "Bank Transfer", "Card", "Cheque"],
    },
    securityDepositStatus: {
      type: String,
      enum: ["Held", "Partially Refunded", "Fully Refunded", "Forfeited"],
      default: "Held",
    },

    // Payment Summary
    totalAmount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    amountPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    balanceDue: {
      type: Number,
      default: 0,
    },

    // Payment History
    payments: [
      {
        amount: {
          type: Number,
          required: true,
          min: 0,
        },
        method: {
          type: String,
          enum: ["Cash", "Card", "UPI", "Bank Transfer", "Cheque"],
          required: true,
        },
        paymentDate: {
          type: Date,
          default: Date.now,
        },
        reference: {
          type: String,
        },
        notes: {
          type: String,
        },
      },
    ],

    // Late Fees
    lateFees: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Notes
    invoiceNotes: {
      type: String,
      trim: true,
    },
    internalNotes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// ===== PRE-SAVE HOOKS =====

/**
 * Generate invoice number before saving
 * Format: INV-YYYYMMDD-XXXX
 * Example: INV-20260102-0001
 */
invoiceSchema.pre("save", async function () {
  if (this.isNew && !this.invoiceNumber) {
    try {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, "0");
      const day = String(today.getDate()).padStart(2, "0");
      const datePrefix = `${year}${month}${day}`;

      // Find the latest invoice number for today
      const latestInvoice = await this.constructor
        .findOne({
          invoiceNumber: new RegExp(`^INV-${datePrefix}`),
        })
        .sort({ invoiceNumber: -1 })
        .select("invoiceNumber")
        .lean();

      let sequenceNumber = 1;
      if (latestInvoice && latestInvoice.invoiceNumber) {
        const lastSequence = parseInt(latestInvoice.invoiceNumber.slice(-4));
        sequenceNumber = lastSequence + 1;
      }

      // Format: INV-20260102-0001
      this.invoiceNumber = `INV-${datePrefix}-${String(sequenceNumber).padStart(
        4,
        "0"
      )}`;
    } catch (error) {
      console.error("Error generating invoice number:", error);
      throw error;
    }
  }
});

/**
 * Calculate financial values before saving
 */
invoiceSchema.pre("save", function () {
  // Calculate item subtotals
  if (this.items && this.items.length > 0) {
    this.items.forEach((item) => {
      item.subtotal = item.rentalPrice * item.quantity * item.rentalDays;
    });

    // Calculate invoice subtotal
    this.subtotal = this.items.reduce((sum, item) => sum + item.subtotal, 0);
  }

  // Calculate discount amount
  if (this.discountType === "Percentage") {
    this.discountAmount = (this.subtotal * this.discountValue) / 100;
  } else if (
    this.discountType === "Fixed Amount" ||
    this.discountType === "Promotional Code"
  ) {
    this.discountAmount = this.discountValue;
  } else {
    this.discountAmount = 0;
  }

  // Calculate tax amount
  const taxableAmount = this.subtotal - this.discountAmount;
  this.taxAmount = (taxableAmount * this.taxRate) / 100;

  // Calculate total amount (excluding security deposit)
  this.totalAmount = taxableAmount + this.taxAmount + (this.lateFees || 0);

  // Calculate balance due
  this.balanceDue = this.totalAmount - this.amountPaid;

  // Update status based on payment
  if (this.balanceDue <= 0 && this.amountPaid > 0) {
    this.status = "Paid";
  } else if (this.amountPaid > 0 && this.balanceDue > 0) {
    this.status = "Partially Paid";
  } else if (this.dueDate && new Date() > this.dueDate && this.balanceDue > 0) {
    this.status = "Overdue";
  }

  // Update security deposit status
  if (this.securityDepositRefunded === 0) {
    this.securityDepositStatus = "Held";
  } else if (
    this.securityDepositRefunded > 0 &&
    this.securityDepositRefunded < this.securityDeposit
  ) {
    this.securityDepositStatus = "Partially Refunded";
  } else if (this.securityDepositRefunded >= this.securityDeposit) {
    this.securityDepositStatus = "Fully Refunded";
  }
});

// ===== INDEXES =====
invoiceSchema.index({ invoiceNumber: 1 });
invoiceSchema.index({ bookingId: 1 });
invoiceSchema.index({ customerId: 1, createdAt: -1 });
invoiceSchema.index({ status: 1, dueDate: 1 });
invoiceSchema.index({ createdAt: -1 });

// ===== VIRTUALS =====
invoiceSchema.virtual("isOverdue").get(function () {
  if (this.status === "Paid" || this.status === "Cancelled") {
    return false;
  }
  return this.dueDate && new Date() > this.dueDate && this.balanceDue > 0;
});

invoiceSchema.virtual("daysOverdue").get(function () {
  if (!this.isOverdue) return 0;
  const diffTime = new Date() - this.dueDate;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// ===== METHODS =====

/**
 * Add payment to invoice
 */
invoiceSchema.methods.addPayment = function (paymentData) {
  const { amount, method, reference, notes } = paymentData;

  if (amount <= 0) {
    throw new Error("Payment amount must be greater than 0");
  }

  if (amount > this.balanceDue) {
    throw new Error(
      `Payment amount (₹${amount}) cannot exceed balance due (₹${this.balanceDue})`
    );
  }

  this.payments.push({
    amount,
    method,
    reference,
    notes,
    paymentDate: new Date(),
  });

  this.amountPaid += amount;
  this.balanceDue -= amount;

  // Update status
  if (this.balanceDue <= 0) {
    this.status = "Paid";
  } else if (this.amountPaid > 0) {
    this.status = "Partially Paid";
  }

  return this;
};

/**
 * Refund security deposit
 */
invoiceSchema.methods.refundSecurityDeposit = function (refundData) {
  const { amount, method, notes } = refundData;

  if (amount <= 0) {
    throw new Error("Refund amount must be greater than 0");
  }

  if (amount > this.securityDeposit - this.securityDepositRefunded) {
    throw new Error(
      `Refund amount (₹${amount}) cannot exceed remaining deposit (₹${
        this.securityDeposit - this.securityDepositRefunded
      })`
    );
  }

  this.securityDepositRefunded += amount;
  this.securityDepositRefundDate = new Date();
  this.securityDepositRefundMethod = method;

  // Update status
  if (this.securityDepositRefunded >= this.securityDeposit) {
    this.securityDepositStatus = "Fully Refunded";
  } else if (this.securityDepositRefunded > 0) {
    this.securityDepositStatus = "Partially Refunded";
  }

  // Add to internal notes
  this.internalNotes =
    (this.internalNotes || "") +
    `\n[${new Date().toISOString()}] Security Deposit Refunded: ₹${amount} via ${method}${
      notes ? ` - ${notes}` : ""
    }`;

  return this;
};

// Enable virtuals in JSON
invoiceSchema.set("toJSON", { virtuals: true });
invoiceSchema.set("toObject", { virtuals: true });

const Invoice = mongoose.model("Invoice", invoiceSchema);

module.exports = Invoice;
