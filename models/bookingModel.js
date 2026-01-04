const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const bookingSchema = new Schema(
  {
    bookingCode: {
      type: String,
      unique: true,
      sparse: true, // Allows pre-save hook to generate it
    },

    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: [true, "Customer is required"],
      index: true,
    },

    eventType: {
      type: String,
      enum: [
        "Wedding",
        "Corporate Event",
        "Birthday Party",
        "Anniversary",
        "Conference",
        "Photoshoot",
        "Concert",
        "Festival",
        "Other",
      ],
      required: [true, "Event type is required"],
    },

    eventDate: {
      type: Date,
      required: [true, "Event date is required"],
      index: true,
    },

    eventVenue: {
      type: String,
      trim: true,
    },

    bookingStatus: {
      type: String,
      enum: ["Draft", "Confirmed", "Completed", "Cancelled", "No Show"],
      default: "Draft",
      index: true,
    },

    // Pickup Details
    pickupDate: {
      type: Date,
      required: [true, "Pickup date is required"],
      index: true,
    },

    pickupMethod: {
      type: String,
      enum: ["Store Pickup", "Home Delivery", "Courier"],
      default: "Store Pickup",
    },

    pickupTimeWindow: {
      type: String,
      trim: true,
    },

    pickupStatus: {
      type: String,
      enum: ["Not Picked Up", "Picked Up", "Delayed", "Cancelled"],
      default: "Not Picked Up",
    },

    // Return Details
    expectedReturnDate: {
      type: Date,
      required: [true, "Expected return date is required"],
      index: true,
    },

    actualReturnDate: {
      type: Date,
    },

    returnStatus: {
      type: String,
      enum: ["Not Returned", "Returned", "Overdue", "Partially Returned"],
      default: "Not Returned",
    },

    // Financial Details
    subtotal: {
      type: Number,
      default: 0,
      min: [0, "Subtotal cannot be negative"],
    },

    discountType: {
      type: String,
      enum: ["None", "Percentage", "Fixed Amount", "Promotional Code"],
      default: "None",
    },

    discountValue: {
      type: Number,
      default: 0,
      min: [0, "Discount value cannot be negative"],
    },

    taxRate: {
      type: Number,
      default: 18, // GST 18% in India
      min: [0, "Tax rate cannot be negative"],
    },

    taxAmount: {
      type: Number,
      default: 0,
      min: [0, "Tax amount cannot be negative"],
    },

    securityDeposit: {
      type: Number,
      default: 0,
      min: [0, "Security deposit cannot be negative"],
    },

    totalAmount: {
      type: Number,
      default: 0,
      min: [0, "Total amount cannot be negative"],
    },

    amountPaid: {
      type: Number,
      default: 0,
      min: [0, "Amount paid cannot be negative"],
    },

    balanceDue: {
      type: Number,
      default: 0,
    },

    paymentStatus: {
      type: String,
      enum: ["Unpaid", "Partially Paid", "Paid", "Refunded", "Overdue"],
      default: "Unpaid",
      index: true,
    },

    // Notes
    customerNotes: {
      type: String,
      trim: true,
    },

    internalNotes: {
      type: String,
      trim: true,
    },

    // Invoice Reference
    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: "Invoice",
    },

    // Items in booking (array of products)
    items: [
      {
        productId: {
          type: Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        productName: String,
        sku: String,
        quantity: {
          type: Number,
          default: 1,
          min: 1,
        },
        rentalPrice: {
          type: Number,
          required: true,
          min: 0,
        },
        securityDeposit: {
          type: Number,
          default: 0,
          min: 0,
        },
        subtotal: {
          type: Number,
          default: 0,
        },
      },
    ],
    // security refund
    // In your bookingSchema, add these fields:

    securityDepositRefunded: {
      type: Number,
      default: 0,
      min: 0,
    },

    securityDepositRefundMethod: {
      type: String,
      enum: ["Cash", "UPI", "Bank Transfer", "Card", "Cheque"],
    },

    securityDepositRefundDate: {
      type: Date,
    },
    // invoice reference 
    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: "Invoice",
      index: true,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

// ============================================
// PRE-SAVE HOOKS
// ============================================

/**
 * Generate booking code before saving
 * Format: BO + YYYYMMDD + Sequential Number
 * Example: BO20260101001
 */
bookingSchema.pre("save", async function (next) {
  if (this.isNew && !this.bookingCode) {
    try {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, "0");
      const day = String(today.getDate()).padStart(2, "0");
      const datePrefix = `${year}${month}${day}`;

      // Find the latest booking code for today
      const latestBooking = await this.constructor
        .findOne({
          bookingCode: new RegExp(`^BO${datePrefix}`),
        })
        .sort({ bookingCode: -1 })
        .select("bookingCode")
        .lean();

      let sequenceNumber = 1;
      if (latestBooking && latestBooking.bookingCode) {
        const lastSequence = parseInt(latestBooking.bookingCode.slice(-3));
        sequenceNumber = lastSequence + 1;
      }

      // Format: BO20260101001
      this.bookingCode = `BO${datePrefix}${String(sequenceNumber).padStart(
        3,
        "0"
      )}`;
    } catch (error) {
      return error;
    }
  }
});

