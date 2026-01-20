const jwt = require("jsonwebtoken");
const Customer = require("../models/customerModel");

/**
 * Middleware to authenticate customer using JWT session token
 * Checks for valid session token in cookies
 * Attaches customer object to req.customer
 */
const authenticateCustomer = async (req, res, next) => {
  try {
    // Check for token in cookie or authorization header
    const token =
      req.cookies.customerToken ||
      req.headers.authorization?.split(" ")[1];

    if (!token) {
      // Check if it's an API request (AJAX/JSON)
      if (req.xhr || req.headers.accept?.includes("json")) {
        return res.status(401).json({
          ok: false,
          message: "Authentication required. Please login.",
        });
      }

      // For page requests, redirect to error page
      return res.status(401).render("customer/error", {
        message: "Please login to access the customer portal",
        greeting: getGreeting(),
        currentDate: getCurrentDate(),
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    );

    // Validate token type (must be session token, not access token)
    if (decoded.type !== "session") {
      res.clearCookie("customerToken");

      if (req.xhr || req.headers.accept?.includes("json")) {
        return res.status(401).json({
          ok: false,
          message: "Invalid session token",
        });
      }

      return res.status(401).render("customer/error", {
        message: "Invalid session. Please login again.",
        greeting: getGreeting(),
        currentDate: getCurrentDate(),
      });
    }

    // Find customer and verify account is active
    const customer = await Customer.findById(decoded.customerId).select(
      "fullName email primaryMobile customerCode portalCredentials"
    );

    if (!customer) {
      res.clearCookie("customerToken");

      if (req.xhr || req.headers.accept?.includes("json")) {
        return res.status(401).json({
          ok: false,
          message: "Customer not found",
        });
      }

      return res.status(401).render("customer/error", {
        message: "Customer account not found",
        greeting: getGreeting(),
        currentDate: getCurrentDate(),
      });
    }

    // Check if portal access is active
    if (!customer.portalCredentials?.isActive) {
      res.clearCookie("customerToken");

      if (req.xhr || req.headers.accept?.includes("json")) {
        return res.status(403).json({
          ok: false,
          message: "Portal access is disabled. Contact support.",
        });
      }

      return res.status(403).render("customer/error", {
        message: "Your portal access has been disabled. Please contact support.",
        greeting: getGreeting(),
        currentDate: getCurrentDate(),
      });
    }

    // Attach customer to request object
    req.customer = customer;
    next();
  } catch (error) {
    console.error("Customer authentication error:", error);
    res.clearCookie("customerToken");

    // Handle token expiry
    if (error.name === "TokenExpiredError") {
      if (req.xhr || req.headers.accept?.includes("json")) {
        return res.status(401).json({
          ok: false,
          message: "Session expired. Please login again.",
        });
      }

      return res.status(401).render("customer/error", {
        message: "Your session has expired. Please login again.",
        greeting: getGreeting(),
        currentDate: getCurrentDate(),
      });
    }

    // Handle invalid token
    if (error.name === "JsonWebTokenError") {
      if (req.xhr || req.headers.accept?.includes("json")) {
        return res.status(401).json({
          ok: false,
          message: "Invalid session token",
        });
      }

      return res.status(401).render("customer/error", {
        message: "Invalid session. Please login again.",
        greeting: getGreeting(),
        currentDate: getCurrentDate(),
      });
    }

    // Generic error
    if (req.xhr || req.headers.accept?.includes("json")) {
      return res.status(500).json({
        ok: false,
        message: "Authentication failed",
      });
    }

    return res.status(500).render("customer/error", {
      message: "Authentication failed. Please try again.",
      greeting: getGreeting(),
      currentDate: getCurrentDate(),
    });
  }
};

/**
 * Middleware to check if customer is already logged in
 * Redirects to dashboard if already authenticated
 * Used on login page to prevent re-login
 */
const redirectIfAuthenticated = async (req, res, next) => {
  try {
    const token = req.cookies.customerToken;

    if (!token) {
      return next();
    }

    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    );

    // Check if session token
    if (decoded.type === "session") {
      // Customer is already logged in
      return res.redirect("/customer/dashboard");
    }

    next();
  } catch (error) {
    // Token invalid or expired, continue to login
    res.clearCookie("customerToken");
    next();
  }
};

/**
 * Middleware to validate Razorpay credentials exist
 * Used on payment routes
 */
const validateRazorpayConfig = (req, res, next) => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.error("Razorpay credentials not configured");

    if (req.xhr || req.headers.accept?.includes("json")) {
      return res.status(500).json({
        ok: false,
        message: "Payment gateway not configured. Contact support.",
      });
    }

    return res.status(500).render("customer/error", {
      message: "Payment system is currently unavailable. Please contact support.",
      greeting: getGreeting(),
      currentDate: getCurrentDate(),
    });
  }

  next();
};

// Helper functions
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

module.exports = {
  authenticateCustomer,
  redirectIfAuthenticated,
  validateRazorpayConfig,
};
