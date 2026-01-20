const customerPortalService = require("../services/customerPortalService");
const customerPortalLinkService = require("../services/customerPortalLinkService");
const invoicePdfService = require("../services/invoicePdfService");
const Invoice = require("../models/invoiceModel");
const dotenv = require("dotenv");
dotenv.config();

// ============================================
// HELPER FUNCTIONS
// ============================================

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function getCurrentDate() {
  return new Date().toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ============================================
// PUBLIC ROUTES (No Auth Required)
// ============================================

/**
 * Handle portal access via token
 * Verifies token and redirects to login page with token
 * @route GET /customer/access/:token
 */
const handlePortalAccess = async (req, res) => {
  try {
    console.log(
      "📥 Received token param:",
      req.params.token.substring(0, 20) + "..."
    ); // DEBUG

    const token = decodeURIComponent(req.params.token);

    console.log("📥 Decoded token:", token.substring(0, 20) + "..."); // DEBUG

    // Verify token
    const tokenData = await customerPortalLinkService.verifyPortalAccessToken(
      token
    );

    console.log("✅ Token verified, redirecting to login"); // DEBUG

    // Redirect to login page with token
    res.redirect(`/customer/login?token=${encodeURIComponent(token)}`);
  } catch (error) {
    console.error("❌ Portal access error:", error);
    res.status(400).render("customer/error", {
      message: error.message || "Invalid or expired portal access link",
      greeting: getGreeting(),
      currentDate: getCurrentDate(),
    });
  }
};

/**
 * Render customer login page (protected by token)
 * @route GET /customer/login?token=xxx
 */
const getLoginPage = (req, res) => {
  try {
    const token = req.query.token;

    // If already logged in, redirect to dashboard
    if (req.cookies.customerToken) {
      return res.redirect("/customer/dashboard");
    }

    // Token is required to access login page
    if (!token) {
      return res.status(403).render("customer/error", {
        message:
          "Portal access link required. Please use the link sent to your WhatsApp.",
        greeting: getGreeting(),
        currentDate: getCurrentDate(),
      });
    }

    // Verify token and extract username
    const jwt = require("jsonwebtoken");
    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res.status(401).render("customer/error", {
          message: "Portal access link has expired. Please request a new link.",
          greeting: getGreeting(),
          currentDate: getCurrentDate(),
        });
      }
      return res.status(401).render("customer/error", {
        message: "Invalid portal access link",
        greeting: getGreeting(),
        currentDate: getCurrentDate(),
      });
    }

    // Render login page with pre-filled username
    res.render("customer/login", {
      token: token,
      username: decoded.username,
      redirectTo: decoded.redirectTo || "/customer/dashboard",
      error: req.query.error || null,
      greeting: getGreeting(),
      currentDate: getCurrentDate(),
    });
  } catch (error) {
    console.error("Error rendering login page:", error);
    res.status(500).render("customer/error", {
      message: "Failed to load login page",
      greeting: getGreeting(),
      currentDate: getCurrentDate(),
    });
  }
};

/**
 * Handle customer login form submission
 * @route POST /customer/login
 */
