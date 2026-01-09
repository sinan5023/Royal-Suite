const invoiceService = require("../services/invoiceService");
const Invoice = require("../models/invoiceModel");
const invoicePdfService = require("../services/invoicePdfService");
const jwt = require("jsonwebtoken");
const env = require("dotenv")
env.config()

// ===== PAGE RENDERING FUNCTIONS =====

/**
 * Render create invoice page
 * @route GET /invoices/new
 */
const getCreateInvoicePage = async (req, res) => {
  try {
    // Fetch confirmed/completed bookings without invoices
    const Booking = require("../models/bookingModel");
    const bookings = await Booking.find({
      bookingStatus: { $in: ["Confirmed", "Completed"] },
      invoiceId: { $exists: false },
    })
      .populate("customerId", "fullName name primaryMobile email")
      .select(
        "bookingCode customerId eventDate pickupDate totalAmount balanceDue"
      )
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    // Fetch all customers for standalone invoices
    const Customer = require("../models/customerModel");
    const customers = await Customer.find({
      status: { $ne: "blacklisted" },
    })
      .select("_id fullName name primaryMobile email")
      .sort({ name: 1 })
      .lean();

    res.render("createInvoice", {
      user: req.user || { name: "Guest", role: "User" },
      greeting: getGreeting(),
      currentDate: getCurrentDate(),
      bookings: bookings,
      customers: customers,
    });
  } catch (error) {
    console.error("Error rendering create invoice page:", error);
    res.status(500).render("pagenotfound", {
      message: "Failed to load create invoice page",
      error: error,
      user: req.user || { name: "Guest", role: "User" },
    });
  }
};

/**
 * Render invoices list page
 * @route GET /invoices
 */
const getInvoicesPage = async (req, res) => {
  try {
    res.render("invoiceDashboard", {
      user: req.user || { name: "Guest", role: "Viewer" },
      greeting: getGreeting(),
      currentDate: getCurrentDate(),
    });
  } catch (error) {
    console.error("Error rendering invoices page:", error);
    res.status(500).render("pagenotfound", {
      message: "Failed to load invoices page",
      error: error,
    });
  }
};

/**
 * Render single invoice view page
 * @route GET /invoices/:id
 */
const getViewInvoicePage = async (req, res) => {
  try {
    const invoiceId = req.params.id;
    const invoice = await invoiceService.getInvoiceById(invoiceId);

    res.render("viewInvoice", {
      invoice,
      user: req.user || { name: "Guest", role: "User" },
      greeting: getGreeting(),
      currentDate: getCurrentDate(),
    });
  } catch (error) {
    console.error("Error rendering invoice view:", error);
    res.status(500).render("pagenotfound", {
      message: "Failed to load invoice details",
      error: error.message,
      user: req.user || { name: "Guest", role: "User" },
    });
  }
};

/**
 * Render edit invoice page
 * @route GET /invoices/:id/edit
 */
const getEditInvoicePage = async (req, res) => {
  try {
    const invoiceId = req.params.id;
    const invoice = await invoiceService.getInvoiceById(invoiceId);

    if (invoice.status === "Paid") {
      return res.status(403).json({
        message: "Cannot edit paid invoices",
        user: req.user || { name: "Guest", role: "User" },
      });
    }

    res.render("editInvoice", {
      invoice,
      user: req.user || { name: "Guest", role: "User" },
      greeting: getGreeting(),
      currentDate: getCurrentDate(),
    });
  } catch (error) {
    console.error("Error rendering edit invoice page:", error);
    res.status(500).render("pagenotfound", {
      message: "Failed to load edit invoice page",
      error: error.message,
      user: req.user || { name: "Guest", role: "User" },
    });
  }
};

// ===== API FUNCTIONS =====

/**
 * Download invoice with secure token (public route)
 * @route GET /api/invoices/download/:token
 */
