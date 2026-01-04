const Invoice = require("../models/invoiceModel");
const Booking = require("../models/bookingModel");
const Customer = require("../models/customerModel");

/**
 * Check if invoice exists for booking
 */
const checkInvoiceExists = async (bookingId) => {
  try {
    const invoice = await Invoice.findOne({ bookingId })
      .select("_id invoiceNumber")
      .lean();
    return {
      exists: !!invoice,
      invoice: invoice || null,
    };
  } catch (error) {
    console.error("Error checking invoice existence:", error);
    throw error;
  }
};

/**
 * Generate invoice from booking
 */
const generateInvoiceFromBooking = async (bookingId, options = {}) => {
  try {
    // Check if invoice already exists
    const existingInvoice = await Invoice.findOne({ bookingId });
    if (existingInvoice) {
      throw new Error("Invoice already exists for this booking");
    }

    // Get booking with all details
    const booking = await Booking.findById(bookingId)
      .populate("customerId")
      .populate("items.productId")
      .lean();

    if (!booking) {
      throw new Error("Booking not found");
    }

    if (
      booking.bookingStatus !== "Confirmed" &&
      booking.bookingStatus !== "Completed"
    ) {
      throw new Error("Only confirmed or completed bookings can be invoiced");
    }

    // Calculate rental days
    const pickup = new Date(booking.pickupDate);
    const returnDate = new Date(booking.expectedReturnDate);
    const rentalDays =
      Math.ceil((returnDate - pickup) / (1000 * 60 * 60 * 24)) || 1;

    // Prepare invoice items from booking items
    const invoiceItems = booking.items.map((item) => ({
      productId: item.productId._id,
      productName: item.productName || item.productId.displayName,
      sku: item.sku || item.productId.sku,
      quantity: item.quantity,
      rentalPrice: item.rentalPrice,
      rentalDays: rentalDays,
      subtotal: item.rentalPrice * item.quantity * rentalDays,
    }));

    // Prepare billing information from customer
    const customer = booking.customerId;
    const billTo = {
      name: customer.fullName || customer.name,
      email: customer.email,
      phone: customer.primaryMobile,
      street: customer.address?.street || customer.address,
      city: customer.city,
      state: customer.state,
      postalCode: customer.pincode,
      country: "India",
    };

    // Calculate due date based on payment terms
    const issueDate = options.issueDate || new Date();
    let dueDate = new Date(issueDate);

    switch (options.paymentTerms || "Due on Receipt") {
      case "Net 7":
        dueDate.setDate(dueDate.getDate() + 7);
        break;
      case "Net 15":
        dueDate.setDate(dueDate.getDate() + 15);
        break;
      case "Net 30":
        dueDate.setDate(dueDate.getDate() + 30);
        break;
      default:
        dueDate = issueDate;
    }

    // Create invoice
    const invoiceData = {
      bookingId: booking._id,
      customerId: booking.customerId._id,
      status: booking.amountPaid > 0 ? "Issued" : "Draft",
      issueDate,
      dueDate,
      paymentTerms: options.paymentTerms || "Due on Receipt",
      billTo,
      items: invoiceItems,
      subtotal: booking.subtotal,
      discountType: booking.discountType,
      discountValue: booking.discountValue,
      taxRate: booking.taxRate,
      taxAmount: booking.taxAmount,
      securityDeposit: booking.securityDeposit,
      securityDepositRefunded: booking.securityDepositRefunded || 0,
      securityDepositRefundDate: booking.securityDepositRefundDate,
      securityDepositRefundMethod: booking.securityDepositRefundMethod,
      totalAmount: booking.totalAmount - booking.securityDeposit, // Exclude security deposit from total
      amountPaid: booking.amountPaid,
      balanceDue: booking.balanceDue,
      lateFees: 0,
      invoiceNotes: options.invoiceNotes || "",
      internalNotes:
        options.internalNotes ||
        `Generated from booking ${booking.bookingCode}`,
    };

    // ✅ FIXED: Only add payment if amount was paid (using valid enum value)
    if (booking.amountPaid > 0) {
      invoiceData.payments = [
        {
          amount: booking.amountPaid,
          method: "Cash", // Use valid enum value instead of 'Multiple'
          paymentDate: booking.createdAt,
          notes: `Initial payment from booking ${booking.bookingCode}`,
        },
      ];
    }

    const invoice = new Invoice(invoiceData);
    await invoice.save();

    // Update booking with invoice reference
    await Booking.findByIdAndUpdate(bookingId, {
      invoiceId: invoice._id,
    });

    // Populate before returning
    await invoice.populate("customerId", "fullName name email primaryMobile");
    await invoice.populate("items.productId", "displayName sku photos");

    return invoice;
  } catch (error) {
    console.error("Error generating invoice from booking:", error);
    throw error;
  }
};

/**
 * Get invoice by ID
 */
const getInvoiceById = async (invoiceId) => {
  try {
    const invoice = await Invoice.findById(invoiceId)
      .populate(
        "customerId",
        "fullName name email primaryMobile secondaryMobile address city state pincode"
      )
      .populate(
        "bookingId",
        "bookingCode eventDate pickupDate expectedReturnDate"
      )
      .populate("items.productId", "displayName sku photos category")
      .lean();

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    return invoice;
  } catch (error) {
    console.error("Error fetching invoice:", error);
    throw error;
  }
};

/**
 * Get all invoices with pagination
 */