const loginCustomer = async (req, res) => {
  try {
    const { username, password, token, redirectTo } = req.body;

    // Validate input
    if (!username || !password) {
      return res.redirect(
        `/customer/login?token=${encodeURIComponent(
          token
        )}&error=${encodeURIComponent("Please enter your password")}`
      );
    }

    // Verify the access token is still valid
    if (!token) {
      return res.redirect("/customer/login?error=Portal access token missing");
    }

    try {
      await customerPortalLinkService.verifyPortalAccessToken(token);
    } catch (error) {
      return res.status(401).render("customer/error", {
        message: error.message || "Invalid or expired portal access link",
        greeting: getGreeting(),
        currentDate: getCurrentDate(),
      });
    }

    // Authenticate customer
    const result = await customerPortalService.authenticateCustomer(
      username,
      password
    );

    // Set session cookie
    res.cookie("customerToken", result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Redirect to intended page or dashboard
    res.redirect(redirectTo || "/customer/dashboard");
  } catch (error) {
    console.error("Login error:", error);
    const token = req.body.token;
    res.redirect(
      `/customer/login?token=${encodeURIComponent(
        token
      )}&error=${encodeURIComponent(error.message)}`
    );
  }
};

// ============================================
// PROTECTED ROUTES (Auth Required)
// ============================================

/**
 * Render customer dashboard
 * @route GET /customer/dashboard
 */
const getDashboardPage = async (req, res) => {
  try {
    const customerId = req.customer._id;

    const dashboardData = await customerPortalService.getCustomerDashboard(
      customerId
    );

    res.render("customer/dashboard", {
      ...dashboardData,
      customer: req.customer,
      greeting: getGreeting(),
      currentDate: getCurrentDate(),
    });
  } catch (error) {
    console.error("Error rendering dashboard:", error);
    res.status(500).render("customer/error", {
      message: "Failed to load dashboard",
      greeting: getGreeting(),
      currentDate: getCurrentDate(),
    });
  }
};

/**
 * Render customer bookings list page
 * @route GET /customer/bookings
 */
const getBookingsPage = async (req, res) => {
  try {
    const customerId = req.customer._id;
    const page = parseInt(req.query.page) || 1;

    const result = await customerPortalService.getCustomerBookings(
      customerId,
      page,
      10
    );

    res.render("customer/bookings", {
      ...result,
      customer: req.customer,
      greeting: getGreeting(),
      currentDate: getCurrentDate(),
    });
  } catch (error) {
    console.error("Error rendering bookings page:", error);
    res.status(500).render("customer/error", {
      message: "Failed to load bookings",
      greeting: getGreeting(),
      currentDate: getCurrentDate(),
    });
  }
};

/**
 * Render single booking details page
 * @route GET /customer/bookings/:id
 */
const getBookingDetailsPage = async (req, res) => {
  try {
    const customerId = req.customer._id;
    const bookingId = req.params.id;

    const booking = await customerPortalService.getCustomerBookingById(
      customerId,
      bookingId
    );

    res.render("customer/booking-details", {
      booking,
      customer: req.customer,
      greeting: getGreeting(),
      currentDate: getCurrentDate(),
    });
  } catch (error) {
    console.error("Error rendering booking details:", error);
    res.status(404).render("customer/error", {
      message: error.message || "Booking not found",
      greeting: getGreeting(),
      currentDate: getCurrentDate(),
    });
  }
};

/**
 * Render customer invoices list page
 * @route GET /customer/invoices
 */
const getInvoicesPage = async (req, res) => {
  try {
    const customerId = req.customer._id;
    const page = parseInt(req.query.page) || 1;

    const result = await customerPortalService.getCustomerInvoices(
      customerId,
      page,
      10
    );

    res.render("customer/invoices", {
      ...result,
      customer: req.customer,
      greeting: getGreeting(),
      currentDate: getCurrentDate(),
    });
  } catch (error) {
    console.error("Error rendering invoices page:", error);
    res.status(500).render("customer/error", {
      message: "Failed to load invoices",
      greeting: getGreeting(),
      currentDate: getCurrentDate(),
    });
  }
};

/**
 * Render single invoice details page
 * @route GET /customer/invoices/:id
 */
const getInvoiceDetailsPage = async (req, res) => {
  try {
    const customerId = req.customer._id;
    const invoiceId = req.params.id;

    const invoice = await customerPortalService.getCustomerInvoiceById(
      customerId,
      invoiceId
    );

    res.render("customer/invoice-details", {
      invoice,
      customer: req.customer,
      greeting: getGreeting(),
      currentDate: getCurrentDate(),
    });
  } catch (error) {
    console.error("Error rendering invoice details:", error);
    res.status(404).render("customer/error", {
      message: error.message || "Invoice not found",
      greeting: getGreeting(),
      currentDate: getCurrentDate(),
    });
  }
};

/**
 * Handle customer logout
 * @route GET /customer/logout
 */
const logoutCustomer = (req, res) => {
  res.clearCookie("customerToken");
  res.render("customer/logout", {
    message: "You have been logged out successfully",
    greeting: getGreeting(),
    currentDate: getCurrentDate(),
  });
};

// ============================================
// API ROUTES
// ============================================

/**
 * Get customer bookings (API)
 * @route GET /api/customer/bookings
 */
const getBookingsAPI = async (req, res) => {
  try {
    const customerId = req.customer._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await customerPortalService.getCustomerBookings(
      customerId,
      page,
      limit
    );

    res.json({
      ok: true,
      data: result.bookings,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("Error fetching bookings API:", error);
    res.status(500).json({
      ok: false,
      message: "Failed to fetch bookings",
      error: error.message,
    });
  }
};

/**
 * Get single booking details (API)
 * @route GET /api/customer/bookings/:id
 */
const getBookingByIdAPI = async (req, res) => {
  try {
    const customerId = req.customer._id;
    const bookingId = req.params.id;

    const booking = await customerPortalService.getCustomerBookingById(
      customerId,
      bookingId
    );

    res.json({
      ok: true,
      data: booking,
    });
  } catch (error) {
    console.error("Error fetching booking API:", error);
    res.status(404).json({
      ok: false,
      message: error.message || "Booking not found",
    });
  }
};

/**
 * Get customer invoices (API)
 * @route GET /api/customer/invoices
 */
const getInvoicesAPI = async (req, res) => {
  try {
    const customerId = req.customer._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await customerPortalService.getCustomerInvoices(
      customerId,
      page,
      limit
    );

    res.json({
      ok: true,
      data: result.invoices,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("Error fetching invoices API:", error);
    res.status(500).json({
      ok: false,
      message: "Failed to fetch invoices",
      error: error.message,
    });
  }
};

/**
 * Get single invoice details (API)
 * @route GET /api/customer/invoices/:id
 */
const getInvoiceByIdAPI = async (req, res) => {
  try {
    const customerId = req.customer._id;
    const invoiceId = req.params.id;

    const invoice = await customerPortalService.getCustomerInvoiceById(
      customerId,
      invoiceId
    );

    res.json({
      ok: true,
      data: invoice,
    });
  } catch (error) {
    console.error("Error fetching invoice API:", error);
    res.status(404).json({
      ok: false,
      message: error.message || "Invoice not found",
    });
  }
};

/**
 * Download invoice PDF
 * @route GET /customer/invoices/:id/download
 */
const downloadInvoicePDF = async (req, res) => {
  try {
    const customerId = req.customer._id;
    const invoiceId = req.params.id;

    // Verify invoice belongs to customer
    const invoice = await Invoice.findOne({
      _id: invoiceId,
      customerId,
    });

    if (!invoice) {
      return res.status(404).json({
        ok: false,
        message: "Invoice not found",
      });
    }

    // Generate PDF
    const pdfBuffer = await invoicePdfService.generateInvoicePDF(invoiceId);

    // Set headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Invoice-${invoice.invoiceNumber}.pdf"`
    );
    res.setHeader("Content-Length", pdfBuffer.length);

    // Send PDF
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Download invoice error:", error);
    res.status(500).json({
      ok: false,
      message: "Failed to download invoice",
      error: error.message,
    });
  }
};

/**
 * Initiate Razorpay payment for invoice
 * @route POST /api/customer/invoices/:id/pay
 */
const initiatePayment = async (req, res) => {
  try {
    const customerId = req.customer._id;
    const invoiceId = req.params.id;
    const { amount } = req.body;

    // Verify invoice belongs to customer
    const invoice = await Invoice.findOne({
      _id: invoiceId,
      customerId,
    });

    if (!invoice) {
      return res.status(404).json({
        ok: false,
        message: "Invoice not found",
      });
    }

    // Validate amount
    if (!amount || amount <= 0) {
      return res.status(400).json({
        ok: false,
        message: "Invalid payment amount",
      });
    }

    if (amount > invoice.balanceDue) {
      return res.status(400).json({
        ok: false,
        message: "Payment amount exceeds balance due",
      });
    }

    // Create Razorpay order
    const Razorpay = require("razorpay");
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const order = await razorpay.orders.create({
      amount: amount * 100, // Amount in paise
      currency: "INR",
      receipt: `invoice_${invoice.invoiceNumber}`,
      notes: {
        invoiceId: invoice._id.toString(),
        customerId: customerId.toString(),
        invoiceNumber: invoice.invoiceNumber,
      },
    });

    res.json({
      ok: true,
      message: "Payment order created successfully",
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        key: process.env.RAZORPAY_KEY_ID,
        invoice: {
          id: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          balanceDue: invoice.balanceDue,
        },
      },
    });
  } catch (error) {
    console.error("Payment initiation error:", error);
    res.status(500).json({
      ok: false,
      message: "Failed to initiate payment",
      error: error.message,
    });
  }
};

/**
 * Verify Razorpay payment and update invoice
 * @route POST /api/customer/invoices/:id/verify-payment
 */
const verifyPayment = async (req, res) => {
  try {
    const customerId = req.customer._id;
    const invoiceId = req.params.id;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    console.log("🔍 Verifying payment for invoice:", invoiceId);

    // Verify invoice belongs to customer
    const invoice = await Invoice.findOne({
      _id: invoiceId,
      customerId,
    });

    if (!invoice) {
      return res.status(404).json({
        ok: false,
        message: "Invoice not found",
      });
    }

    console.log("📄 Invoice found:", invoice.invoiceNumber);
    console.log("📦 Linked booking:", invoice.bookingId);

    // Verify Razorpay signature
    const crypto = require("crypto");
    const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const generatedSignature = hmac.digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({
        ok: false,
        message: "Payment verification failed. Invalid signature",
      });
    }

    // Fetch payment details from Razorpay
    const Razorpay = require("razorpay");
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const payment = await razorpay.payments.fetch(razorpay_payment_id);
    console.log("💰 Payment amount:", payment.amount / 100);

    // Map payment method
    let paymentMethod = "UPI";
    if (payment.method === "card") paymentMethod = "Card";
    else if (payment.method === "netbanking") paymentMethod = "Bank Transfer";

    // Add payment to invoice
    invoice.payments.push({
      amount: payment.amount / 100,
      method: paymentMethod,
      paymentDate: new Date(),
      notes: `Razorpay Payment ID: ${razorpay_payment_id}`,
    });

    // Recalculate invoice totals
    invoice.amountPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
    invoice.balanceDue = invoice.totalAmount - invoice.amountPaid;

    if (invoice.balanceDue === 0) {
      invoice.status = "Paid";
    } else if (invoice.amountPaid > 0) {
      invoice.status = "Partially Paid";
    }

    await invoice.save();
    console.log(
      "✅ Invoice updated - Paid:",
      invoice.amountPaid,
      "Due:",
      invoice.balanceDue
    );

    // ✅ UPDATE BOOKING
    if (invoice.bookingId) {
      const Booking = require("../models/bookingModel");

      console.log("🔄 Updating booking:", invoice.bookingId);

      // Get booking
      const booking = await Booking.findById(invoice.bookingId);

      if (!booking) {
        console.log("❌ Booking not found!");
      } else {
        console.log("📦 Booking found:", booking.bookingCode);

        // Get ALL invoices for this booking
        const allInvoices = await Invoice.find({ bookingId: booking._id });
        console.log("📄 Total invoices for booking:", allInvoices.length);

        // Calculate totals across all invoices
        let totalInvoiced = 0;
        let totalPaid = 0;
        let totalDue = 0;

        allInvoices.forEach((inv) => {
          totalInvoiced += inv.totalAmount || 0;
          totalPaid += inv.amountPaid || 0;
          totalDue += inv.balanceDue || 0;
        });

        console.log(
          "💰 Booking totals - Invoiced:",
          totalInvoiced,
          "Paid:",
          totalPaid,
          "Due:",
          totalDue
        );

        // Update booking payment status
        const oldStatus = booking.paymentStatus;

        if (totalDue === 0 && totalPaid > 0) {
          booking.paymentStatus = "Paid";
        } else if (totalPaid > 0 && totalDue > 0) {
          booking.paymentStatus = "Partially Paid";
        } else {
          booking.paymentStatus = "Unpaid";
        }

        booking.balanceDue = totalDue;

        await booking.save();

        console.log(
          `✅ Booking updated: ${oldStatus} → ${booking.paymentStatus}, Balance: ₹${totalDue}`
        );
      }
    } else {
      console.log("⚠️ Invoice has no linked booking");
    }

    res.json({
      ok: true,
      message: "Payment verified and recorded successfully",
      data: {
        paymentId: razorpay_payment_id,
        amount: payment.amount / 100,
        invoice: {
          id: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          amountPaid: invoice.amountPaid,
          balanceDue: invoice.balanceDue,
          status: invoice.status,
        },
      },
    });
  } catch (error) {
    console.error("❌ Payment verification error:", error);
    res.status(500).json({
      ok: false,
      message: "Failed to verify payment",
      error: error.message,
    });
  }
};

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // Public routes
  handlePortalAccess,
  getLoginPage,
  loginCustomer,

  // Protected routes (pages)
  getDashboardPage,
  getBookingsPage,
  getBookingDetailsPage,
  getInvoicesPage,
  getInvoiceDetailsPage,
  logoutCustomer,

  // Protected routes (API)
  getBookingsAPI,
  getBookingByIdAPI,
  getInvoicesAPI,
  getInvoiceByIdAPI,
  downloadInvoicePDF,
  initiatePayment,
  verifyPayment,
};