const downloadInvoiceWithToken = async (req, res) => {
  try {
    // ✅ Decode the token first
    const token = decodeURIComponent(req.params.token);
    
    console.log('🔐 Verifying token...');

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const decodedpayload = jwt.decode(token)

    console.log('✅ Token verified:', decoded.invoiceNumber);

    // Generate PDF
    const pdfBuffer = await invoicePdfService.generateInvoicePDF(decodedpayload.invoiceId);

    // Set headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Invoice-${decoded.invoiceNumber}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // Send PDF
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Invoice download error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).send('<h1>Link Expired</h1><p>This invoice download link has expired. Please request a new one.</p>');
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).send('<h1>Invalid Link</h1><p>This download link is invalid or has been tampered with.</p>');
    }

    res.status(500).send('<h1>Error</h1><p>Failed to download invoice. Please try again.</p>');
  }
};


/**
 * Send invoice via WhatsApp
 * POST /api/invoices/:id/send-whatsapp
 */
const sendInvoiceWhatsApp = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await invoiceService.sendInvoiceViaWhatsApp(id);

    res.json({
      ok: true,
      message: "WhatsApp link generated successfully",
      data: result,
    });
  } catch (error) {
    console.error("WhatsApp send error:", error);
    res.status(500).json({
      ok: false,
      message: error.message || "Failed to send invoice via WhatsApp",
    });
  }
};

/**
 * Check if invoice exists for booking
 * @route GET /api/bookings/:bookingId/invoice-check
 */
const checkInvoiceForBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const result = await invoiceService.checkInvoiceExists(bookingId);

    res.json({
      ok: true,
      exists: result.exists,
      invoice: result.invoice,
    });
  } catch (error) {
    console.error("Error checking invoice:", error);
    res.status(500).json({
      ok: false,
      message: "Failed to check invoice",
      error: error.message,
    });
  }
};

/**
 * Generate invoice from booking
 * @route POST /api/invoices/generate
 */
const generateInvoice = async (req, res) => {
  try {
    const { bookingId, paymentTerms, invoiceNotes, internalNotes } = req.body;

    if (!bookingId) {
      return res.status(400).json({
        ok: false,
        message: "Booking ID is required",
      });
    }

    const invoice = await invoiceService.generateInvoiceFromBooking(bookingId, {
      paymentTerms,
      invoiceNotes,
      internalNotes,
    });

    res.status(201).json({
      ok: true,
      message: "Invoice generated successfully",
      data: invoice,
    });
  } catch (error) {
    console.error("Error generating invoice:", error);
    res.status(500).json({
      ok: false,
      message: error.message || "Failed to generate invoice",
      error: error.message,
    });
  }
};

/**
 * Get all invoices with pagination
 * @route GET /api/invoices
 */
const getInvoices = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.q || "";
    const filters = {
      status: req.query.status,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };

    const result = await invoiceService.getInvoicesWithPagination(
      page,
      limit,
      search,
      filters
    );

    res.json({
      ok: true,
      data: result.data,
      pagination: result.pagination,
      message: "Invoices retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching invoices:", error);
    res.status(500).json({
      ok: false,
      message: "Failed to fetch invoices",
      error: error.message,
    });
  }
};

/**
 * Get single invoice by ID
 * @route GET /api/invoices/:id
 */