const getInvoicesWithPagination = async (
  page = 1,
  limit = 20,
  search = "",
  filters = {}
) => {
  try {
    const query = {};

    // Search by invoice number or customer
    if (search) {
      const customers = await Customer.find({
        $or: [
          { name: new RegExp(search, "i") },
          { fullName: new RegExp(search, "i") },
          { primaryMobile: new RegExp(search, "i") },
          { email: new RegExp(search, "i") },
        ],
      })
        .select("_id")
        .lean();

      const customerIds = customers.map((c) => c._id);

      query.$or = [
        { invoiceNumber: new RegExp(search, "i") },
        { customerId: { $in: customerIds } },
      ];
    }

    // Apply filters
    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.startDate && filters.endDate) {
      query.issueDate = {
        $gte: new Date(filters.startDate),
        $lte: new Date(filters.endDate),
      };
    }

    const total = await Invoice.countDocuments(query);
    const totalPages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;

    const invoices = await Invoice.find(query)
      .populate("customerId", "fullName name email primaryMobile")
      .populate("bookingId", "bookingCode")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return {
      data: invoices,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        from: skip + 1,
        to: Math.min(skip + limit, total),
      },
    };
  } catch (error) {
    console.error("Error fetching invoices:", error);
    throw error;
  }
};

/**
 * Update invoice
 */
const updateInvoice = async (invoiceId, updateData) => {
  try {
    const invoice = await Invoice.findById(invoiceId);

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    // Don't allow editing if invoice is paid
    if (invoice.status === "Paid") {
      throw new Error("Cannot edit paid invoices");
    }

    // Update allowed fields
    const allowedUpdates = [
      "status",
      "dueDate",
      "paymentTerms",
      "invoiceNotes",
      "internalNotes",
      "lateFees",
    ];

    allowedUpdates.forEach((field) => {
      if (updateData[field] !== undefined) {
        invoice[field] = updateData[field];
      }
    });

    await invoice.save();

    await invoice.populate("customerId", "fullName name email primaryMobile");
    await invoice.populate("bookingId", "bookingCode");
    await invoice.populate("items.productId", "displayName sku photos");

    return invoice;
  } catch (error) {
    console.error("Error updating invoice:", error);
    throw error;
  }
};

/**
 * Record payment for invoice
 */
const recordInvoicePayment = async (invoiceId, paymentData) => {
  try {
    const invoice = await Invoice.findById(invoiceId);

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    if (invoice.status === "Cancelled") {
      throw new Error("Cannot record payment for cancelled invoice");
    }

    // Use the invoice method to add payment
    invoice.addPayment(paymentData);
    await invoice.save();

    // Also update the booking
    await Booking.findByIdAndUpdate(invoice.bookingId, {
      amountPaid: invoice.amountPaid,
      balanceDue: invoice.balanceDue,
      paymentStatus: invoice.status === "Paid" ? "Paid" : "Partially Paid",
    });

    return invoice;
  } catch (error) {
    console.error("Error recording payment:", error);
    throw error;
  }
};

/**
 * Refund security deposit
 */
const refundSecurityDeposit = async (invoiceId, refundData) => {
  try {
    const invoice = await Invoice.findById(invoiceId);

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    // Use the invoice method to refund deposit
    invoice.refundSecurityDeposit(refundData);
    await invoice.save();

    // Also update the booking
    await Booking.findByIdAndUpdate(invoice.bookingId, {
      securityDepositRefunded: invoice.securityDepositRefunded,
      securityDepositRefundDate: invoice.securityDepositRefundDate,
      securityDepositRefundMethod: invoice.securityDepositRefundMethod,
    });

    return invoice;
  } catch (error) {
    console.error("Error refunding security deposit:", error);
    throw error;
  }
};

/**
 * Cancel invoice
 */
const cancelInvoice = async (invoiceId, reason) => {
  try {
    const invoice = await Invoice.findById(invoiceId);

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    if (invoice.status === "Paid") {
      throw new Error(
        "Cannot cancel paid invoices. Please process a refund instead."
      );
    }

    invoice.status = "Cancelled";
    invoice.internalNotes =
      (invoice.internalNotes || "") +
      `\n[${new Date().toISOString()}] Cancelled: ${reason}`;

    await invoice.save();

    return invoice;
  } catch (error) {
    console.error("Error cancelling invoice:", error);
    throw error;
  }
};

/**
 * Get invoice statistics
 */
const getInvoiceStats = async () => {
  try {
    const stats = await Invoice.aggregate([
      {
        $facet: {
          totalInvoices: [{ $count: "count" }],
          byStatus: [
            {
              $group: {
                _id: "$status",
                count: { $sum: 1 },
                totalAmount: { $sum: "$totalAmount" },
              },
            },
          ],
          revenue: [
            {
              $group: {
                _id: null,
                totalRevenue: { $sum: "$totalAmount" },
                totalPaid: { $sum: "$amountPaid" },
                totalOutstanding: { $sum: "$balanceDue" },
              },
            },
          ],
          overdueInvoices: [
            {
              $match: {
                status: { $nin: ["Paid", "Cancelled"] },
                dueDate: { $lt: new Date() },
                balanceDue: { $gt: 0 },
              },
            },
            { $count: "count" },
          ],
        },
      },
    ]);

    return {
      totalInvoices: stats[0].totalInvoices[0]?.count || 0,
      byStatus: stats[0].byStatus,
      revenue: stats[0].revenue[0] || {
        totalRevenue: 0,
        totalPaid: 0,
        totalOutstanding: 0,
      },
      overdueInvoices: stats[0].overdueInvoices[0]?.count || 0,
    };
  } catch (error) {
    console.error("Error fetching invoice stats:", error);
    throw error;
  }
};

module.exports = {
  checkInvoiceExists,
  generateInvoiceFromBooking,
  getInvoiceById,
  getInvoicesWithPagination,
  updateInvoice,
  recordInvoicePayment,
  refundSecurityDeposit,
  cancelInvoice,
  getInvoiceStats,
};
