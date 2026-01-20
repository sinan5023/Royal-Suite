const express = require("express");
const router = express.Router();
const customerPortalController = require("../controller/customerPortalController");
const { authenticateCustomer, redirectIfAuthenticated } = require("../middlewares/customerAuth");

// ============================================
// PUBLIC ROUTES (No Authentication)
// ============================================

/**
 * Handle portal access via JWT token
 * Verifies token and redirects to login page
 * GET /customer/access/:token
 */
router.get("/access/:token", customerPortalController.handlePortalAccess);

/**
 * Customer login page (requires token in query string)
 * GET /customer/login?token=xxx
 */
router.get("/login", redirectIfAuthenticated, customerPortalController.getLoginPage);

/**
 * Handle login form submission
 * POST /customer/login
 */
router.post("/login", customerPortalController.loginCustomer);

/**
 * Logout
 * GET /customer/logout
 */
router.get("/logout", customerPortalController.logoutCustomer);

// ============================================
// PROTECTED PAGE ROUTES (Authentication Required)
// ============================================

/**
 * Customer Dashboard
 * GET /customer/dashboard
 */
router.get("/dashboard", authenticateCustomer, customerPortalController.getDashboardPage);

/**
 * Bookings List Page
 * GET /customer/bookings
 */
router.get("/bookings", authenticateCustomer, customerPortalController.getBookingsPage);

/**
 * Single Booking Details Page
 * GET /customer/bookings/:id
 */
router.get("/bookings/:id", authenticateCustomer, customerPortalController.getBookingDetailsPage);

/**
 * Invoices List Page
 * GET /customer/invoices
 */
router.get("/invoices", authenticateCustomer, customerPortalController.getInvoicesPage);

/**
 * Single Invoice Details Page
 * GET /customer/invoices/:id
 */
router.get("/invoices/:id", authenticateCustomer, customerPortalController.getInvoiceDetailsPage);

/**
 * Download Invoice PDF
 * GET /customer/invoices/:id/download
 */
router.get("/invoices/:id/download", authenticateCustomer, customerPortalController.downloadInvoicePDF);

module.exports = router;