// /**
//  * Calculate financial values before saving
//  */
// bookingSchema.pre('save', function (next) {
//   // Calculate subtotal from items
//   if (this.items && this.items.length > 0) {
//     this.subtotal = this.items.reduce((sum, item) => {
//       item.subtotal = item.rentalPrice * item.quantity;
//       return sum + item.subtotal;
//     }, 0);
//   }

//   // Calculate discount amount
//   let discountAmount = 0;
//   if (this.discountType === 'Percentage') {
//     discountAmount = (this.subtotal * this.discountValue) / 100;
//   } else if (this.discountType === 'Fixed Amount') {
//     discountAmount = this.discountValue;
//   }

//   // Calculate tax amount
//   const taxableAmount = this.subtotal - discountAmount;
//   this.taxAmount = (taxableAmount * this.taxRate) / 100;

//   // Calculate total amount
//   this.totalAmount = taxableAmount + this.taxAmount + this.securityDeposit;

//   // Calculate balance due
//   this.balanceDue = this.totalAmount - this.amountPaid;

//   // Update payment status based on amounts
//   if (this.amountPaid === 0) {
//     this.paymentStatus = 'Unpaid';
//   } else if (this.amountPaid >= this.totalAmount) {
//     this.paymentStatus = 'Paid';
//   } else {
//     this.paymentStatus = 'Partially Paid';
//   }

// });

/**
 * Calculate financial values before saving
 * Only for NEW bookings without calculated values
 */
bookingSchema.pre("save", function (next) {
  // Skip if values already calculated (from controller)
  if (this.subtotal && this.totalAmount) {
  }

  // Calculate subtotal from items (fallback for old code)
  if (this.items && this.items.length > 0) {
    this.subtotal = this.items.reduce((sum, item) => {
      item.subtotal = item.rentalPrice * item.quantity;
      return sum + item.subtotal;
    }, 0);
  }

  // Calculate discount amount
  let discountAmount = 0;
  if (this.discountType === "Percentage") {
    discountAmount = (this.subtotal * this.discountValue) / 100;
  } else if (this.discountType === "Fixed Amount") {
    discountAmount = this.discountValue;
  }

  // Calculate tax amount
  const taxableAmount = this.subtotal - discountAmount;
  this.taxAmount = (taxableAmount * this.taxRate) / 100;

  // Calculate total amount
  this.totalAmount = taxableAmount + this.taxAmount + this.securityDeposit;

  // Calculate balance due
  this.balanceDue = this.totalAmount - this.amountPaid;

  // Update payment status based on amounts
  if (this.amountPaid === 0) {
    this.paymentStatus = "Unpaid";
  } else if (this.amountPaid >= this.totalAmount) {
    this.paymentStatus = "Paid";
  } else {
    this.paymentStatus = "Partially Paid";
  }
});

/**
 * Update booking status based on dates
 */
bookingSchema.pre("save", function (next) {
  const now = new Date();

  // Auto-complete if returned
  if (this.actualReturnDate && this.bookingStatus === "Confirmed") {
    this.bookingStatus = "Completed";
    this.returnStatus = "Returned";
  }

  // Check overdue
  if (
    !this.actualReturnDate &&
    this.expectedReturnDate < now &&
    this.bookingStatus === "Confirmed"
  ) {
    this.returnStatus = "Overdue";
  }
});

// ============================================
// VIRTUALS
// ============================================

/**
 * Virtual for rental duration in days
 */
