const express = require("express");
const router = express.Router();
const customerPortalController = require("../../controller/customerPortalController");
const { authenticateCustomer, validateRazorpayConfig } = require("../../middlewares/customerAuth");

// ============================================
// CUSTOMER API ROUTES (JSON Responses)
// ============================================

/**
 * Get customer bookings
 * GET /api/customer/bookings
 */
router.get("/bookings", authenticateCustomer, customerPortalController.getBookingsAPI);

/**
 * Get single booking by ID
 * GET /api/customer/bookings/:id
 */
router.get("/bookings/:id", authenticateCustomer, customerPortalController.getBookingByIdAPI);

/**
 * Get customer invoices
 * GET /api/customer/invoices
 */
router.get("/invoices", authenticateCustomer, customerPortalController.getInvoicesAPI);

/**
 * Get single invoice by ID
 * GET /api/customer/invoices/:id
 */
router.get("/invoices/:id", authenticateCustomer, customerPortalController.getInvoiceByIdAPI);

/**
 * Initiate Razorpay payment for invoice
 * POST /api/customer/invoices/:id/pay
 */
router.post(
  "/invoices/:id/pay",
  authenticateCustomer,
  validateRazorpayConfig,
  customerPortalController.initiatePayment
);

/**
 * Verify Razorpay payment
 * POST /api/customer/invoices/:id/verify-payment
 */
router.post(
  "/invoices/:id/verify-payment",
  authenticateCustomer,
  validateRazorpayConfig,
  customerPortalController.verifyPayment
);

module.exports = router;