const getInvoiceById = async (req, res) => {
  try {
    const invoiceId = req.params.id;
    const invoice = await invoiceService.getInvoiceById(invoiceId);

    res.json({
      ok: true,
      data: invoice,
      message: "Invoice retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching invoice:", error);
    res.status(404).json({
      ok: false,
      message: error.message || "Failed to fetch invoice",
      error: error.message,
    });
  }
};

/**
 * Update invoice
 * @route PUT /api/invoices/:id
 */
const updateInvoice = async (req, res) => {
  try {
    const invoiceId = req.params.id;
    const updateData = req.body;

    const invoice = await invoiceService.updateInvoice(invoiceId, updateData);

    res.json({
      ok: true,
      message: "Invoice updated successfully",
      data: invoice,
    });
  } catch (error) {
    console.error("Error updating invoice:", error);
    res.status(500).json({
      ok: false,
      message: error.message || "Failed to update invoice",
      error: error.message,
    });
  }
};

/**
 * Record payment for invoice
 * @route POST /api/invoices/:id/payment
 */
const recordPayment = async (req, res) => {
  try {
    const invoiceId = req.params.id;
    const paymentData = req.body;

    if (!paymentData.amount || paymentData.amount <= 0) {
      return res.status(400).json({
        ok: false,
        message: "Invalid payment amount",
      });
    }

    if (!paymentData.method) {
      return res.status(400).json({
        ok: false,
        message: "Payment method is required",
      });
    }

    const invoice = await invoiceService.recordInvoicePayment(
      invoiceId,
      paymentData
    );

    res.json({
      ok: true,
      message: "Payment recorded successfully",
      data: invoice,
    });
  } catch (error) {
    console.error("Error recording payment:", error);
    res.status(500).json({
      ok: false,
      message: error.message || "Failed to record payment",
      error: error.message,
    });
  }
};

/**
 * Refund security deposit
 * @route POST /api/invoices/:id/refund-deposit
 */
const refundDeposit = async (req, res) => {
  try {
    const invoiceId = req.params.id;
    const refundData = req.body;

    if (!refundData.amount || refundData.amount <= 0) {
      return res.status(400).json({
        ok: false,
        message: "Invalid refund amount",
      });
    }

    const invoice = await invoiceService.refundSecurityDeposit(
      invoiceId,
      refundData
    );

    res.json({
      ok: true,
      message: "Security deposit refunded successfully",
      data: invoice,
    });
  } catch (error) {
    console.error("Error refunding deposit:", error);
    res.status(500).json({
      ok: false,
      message: error.message || "Failed to refund security deposit",
      error: error.message,
    });
  }
};

/**
 * Cancel invoice
 * @route DELETE /api/invoices/:id
 */
const cancelInvoice = async (req, res) => {
  try {
    const invoiceId = req.params.id;
    const { reason } = req.body;

    const invoice = await invoiceService.cancelInvoice(
      invoiceId,
      reason || "No reason provided"
    );

    res.json({
      ok: true,
      message: "Invoice cancelled successfully",
      data: invoice,
    });
  } catch (error) {
    console.error("Error cancelling invoice:", error);
    res.status(500).json({
      ok: false,
      message: error.message || "Failed to cancel invoice",
      error: error.message,
    });
  }
};

/**
 * Get invoice statistics
 * @route GET /api/invoices/stats
 */
const getInvoiceStats = async (req, res) => {
  try {
    const stats = await invoiceService.getInvoiceStats();

    res.json({
      ok: true,
      data: stats,
      message: "Statistics retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching invoice stats:", error);
    res.status(500).json({
      ok: false,
      message: "Failed to fetch statistics",
      error: error.message,
    });
  }
};

/**
 * Download invoice PDF directly by ID
 * @route GET /api/invoices/:id/download
 */
const downloadInvoiceById = async (req, res) => {
  try {
    console.log('📥 Download request received for invoice:', req.params.id);
    
    const { id } = req.params;

    // Validate invoice exists
    const invoice = await Invoice.findById(id);
    
    if (!invoice) {
      console.log('❌ Invoice not found');
      return res.status(404).json({
        ok: false,
        message: 'Invoice not found'
      });
    }

    console.log('✅ Invoice found:', invoice.invoiceNumber);
    console.log('🔄 Starting PDF generation...');

    // Generate PDF buffer using your existing service
    const pdfBuffer = await invoicePdfService.generateInvoicePDF(id);

    console.log('✅ PDF generated, buffer size:', pdfBuffer.length);

    // Set response headers for download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Invoice-${invoice.invoiceNumber}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    console.log('📤 Sending PDF to client...');
    
    // Send the buffer directly
    res.send(pdfBuffer);
    
    console.log('✅ PDF sent successfully');

  } catch (error) {
    console.error('❌ Download invoice error:', error);
    console.error('Error stack:', error.stack);
    
    // Check if headers already sent
    if (!res.headersSent) {
      res.status(500).json({
        ok: false,
        message: 'Failed to download invoice',
        error: error.message
      });
    }
  }
};


// ===== HELPER FUNCTIONS =====

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

// ===== EXPORTS =====

module.exports = {
  // Page rendering
  getInvoicesPage,
  getViewInvoicePage,
  getEditInvoicePage,
  getCreateInvoicePage,

  // API functions
  checkInvoiceForBooking,
  generateInvoice,
  getInvoices,
  getInvoiceById,
  updateInvoice,
  recordPayment,
  refundDeposit,
  cancelInvoice,
  getInvoiceStats,
  downloadInvoiceWithToken,
  sendInvoiceWhatsApp,
  downloadInvoiceById
};