bookingSchema.virtual("rentalDuration").get(function () {
  if (this.pickupDate && this.expectedReturnDate) {
    const diff = this.expectedReturnDate - this.pickupDate;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
  return 0;
});

/**
 * Virtual for overdue days
 */
bookingSchema.virtual("overdueDays").get(function () {
  if (!this.actualReturnDate && this.expectedReturnDate) {
    const now = new Date();
    if (now > this.expectedReturnDate) {
      const diff = now - this.expectedReturnDate;
      return Math.ceil(diff / (1000 * 60 * 60 * 24));
    }
  }
  return 0;
});

/**
 * Virtual for items summary
 */
bookingSchema.virtual("itemsSummary").get(function () {
  if (this.items && this.items.length > 0) {
    return this.items
      .map((item) => item.productName || item.sku)
      .filter(Boolean)
      .join(", ");
  }
  return "No items";
});

/**
 * Virtual for outstanding amount (alias for balanceDue)
 */
bookingSchema.virtual("outstandingAmount").get(function () {
  return this.balanceDue;
});

// ============================================
// INDEXES
// ============================================

bookingSchema.index({ customerId: 1, bookingStatus: 1 });
bookingSchema.index({ eventDate: 1, bookingStatus: 1 });
bookingSchema.index({ pickupDate: 1, pickupStatus: 1 });
bookingSchema.index({ expectedReturnDate: 1, returnStatus: 1 });
bookingSchema.index({ paymentStatus: 1, balanceDue: 1 });
bookingSchema.index({ createdAt: -1 });

// ============================================
// METHODS
// ============================================

/**
 * Instance method to format booking for API response
 */
bookingSchema.methods.toJSON = function () {
  const obj = this.toObject();

  // Include virtuals
  obj.rentalDuration = this.rentalDuration;
  obj.overdueDays = this.overdueDays;
  obj.itemsSummary = this.itemsSummary;
  obj.outstandingAmount = this.outstandingAmount;

  // Format dates
  if (obj.eventDate) {
    obj.eventDate = new Date(obj.eventDate).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
  if (obj.pickupDate) {
    obj.pickupDate = new Date(obj.pickupDate).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
  if (obj.expectedReturnDate) {
    obj.returnDate = new Date(obj.expectedReturnDate).toLocaleDateString(
      "en-IN",
      {
        year: "numeric",
        month: "short",
        day: "numeric",
      }
    );
  }

  return obj;
};

/**
 * Static method to get bookings with pagination
 */
bookingSchema.statics.getBookingsWithPagination = async function (
  page = 1,
  limit = 20,
  search = "",
  filters = {}
) {
  const query = {};

  // Search by booking code or customer name
  if (search) {
    const Customer = mongoose.model("Customer");
    const customers = await Customer.find({
      $or: [
        { name: new RegExp(search, "i") },
        { code: new RegExp(search, "i") },
      ],
    })
      .select("_id")
      .lean();

    const customerIds = customers.map((c) => c._id);

    query.$or = [
      { bookingCode: new RegExp(search, "i") },
      { customerId: { $in: customerIds } },
    ];
  }

  // Apply filters
  if (filters.bookingStatus) query.bookingStatus = filters.bookingStatus;
  if (filters.paymentStatus) query.paymentStatus = filters.paymentStatus;
  if (filters.pickupStatus) query.pickupStatus = filters.pickupStatus;
  if (filters.returnStatus) query.returnStatus = filters.returnStatus;

  const total = await this.countDocuments(query);
  const totalPages = Math.ceil(total / limit);
  const skip = (page - 1) * limit;

  const bookings = await this.find(query)
    .populate("customerId", "name email primaryMobile")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  // Format for frontend
  const formattedBookings = bookings.map((booking) => ({
    id: booking._id,
    bookingId: booking.bookingCode,
    customerName: booking.customerId?.name || "Unknown",
    eventDate: new Date(booking.eventDate).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
    pickupDate: new Date(booking.pickupDate).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
    returnDate: new Date(booking.expectedReturnDate).toLocaleDateString(
      "en-IN",
      {
        year: "numeric",
        month: "short",
        day: "numeric",
      }
    ),
    itemsSummary:
      booking.items
        ?.map((item) => item.productName || item.sku)
        .filter(Boolean)
        .join(", ") || "No items",
    bookingStatus: booking.bookingStatus,
    paymentStatus: booking.paymentStatus,
    outstandingAmount: booking.balanceDue,
  }));

  return {
    data: formattedBookings,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      from: skip + 1,
      to: Math.min(skip + limit, total),
    },
  };
};

// Enable virtuals in JSON
bookingSchema.set("toJSON", { virtuals: true });
bookingSchema.set("toObject", { virtuals: true });

const Booking = mongoose.model("Booking", bookingSchema);

module.exports = Booking;
