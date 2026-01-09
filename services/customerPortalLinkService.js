const jwt = require("jsonwebtoken");
const Customer = require("../models/customerModel");

/**
 * Generate customer portal access token
 * @param {String} customerId - Customer ID
 * @param {String} redirectTo - Path to redirect after login
 * @returns {Promise<Object>} Token and portal URL
 */
const generatePortalAccessToken = async (customerId, redirectTo = "/customer/dashboard") => {
  try {
    const customer = await Customer.findById(customerId)
      .select("fullName primaryMobile portalCredentials customerCode")
      .lean();

    if (!customer) {
      throw new Error("Customer not found");
    }

    if (!customer.portalCredentials?.isActive) {
      throw new Error("Customer portal access is disabled");
    }

    if (!customer.portalCredentials?.username) {
      throw new Error("Customer portal credentials not set");
    }

    // Create JWT token (7 days expiry, reusable)
    const payload = {
      customerId: customer._id.toString(),
      username: customer.portalCredentials.username,
      redirectTo: redirectTo,
      type: "portal_access",
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "7d" }
    );

    // Construct portal access URL
    const portalAccessUrl = `${process.env.BASE_URL}/customer/access/${encodeURIComponent(token)}`;

    return {
      success: true,
      token,
      portalAccessUrl,
      customer: {
        name: customer.fullName,
        username: customer.portalCredentials.username,
        customerCode: customer.customerCode,
      },
    };
  } catch (error) {
    console.error("Error generating portal access token:", error);
    throw error;
  }
};

/**
 * Generate WhatsApp link for portal access
 * @param {String} customerId - Customer ID
 * @returns {Promise<Object>} WhatsApp URL and message
 */
const generatePortalAccessWhatsAppLink = async (customerId) => {
  try {
    const customer = await Customer.findById(customerId)
      .select("fullName primaryMobile portalCredentials")
      .lean();

    if (!customer) {
      throw new Error("Customer not found");
    }

    if (!customer.primaryMobile) {
      throw new Error("Customer mobile number not found");
    }

    // Generate portal access link (redirects to dashboard)
    const { portalAccessUrl } = await generatePortalAccessToken(
      customerId,
      "/customer/dashboard"
    );

    // Check if first-time user
    const plainPassword = customer.portalCredentials.plainPassword;

    let message;

    if (plainPassword) {
      // First-time customer - include credentials
      message = `Hello ${customer.fullName},

Welcome to Royal Suite Customer Portal! 🎉

Access your portal to view bookings, invoices, and manage payments:

🔐 *Your Login Details:*
• Username: ${customer.portalCredentials.username}
• Password: ${plainPassword}

📱 *Access Portal:*
${portalAccessUrl}

*Note:* This link is valid for 7 days. Please change your password after first login.

For any queries, contact us.

Best regards,
Royal Suite Team`;
    } else {
      // Existing customer
      message = `Hello ${customer.fullName},

Access your Royal Suite Customer Portal:

📱 *Portal Link:*
${portalAccessUrl}

🔐 *Login with:*
Username: ${customer.portalCredentials.username}

*Link valid for 7 days*

For any queries, contact us.

Best regards,
Royal Suite Team`;
    }

    // Format mobile number for WhatsApp
    const cleanMobile = customer.primaryMobile.replace(/\D/g, "");
    const phoneNumber = cleanMobile.startsWith("91")
      ? cleanMobile
      : `91${cleanMobile}`;

    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

    return {
      success: true,
      whatsappUrl,
      portalAccessUrl,
      message,
    };
  } catch (error) {
    console.error("Error generating portal WhatsApp link:", error);
    throw error;
  }
};

/**
 * Generate WhatsApp link for invoice access
 * @param {String} customerId - Customer ID
 * @param {String} invoiceId - Invoice ID
 * @param {Object} invoiceData - Invoice details (invoiceNumber, totalAmount, dueDate)
 * @returns {Promise<Object>} WhatsApp URL and message
 */
const generateInvoiceAccessWhatsAppLink = async (customerId, invoiceId, invoiceData) => {
  try {
    const customer = await Customer.findById(customerId)
      .select("fullName primaryMobile portalCredentials")
      .lean();

    if (!customer) {
      throw new Error("Customer not found");
    }

    if (!customer.primaryMobile) {
      throw new Error("Customer mobile number not found");
    }

    // Generate portal access link (redirects to specific invoice)
    const { portalAccessUrl } = await generatePortalAccessToken(
      customerId,
      `/customer/invoices/${invoiceId}`
    );

    // Check if first-time user
    const plainPassword = customer.portalCredentials.plainPassword;

    let message;

    if (plainPassword) {
      // First-time customer
      message = `Hello ${customer.fullName},

Your invoice is ready! 📄

📋 *Invoice Details:*
• Invoice No: ${invoiceData.invoiceNumber}
• Amount: ₹${invoiceData.totalAmount?.toFixed(2)}
• Due Date: ${new Date(invoiceData.dueDate).toLocaleDateString("en-IN")}

🔐 *Portal Login (First Time):*
• Username: ${customer.portalCredentials.username}
• Password: ${plainPassword}

📱 *View Invoice:*
${portalAccessUrl}

View, download, and pay your invoice online through the portal.

*Link valid for 7 days*

Best regards,
Royal Suite Team`;
    } else {
      // Existing customer
      message = `Hello ${customer.fullName},

Your invoice is ready! 📄

📋 *Invoice Details:*
• Invoice No: ${invoiceData.invoiceNumber}
• Amount: ₹${invoiceData.totalAmount?.toFixed(2)}
• Due Date: ${new Date(invoiceData.dueDate).toLocaleDateString("en-IN")}

📱 *View Invoice:*
${portalAccessUrl}

Login: ${customer.portalCredentials.username}

View, download, and pay online through the portal.

*Link valid for 7 days*

Best regards,
Royal Suite Team`;
    }

    // Format mobile number for WhatsApp
    const cleanMobile = customer.primaryMobile.replace(/\D/g, "");
    const phoneNumber = cleanMobile.startsWith("91")
      ? cleanMobile
      : `91${cleanMobile}`;

    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

    return {
      success: true,
      whatsappUrl,
      portalAccessUrl,
      message,
    };
  } catch (error) {
    console.error("Error generating invoice WhatsApp link:", error);
    throw error;
  }
};

/**
 * Verify portal access token
 * @param {String} token - JWT token
 * @returns {Promise<Object>} Decoded token data
 */
const verifyPortalAccessToken = async (token) => {
  try {
    // Verify JWT token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    );

    // Validate token type
    if (decoded.type !== "portal_access") {
      throw new Error("Invalid token type");
    }

    // Verify customer still exists and is active
    const customer = await Customer.findById(decoded.customerId)
      .select("fullName portalCredentials")
      .lean();

    if (!customer) {
      throw new Error("Customer not found");
    }

    if (!customer.portalCredentials?.isActive) {
      throw new Error("Portal access is disabled");
    }

    return {
      valid: true,
      customerId: decoded.customerId,
      username: decoded.username,
      redirectTo: decoded.redirectTo || "/customer/dashboard",
    };
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new Error("Portal access link has expired. Please request a new link.");
    }
    if (error.name === "JsonWebTokenError") {
      throw new Error("Invalid portal access link");
    }
    throw error;
  }
};

module.exports = {
  generatePortalAccessToken,
  generatePortalAccessWhatsAppLink,
  generateInvoiceAccessWhatsAppLink,
  verifyPortalAccessToken,
};
