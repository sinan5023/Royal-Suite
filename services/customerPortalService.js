const Customer = require("../models/customerModel");
const Booking = require("../models/bookingModel");
const Invoice = require("../models/invoiceModel");
const jwt = require("jsonwebtoken");

/**
 * Authenticate customer with username and password
 * @param {String} username - Customer username
 * @param {String} password - Customer password
 * @returns {Promise<Object>} Customer and JWT token
 */
const authenticateCustomer = async (username, password) => {
  try {
    // Find customer by username
    const customer = await Customer.findOne({
      "portalCredentials.username": username,
    });

    if (!customer) {
      throw new Error("Invalid username or password");
    }

    // Check if account is active
    if (!customer.portalCredentials.isActive) {
      throw new Error("Account is disabled. Contact support");
    }

    // Check if account is locked
    if (customer.portalCredentials.accountLocked) {
      if (
        customer.portalCredentials.lockedUntil &&
        customer.portalCredentials.lockedUntil > Date.now()
      ) {
        const remainingMinutes = Math.ceil(
          (customer.portalCredentials.lockedUntil - Date.now()) / 60000
        );
        throw new Error(
          `Account locked due to multiple failed attempts. Try again in ${remainingMinutes} minutes`
        );
      } else {
        // Reset lock if expired
        customer.portalCredentials.accountLocked = false;
        customer.portalCredentials.failedLoginAttempts = 0;
        await customer.save();
      }
    }

    // Compare password
    const isMatch = await customer.comparePassword(password);

    if (!isMatch) {
      await customer.incrementLoginAttempts();
      throw new Error("Invalid username or password");
    }

    // Reset failed attempts and update last login
    await customer.resetLoginAttempts();

    // Generate session JWT token
    const token = jwt.sign(
      {
        customerId: customer._id,
        username: customer.portalCredentials.username,
        name: customer.fullName,
        type: "session",
      },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "7d" }
    );

    return {
      success: true,
      customer: {
        id: customer._id,
        fullName: customer.fullName,
        email: customer.email,
        primaryMobile: customer.primaryMobile,
        username: customer.portalCredentials.username,
        firstLogin: customer.portalCredentials.firstLogin,
      },
      token,
    };
  } catch (error) {
    console.error("Authentication error:", error);
    throw error;
  }
};

/**
 * Get customer dashboard data
 * @param {String} customerId - Customer ID
 * @returns {Promise<Object>} Dashboard statistics
 */
const getCustomerDashboard = async (customerId) => {
  try {
    const customer = await Customer.findById(customerId)
      .select("fullName email primaryMobile customerCode totalBookings totalRevenue outstandingBalance")
      .lean();

    if (!customer) {
      throw new Error("Customer not found");
    }

    // Get recent bookings
    const recentBookings = await Booking.find({ customerId })
      .select("bookingCode eventType eventDate bookingStatus totalAmount")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Get recent invoices
    const recentInvoices = await Invoice.find({ customerId })
      .select("invoiceNumber issueDate dueDate totalAmount balanceDue status")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Calculate stats
    const totalBookings = await Booking.countDocuments({ customerId });
    const activeBookings = await Booking.countDocuments({
      customerId,
      bookingStatus: { $in: ["Confirmed", "Draft"] },
    });

    const pendingInvoices = await Invoice.countDocuments({
      customerId,
      status: { $in: ["Draft", "Issued", "Overdue"] },
    });

    const totalPending = await Invoice.aggregate([
      {
        $match: {
          customerId: customer._id,
          status: { $in: ["Draft", "Issued", "Overdue"] },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$balanceDue" },
        },
      },
    ]);

    return {
      customer,
      recentBookings,
      recentInvoices,
      stats: {
        totalBookings,
        activeBookings,
        pendingInvoices,
        pendingAmount: totalPending[0]?.total || 0,
      },
    };
  } catch (error) {
    console.error("Error fetching dashboard:", error);
    throw error;
  }
};

/**
 * Get customer bookings with pagination
 * @param {String} customerId - Customer ID
 * @param {Number} page - Page number
 * @param {Number} limit - Items per page
 * @returns {Promise<Object>} Bookings with pagination
 */
const getCustomerBookings = async (customerId, page = 1, limit = 10) => {
  try {
    const skip = (page - 1) * limit;
    const total = await Booking.countDocuments({ customerId });

    const bookings = await Booking.find({ customerId })
      .select("bookingCode eventType eventDate pickupDate expectedReturnDate bookingStatus paymentStatus totalAmount balanceDue")
      .populate("items.productId", "displayName photos")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return {
      bookings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error("Error fetching bookings:", error);
    throw error;
  }
};

/**
 * Get single booking details
 * @param {String} customerId - Customer ID
 * @param {String} bookingId - Booking ID
 * @returns {Promise<Object>} Booking details
 */
const getCustomerBookingById = async (customerId, bookingId) => {
  try {
    const booking = await Booking.findOne({
      _id: bookingId,
      customerId,
    })
      .populate("items.productId", "displayName sku photos baseRent")
      .lean();

    if (!booking) {
      throw new Error("Booking not found");
    }

    return booking;
  } catch (error) {
    console.error("Error fetching booking:", error);
    throw error;
  }
};

/**
 * Get customer invoices with pagination
 * @param {String} customerId - Customer ID
 * @param {Number} page - Page number
 * @param {Number} limit - Items per page
 * @returns {Promise<Object>} Invoices with pagination
 */
const getCustomerInvoices = async (customerId, page = 1, limit = 10) => {
  try {
    const skip = (page - 1) * limit;
    const total = await Invoice.countDocuments({ customerId });

    const invoices = await Invoice.find({ customerId })
      .select("invoiceNumber issueDate dueDate totalAmount amountPaid balanceDue status")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return {
      invoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error("Error fetching invoices:", error);
    throw error;
  }
};

/**
 * Get single invoice details
 * @param {String} customerId - Customer ID
 * @param {String} invoiceId - Invoice ID
 * @returns {Promise<Object>} Invoice details
 */
const getCustomerInvoiceById = async (customerId, invoiceId) => {
  try {
    const invoice = await Invoice.findOne({
      _id: invoiceId,
      customerId,
    })
      .populate("bookingId", "bookingCode eventDate")
      .populate("items.productId", "displayName sku photos")
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

module.exports = {
  authenticateCustomer,
  getCustomerDashboard,
  getCustomerBookings,
  getCustomerBookingById,
  getCustomerInvoices,
  getCustomerInvoiceById,
};
