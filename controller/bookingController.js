const Booking = require("../models/bookingModel");
const Customer = require("../models/customerModel");
const Product = require("../models/productModel");
const bookingServices = require("../services/bookingService");
const checkInvoiceBeforeEdit = require("../middlewares/bookingcheck")
const mongoose = require("mongoose");

// ============================================
// PAGE RENDERING FUNCTIONS
// ============================================

/**
 * Render bookings list page
 * @route GET /bookings
 */
const getBookingsPage = async (req, res) => {
  try {
    res.render("bookingDashboard", {
      user: req.user || { name: "Guest", role: "Viewer" },
      greeting: getGreeting(),
      currentDate: getCurrentDate(),
    });
  } catch (error) {
    console.error("Error rendering bookings page:", error);
    res.status(500).render("pagenotfound", {
      message: "Failed to load bookings page",
      error: error,
    });
  }
};

/**
 * Render create booking page
 * @route GET /bookings/new
 */
const getCreateBookingPage = async (req, res) => {
  try {
    // Fetch all active customers for dropdown
    const customers = await Customer.find({
      status: { $ne: "blacklisted" },
    })
      .select("_id name primaryMobile email")
      .sort({ name: 1 })
      .lean();

    res.render("addBooking", {
      user: req.user || { name: "Guest", role: "Viewer" },
      greeting: getGreeting(),
      currentDate: getCurrentDate(),
      customers: customers,
    });
  } catch (error) {
    console.error("Error rendering create booking page:", error);
    res.status(500).render("pagenotfound", {
      message: "Failed to load create booking page",
      error: error,
    });
  }
};

/**
 * Render view single booking page
 * @route GET /bookings/:id
 */
const getViewBookingPage = async (req, res) => {
  try {
    const bookingId = req.params.id;

    const booking = await Booking.findById(bookingId)
      .populate(
        "customerId",
        "fullName name email primaryMobile secondaryMobile address city state pincode"
      )
      .populate(
        "items.productId",
        "displayName sku photos baseRent securityDeposit"
      )
      .lean();

    if (!booking) {
      return res.status(404).render("pagenotfound", {
        message: "Booking not found",
        user: req.user || { name: "Guest", role: "User" },
      });
    }

    // ✅ Calculate rental days
    const pickup = new Date(booking.pickupDate);
    const returnDate = new Date(booking.expectedReturnDate);
    const rentalDays =
      Math.ceil((returnDate - pickup) / (1000 * 60 * 60 * 24)) || 1;

    booking.rentalDays = rentalDays;

    // ✅ Calculate discount amount for display
    let discountAmount = 0;
    if (booking.discountType === "Percentage") {
      discountAmount = (booking.subtotal * (booking.discountValue || 0)) / 100;
    } else if (
      booking.discountType === "Fixed Amount" ||
      booking.discountType === "Promotional Code"
    ) {
      discountAmount = booking.discountValue || 0;
    }

    booking.discountAmount = discountAmount;
    booking.taxableAmount = booking.subtotal - discountAmount;

    // ✅ Ensure all financial values exist (use saved values, don't recalculate)
    booking.subtotal = booking.subtotal || 0;
    booking.taxAmount = booking.taxAmount || 0;
    booking.totalAmount = booking.totalAmount || 0;
    booking.balanceDue = booking.balanceDue || 0;
    booking.securityDeposit = booking.securityDeposit || 0;
    booking.amountPaid = booking.amountPaid || 0;

    console.log("📦 View Booking Data:", {
      rentalDays,
      subtotal: booking.subtotal,
      discountAmount,
      taxableAmount: booking.taxableAmount,
      taxAmount: booking.taxAmount,
      securityDeposit: booking.securityDeposit,
      totalAmount: booking.totalAmount,
      amountPaid: booking.amountPaid,
      balanceDue: booking.balanceDue,
    });

    // Helper data
    const currentDate = new Date().toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const hour = new Date().getHours();
    let greeting = "Good Morning";
    if (hour >= 12 && hour < 17) greeting = "Good Afternoon";
    else if (hour >= 17) greeting = "Good Evening";

    res.render("viewBooking", {
      booking,
      user: req.user || { name: "Admin", role: "Administrator" },
      currentDate,
      greeting,
    });
  } catch (error) {
    console.error("❌ Error rendering booking view:", error);
    res.status(500).render("pagenotfound", {
      message: "Failed to load booking details",
      error: error.message,
      user: req.user || { name: "Guest", role: "User" },
    });
  }
};

/**
 * Render edit booking page
 * @route GET /bookings/:id/edit
 */
const getEditBookingPage = async (req, res) => {
  try {
    const bookingId = req.params.id;

    const booking = await Booking.findById(bookingId)
      .populate("customerId")
      .populate("items.productId")
      .lean();

    if (!booking) {
      return res.status(404).render("pagenotfound", {
        user: req.user || { name: "Guest", role: "Viewer" },
        greeting: getGreeting(),
        currentDate: getCurrentDate(),
        message: "Booking not found",
        error: { status: 404 },
      });
    }

    // ✅ Calculate rental days for edit page
    const pickup = new Date(booking.pickupDate);
    const returnDate = new Date(booking.expectedReturnDate);
    const rentalDays =
      Math.ceil((returnDate - pickup) / (1000 * 60 * 60 * 24)) || 1;

    booking.rentalDays = rentalDays;

    // ✅ Calculate discount amount
    let discountAmount = 0;
    if (booking.discountType === "Percentage") {
      discountAmount = (booking.subtotal * (booking.discountValue || 0)) / 100;
    } else if (
      booking.discountType === "Fixed Amount" ||
      booking.discountType === "Promotional Code"
    ) {
      discountAmount = booking.discountValue || 0;
    }

    booking.discountAmount = discountAmount;
    booking.taxableAmount = booking.subtotal - discountAmount;

    console.log("✏️ Edit Booking Data:", {
      bookingId,
      rentalDays,
      subtotal: booking.subtotal,
      discountAmount,
      taxableAmount: booking.taxableAmount,
      taxAmount: booking.taxAmount,
      securityDeposit: booking.securityDeposit,
      totalAmount: booking.totalAmount,
      amountPaid: booking.amountPaid,
      balanceDue: booking.balanceDue,
    });

    // Fetch all customers for dropdown
    const customers = await Customer.find({
      status: { $ne: "blacklisted" },
    })
      .select("_id fullName name primaryMobile email")
      .sort({ name: 1 })
      .lean();

    res.render("editBooking", {
      user: req.user || { name: "Guest", role: "Viewer" },
      greeting: getGreeting(),
      currentDate: getCurrentDate(),
      booking: booking,
      customers: customers,
    });
  } catch (error) {
    console.error("Error rendering edit booking page:", error);
    res.status(500).render("pagenotfound", {
      user: req.user || { name: "Guest", role: "Viewer" },
      greeting: getGreeting(),
      currentDate: getCurrentDate(),
      message: "Failed to load edit booking page",
      error: error,
    });
  }
};

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Get all bookings with pagination (AJAX endpoint)
 * @route GET /api/bookings
 */
const getBookings = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.q || "";

    const result = await bookingServices.getBookingsWithPagination(
      page,
      limit,
      search
    );

    res.json({
      ok: true,
      data: result.data,
      pagination: result.pagination,
      message: "Bookings retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({
      ok: false,
      message: "Failed to fetch bookings",
      error: error.message,
    });
  }
};

/**
 * Get available products for date range
 * @route GET /api/bookings/available-products
 */
const getAvailableProducts = async (req, res) => {
  try {
    const { pickupDate, returnDate, excludeBooking } = req.query;

    if (!pickupDate || !returnDate) {
      return res.status(400).json({
        ok: false,
        message: "Pickup date and return date are required",
      });
    }

    const requestPickup = new Date(pickupDate);
    const requestReturn = new Date(returnDate);

    console.log("Fetching available products:", {
      pickupDate,
      returnDate,
      excludeBooking,
    });

    // Build query to find overlapping bookings
    const bookingQuery = {
      bookingStatus: { $nin: ["Cancelled", "Completed"] },
      pickupDate: { $lte: requestReturn },
      expectedReturnDate: { $gte: requestPickup },
    };

    if (excludeBooking) {
      bookingQuery._id = { $ne: excludeBooking };
    }

    // Get overlapping bookings
    const overlappingBookings = await Booking.find(bookingQuery)
      .select("items")
      .lean();

    console.log("Overlapping bookings found:", overlappingBookings.length);

    // Calculate booked quantities per product
    const bookedQuantities = {};

    overlappingBookings.forEach((booking) => {
      if (booking.items && Array.isArray(booking.items)) {
        booking.items.forEach((item) => {
          const productId = (item.productId?._id || item.productId).toString();
          bookedQuantities[productId] =
            (bookedQuantities[productId] || 0) + (item.quantity || 1);
        });
      }
    });

    console.log("Booked quantities:", bookedQuantities);

    // Get currently booked products if editing
    let currentlyBookedQuantities = {};
    if (excludeBooking) {
      const currentBooking = await Booking.findById(excludeBooking)
        .select("items")
        .lean();

      if (currentBooking && currentBooking.items) {
        currentBooking.items.forEach((item) => {
          const productId = (item.productId?._id || item.productId).toString();
          currentlyBookedQuantities[productId] = item.quantity || 1;
        });
      }
    }

    console.log("Currently booked quantities:", currentlyBookedQuantities);

    // Get all available products
    const allProducts = await Product.find({
      status: "available",
      isRetired: false,
    })
      .select(
        "sku displayName photos baseRent securityDeposit quantityInStock category size color"
      )
      .lean();

    console.log("Total products found:", allProducts.length);

    // Calculate availability for each product
    const productsWithAvailability = allProducts.map((product) => {
      const productId = product._id.toString();
      const totalStock = product.quantityInStock || 1;
      const bookedByOthers = bookedQuantities[productId] || 0;
      const currentlyBooked = currentlyBookedQuantities[productId] || 0;

      // Available = Total Stock - Booked by Others + Currently Booked (if editing)
      const availableQuantity = totalStock - bookedByOthers + currentlyBooked;

      return {
        ...product,
        availableQuantity: Math.max(0, availableQuantity),
        totalStock,
        isAvailable: availableQuantity > 0,
      };
    });

    // Filter out products with no availability
    const availableProducts = productsWithAvailability.filter(
      (p) => p.isAvailable
    );

    console.log("Available products:", availableProducts.length);

    res.json({
      ok: true,
      data: availableProducts,
      message: `Found ${availableProducts.length} available products`,
    });
  } catch (error) {
    console.error("Error fetching available products:", error);
    res.status(500).json({
      ok: false,
      message: "Failed to fetch available products",
      error: error.message,
    });
  }
};

/**
 * Validate product quantities before booking
 */
const validateProductQuantities = async (
  items,
  pickupDate,
  returnDate,
  excludeBookingId = null
) => {
  const errors = [];

  for (const item of items) {
    const product = await Product.findById(item.productId);

    if (!product) {
      errors.push({
        productId: item.productId,
        message: `Product not found`,
      });
      continue;
    }

    // Check if quantity exceeds total stock
    const totalStock = product.quantityInStock || 1;
    if (item.quantity > totalStock) {
      errors.push({
        productId: item.productId,
        productName: product.displayName,
        message: `Only ${totalStock} unit(s) in stock. You requested ${item.quantity}.`,
      });
      continue;
    }

    // Check availability for the date range
    const requestPickup = new Date(pickupDate);
    const requestReturn = new Date(returnDate);

    const bookingQuery = {
      bookingStatus: { $nin: ["Cancelled", "Completed"] },
      pickupDate: { $lte: requestReturn },
      expectedReturnDate: { $gte: requestPickup },
      "items.productId": item.productId,
    };

    if (excludeBookingId) {
      bookingQuery._id = { $ne: excludeBookingId };
    }

    const overlappingBookings = await Booking.find(bookingQuery)
      .select("items")
      .lean();

    // Calculate booked quantity
    let bookedQuantity = 0;
    overlappingBookings.forEach((booking) => {
      booking.items.forEach((bookedItem) => {
        if (bookedItem.productId.toString() === item.productId.toString()) {
          bookedQuantity += bookedItem.quantity || 1;
        }
      });
    });

    const availableQuantity = totalStock - bookedQuantity;

    if (item.quantity > availableQuantity) {
      errors.push({
        productId: item.productId,
        productName: product.displayName,
        message: `Only ${availableQuantity} unit(s) available for selected dates. You requested ${item.quantity}.`,
      });
    }
  }

  return errors;
};

/**
 * Search customers for Select2 dropdown
 * @route GET /api/customers/search
 */
const searchCustomers = async (req, res) => {
  try {
    const { q = "", page = 1, limit = 20 } = req.query;

    const query = {};

    // Search by name, mobile, or email
    if (q) {
      query.$or = [
        { name: new RegExp(q, "i") },
        { primaryMobile: new RegExp(q, "i") },
        { email: new RegExp(q, "i") },
        { code: new RegExp(q, "i") },
      ];
    }

    // Exclude blacklisted customers
    query.status = { $ne: "blacklisted" };

    const total = await Customer.countDocuments(query);
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const customers = await Customer.find(query)
      .select("_id name primaryMobile email code")
      .sort({ name: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    res.json({
      ok: true,
      data: customers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error searching customers:", error);
    res.status(500).json({
      ok: false,
      message: "Failed to search customers",
      error: error.message,
    });
  }
};

/**
 * Create new booking with quantity validation
 * @route POST /api/bookings
 */
const createBooking = async (req, res) => {
  try {
    const bookingData = req.body;

    console.log(
      "📥 Received booking data:",
      JSON.stringify(bookingData, null, 2)
    );

    // Validate product quantities
    const validationErrors = await validateProductQuantities(
      bookingData.items,
      bookingData.pickupDate,
      bookingData.expectedReturnDate
    );

    if (validationErrors.length > 0) {
      return res.status(400).json({
        ok: false,
        message: "Insufficient stock for some products",
        errors: validationErrors,
      });
    }

    // ✅ Calculate rental days
    const pickup = new Date(bookingData.pickupDate);
    const returnDate = new Date(bookingData.expectedReturnDate);
    const days = Math.ceil((returnDate - pickup) / (1000 * 60 * 60 * 24)) || 1;

    console.log("📅 Rental days:", days);

    // ✅ Calculate subtotal and enrich items with product details
    let subtotal = 0;
    let totalSecurityDeposit = 0;

    for (let item of bookingData.items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({
          ok: false,
          message: `Product ${item.productId} not found`,
        });
      }

      // Enrich item data
      item.productName = item.productName || product.displayName;
      item.sku = item.sku || product.sku;
      item.rentalPrice = item.rentalPrice || product.baseRent;
      item.securityDeposit = product.securityDeposit || 0;

      // Calculate subtotal
      subtotal += item.rentalPrice * item.quantity * days;
      totalSecurityDeposit += item.securityDeposit * item.quantity;
    }

    console.log("💰 Calculated subtotal:", subtotal);
    console.log("🔒 Total security deposit:", totalSecurityDeposit);

    // ✅ Calculate discount
    let discountAmount = 0;
    const discountType = bookingData.discountType || "None";
    const discountValue = parseFloat(bookingData.discountValue) || 0;

    if (discountType === "Percentage") {
      discountAmount = (subtotal * discountValue) / 100;
    } else if (
      discountType === "Fixed Amount" ||
      discountType === "Promotional Code"
    ) {
      discountAmount = discountValue;
    }

    console.log("🎫 Discount amount:", discountAmount);

    // ✅ Calculate tax
    const taxableAmount = subtotal - discountAmount;
    const taxRate = parseFloat(bookingData.taxRate) || 18;
    const taxAmount = (taxableAmount * taxRate) / 100;

    console.log("💵 Taxable amount:", taxableAmount);
    console.log("📊 Tax amount:", taxAmount);

    // ✅ Use provided security deposit or calculated one
    const securityDeposit =
      parseFloat(bookingData.securityDeposit) || totalSecurityDeposit;

    // ✅ Calculate total
    const totalAmount = taxableAmount + taxAmount + securityDeposit;
    const amountPaid = parseFloat(bookingData.amountPaid) || 0;
    const balanceDue = totalAmount - amountPaid;

    console.log("💸 Total amount:", totalAmount);
    console.log("💳 Amount paid:", amountPaid);
    console.log("⚖️ Balance due:", balanceDue);

    // ✅ Determine payment status
    let paymentStatus = "Unpaid";
    if (balanceDue <= 0) {
      paymentStatus = "Paid";
    } else if (amountPaid > 0) {
      paymentStatus = "Partially Paid";
    }

    console.log("✅ Payment status:", paymentStatus);

    // ✅ Generate booking code
    const lastBooking = await Booking.findOne().sort({ createdAt: -1 });
    let bookingNumber = 1;
    if (lastBooking && lastBooking.bookingCode) {
      const lastNumber = parseInt(lastBooking.bookingCode.split("-")[1]);
      bookingNumber = lastNumber + 1;
    }
    const bookingCode = `BK-${String(bookingNumber).padStart(6, "0")}`;

    // ✅ Prepare final booking data with calculated values
    const finalBookingData = {
      ...bookingData,
      bookingCode,
      items: bookingData.items, // Already enriched above
      subtotal,
      discountType,
      discountValue,
      taxRate,
      taxAmount,
      securityDeposit,
      totalAmount,
      amountPaid,
      balanceDue,
      paymentStatus,
    };

    console.log(
      "💾 Final booking data:",
      JSON.stringify(finalBookingData, null, 2)
    );

    // ✅ Create booking
    const booking = new Booking(finalBookingData);
    await booking.save();

    console.log("✅ Booking saved with ID:", booking._id);

    // ✅ Populate references
    await booking.populate("customerId", "fullName name email primaryMobile");
    await booking.populate(
      "items.productId",
      "displayName sku photos baseRent securityDeposit"
    );

    console.log("📤 Sending response");

    res.status(201).json({
      ok: true,
      message: "Booking created successfully",
      data: booking,
    });
  } catch (error) {
    console.error("❌ Error creating booking:", error);
    res.status(500).json({
      ok: false,
      message: "Failed to create booking",
      error: error.message,
    });
  }
};

/**
 * Get single booking by ID
 * @route GET /api/bookings/:id
 */
/**
 * Get single booking by ID
 * @route GET /api/bookings/:id
 */
const getBookingById = async (req, res) => {
  try {
    const bookingId = req.params.id;

    const booking = await Booking.findById(bookingId)
      .populate(
        "customerId",
        "fullName name email primaryMobile secondaryMobile address city state pincode"
      )
      .populate(
        "items.productId",
        "displayName sku photos baseRent securityDeposit quantityInStock"
      )
      .lean();

    if (!booking) {
      return res.status(404).json({
        ok: false,
        message: "Booking not found",
      });
    }

    // ✅ Recalculate values if missing (for old bookings)
    if (!booking.subtotal || !booking.totalAmount) {
      const pickup = new Date(booking.pickupDate);
      const returnDate = new Date(booking.expectedReturnDate);
      const days =
        Math.ceil((returnDate - pickup) / (1000 * 60 * 60 * 24)) || 1;

      let subtotal = 0;
      booking.items.forEach((item) => {
        subtotal += (item.rentalPrice || 0) * (item.quantity || 1) * days;
      });

      let discountAmount = 0;
      if (booking.discountType === "Percentage") {
        discountAmount = (subtotal * (booking.discountValue || 0)) / 100;
      } else if (
        booking.discountType === "Fixed Amount" ||
        booking.discountType === "Promotional Code"
      ) {
        discountAmount = booking.discountValue || 0;
      }

      const taxableAmount = subtotal - discountAmount;
      const taxAmount = (taxableAmount * (booking.taxRate || 18)) / 100;
      const totalAmount =
        taxableAmount + taxAmount + (booking.securityDeposit || 0);
      const balanceDue = totalAmount - (booking.amountPaid || 0);

      booking.subtotal = subtotal;
      booking.taxAmount = taxAmount;
      booking.totalAmount = totalAmount;
      booking.balanceDue = balanceDue;
      booking.rentalDays = days;
    } else {
      // Calculate rental days for display
      const pickup = new Date(booking.pickupDate);
      const returnDate = new Date(booking.expectedReturnDate);
      booking.rentalDays =
        Math.ceil((returnDate - pickup) / (1000 * 60 * 60 * 24)) || 1;
    }

    console.log("📦 Booking details:", JSON.stringify(booking, null, 2));

    res.json({
      ok: true,
      data: booking,
    });
  } catch (error) {
    console.error("❌ Error fetching booking:", error);
    res.status(500).json({
      ok: false,
      message: "Failed to fetch booking",
      error: error.message,
    });
  }
};

/**
 * Update booking with quantity validation
 * @route PUT /api/bookings/:id
 */
const updateBooking = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const updateData = req.body;

    console.log(
      "📝 Update booking request:",
      JSON.stringify(updateData, null, 2)
    );

    // Get current booking data
    const currentBooking = await Booking.findById(bookingId);
    if (!currentBooking) {
      return res.status(404).json({
        ok: false,
        message: "Booking not found",
      });
    }

    // Validate quantities if items are being updated
    if (updateData.items) {
      const pickupDate = updateData.pickupDate || currentBooking.pickupDate;
      const returnDate =
        updateData.expectedReturnDate || currentBooking.expectedReturnDate;

      const validationErrors = await validateProductQuantities(
        updateData.items,
        pickupDate,
        returnDate,
        bookingId
      );

      if (validationErrors.length > 0) {
        return res.status(400).json({
          ok: false,
          message: "Insufficient stock for some products",
          errors: validationErrors,
        });
      }

      // ✅ Calculate rental days
      const pickup = new Date(pickupDate);
      const returnD = new Date(returnDate);
      const days = Math.ceil((returnD - pickup) / (1000 * 60 * 60 * 24)) || 1;

      // ✅ Enrich items and calculate subtotal
      let subtotal = 0;
      let totalSecurityDeposit = 0;

      for (let item of updateData.items) {
        const product = await Product.findById(item.productId);
        if (!product) {
          return res.status(404).json({
            ok: false,
            message: `Product ${item.productId} not found`,
          });
        }

        item.productName = item.productName || product.displayName;
        item.sku = item.sku || product.sku;
        item.rentalPrice = item.rentalPrice || product.baseRent;
        item.securityDeposit = product.securityDeposit || 0;

        subtotal += item.rentalPrice * item.quantity * days;
        totalSecurityDeposit += item.securityDeposit * item.quantity;
      }

      // ✅ Calculate discount
      let discountAmount = 0;
      const discountType =
        updateData.discountType || currentBooking.discountType || "None";
      const discountValue =
        parseFloat(updateData.discountValue) ||
        currentBooking.discountValue ||
        0;

      if (discountType === "Percentage") {
        discountAmount = (subtotal * discountValue) / 100;
      } else if (
        discountType === "Fixed Amount" ||
        discountType === "Promotional Code"
      ) {
        discountAmount = discountValue;
      }

      // ✅ Calculate tax
      const taxableAmount = subtotal - discountAmount;
      const taxRate =
        parseFloat(updateData.taxRate) || currentBooking.taxRate || 18;
      const taxAmount = (taxableAmount * taxRate) / 100;

      // ✅ Security deposit
      const securityDeposit =
        parseFloat(updateData.securityDeposit) || totalSecurityDeposit;

      // ✅ Calculate totals
      const totalAmount = taxableAmount + taxAmount + securityDeposit;
      const amountPaid =
        parseFloat(updateData.amountPaid) || currentBooking.amountPaid || 0;
      const balanceDue = totalAmount - amountPaid;

      // ✅ Determine payment status
      let paymentStatus = "Unpaid";
      if (balanceDue <= 0) {
        paymentStatus = "Paid";
      } else if (amountPaid > 0) {
        paymentStatus = "Partially Paid";
      }

      // ✅ Add calculated values to update data
      updateData.subtotal = subtotal;
      updateData.taxAmount = taxAmount;
      updateData.securityDeposit = securityDeposit;
      updateData.totalAmount = totalAmount;
      updateData.balanceDue = balanceDue;
      updateData.paymentStatus = paymentStatus;

      console.log("💰 Calculated update values:", {
        days,
        subtotal,
        discountAmount,
        taxableAmount,
        taxAmount,
        securityDeposit,
        totalAmount,
        amountPaid,
        balanceDue,
        paymentStatus,
      });
    }

    // ✅ Update booking (skip pre-save calculations)
    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      { $set: updateData },
      {
        new: true,
        runValidators: true,
        // Skip pre-save hooks since we calculated manually
      }
    )
      .populate("customerId", "fullName primaryMobile email")
      .populate("items.productId", "displayName sku photos");

    console.log("✅ Booking updated successfully");

    res.json({
      ok: true,
      message: "Booking updated successfully",
      data: booking,
    });
  } catch (error) {
    console.error("❌ Error updating booking:", error);
    res.status(500).json({
      ok: false,
      message: "Failed to update booking",
      error: error.message,
    });
  }
};

/**
 * Delete booking
 * @route DELETE /api/bookings/:id
 */
const deleteBooking = async (req, res) => {
  try {
    const bookingId = req.params.id;

    const booking = await Booking.findByIdAndDelete(bookingId);

    if (!booking) {
      return res.status(404).json({
        ok: false,
        message: "Booking not found",
      });
    }

    res.json({
      ok: true,
      message: "Booking deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting booking:", error);
    res.status(500).json({
      ok: false,
      message: "Failed to delete booking",
      error: error.message,
    });
  }
};

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

/**
 * Mark booking as picked up
 * @route PUT /api/bookings/:id/pickup
 */
const markBookingPickedUp = async (req, res) => {
  try {
    const bookingId = req.params.id;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        ok: false,
        message: "Booking not found",
      });
    }

    if (booking.bookingStatus !== "Confirmed") {
      return res.status(400).json({
        ok: false,
        message: "Only confirmed bookings can be marked as picked up",
      });
    }

    booking.pickupStatus = "Picked Up";
    await booking.save();

    res.json({
      ok: true,
      message: "Booking marked as picked up successfully",
      data: booking,
    });
  } catch (error) {
    console.error("Error marking booking as picked up:", error);
    res.status(500).json({
      ok: false,
      message: "Failed to update pickup status",
      error: error.message,
    });
  }
};

/**
 * Mark booking as returned with security deposit handling
 * @route PUT /api/bookings/:id/return
 */
const markBookingReturned = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const { securityDepositReturned, refundMethod, damageNotes } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        ok: false,
        message: "Booking not found",
      });
    }

    if (booking.pickupStatus !== "Picked Up") {
      return res.status(400).json({
        ok: false,
        message: "Booking must be picked up before it can be returned",
      });
    }

    booking.actualReturnDate = new Date();
    booking.returnStatus = "Returned";
    booking.bookingStatus = "Completed";

    // Calculate late fees if overdue
    const expectedReturn = new Date(booking.expectedReturnDate);
    const actualReturn = new Date(booking.actualReturnDate);

    let lateFee = 0;
    if (actualReturn > expectedReturn) {
      const daysLate = Math.ceil(
        (actualReturn - expectedReturn) / (1000 * 60 * 60 * 24)
      );

      // Calculate late fee (example: 50% of daily rate per day late)
      booking.items.forEach((item) => {
        lateFee += item.rentalPrice * 0.5 * item.quantity * daysLate;
      });

      booking.totalAmount += lateFee;
      booking.balanceDue += lateFee;

      booking.internalNotes =
        (booking.internalNotes || "") +
        `\n[${new Date().toISOString()}] Late Return: ${daysLate} day(s) late. Late fee: ₹${lateFee}`;
    }

    // Handle security deposit
    if (securityDepositReturned !== undefined) {
      const depositAmount = parseFloat(securityDepositReturned);

      // Validate refund amount
      if (depositAmount > booking.securityDeposit) {
        return res.status(400).json({
          ok: false,
          message: `Refund amount (₹${depositAmount}) cannot exceed security deposit (₹${booking.securityDeposit})`,
        });
      }

      // Store refund information
      booking.securityDepositRefunded = depositAmount;
      booking.securityDepositRefundMethod = refundMethod || "Cash";
      booking.securityDepositRefundDate = new Date();

      // Add to internal notes
      let refundNote = `\n[${new Date().toISOString()}] Security Deposit Refunded: ₹${depositAmount} via ${refundMethod}`;

      if (depositAmount < booking.securityDeposit) {
        const deduction = booking.securityDeposit - depositAmount;
        refundNote += ` (₹${deduction} deducted)`;
      }

      if (damageNotes) {
        refundNote += `\nDamage/Deduction Notes: ${damageNotes}`;
      }

      booking.internalNotes = (booking.internalNotes || "") + refundNote;
    }

    await booking.save();

    res.json({
      ok: true,
      message: "Booking marked as returned successfully",
      data: booking,
      lateFee: lateFee,
      securityDepositRefunded: booking.securityDepositRefunded || 0,
    });
  } catch (error) {
    console.error("Error marking booking as returned:", error);
    res.status(500).json({
      ok: false,
      message: "Failed to update return status",
      error: error.message,
    });
  }
};

/**
 * Record payment for booking
 * @route POST /api/bookings/:id/payment
 */
const recordPayment = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const { amount, method } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        ok: false,
        message: "Invalid payment amount",
      });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        ok: false,
        message: "Booking not found",
      });
    }

    // ✅ Check if payment exceeds balance due
    const currentBalanceDue =
      booking.balanceDue || booking.totalAmount - (booking.amountPaid || 0);

    if (parseFloat(amount) > currentBalanceDue) {
      return res.status(400).json({
        ok: false,
        message: `Payment amount (₹${amount}) cannot exceed balance due (₹${currentBalanceDue.toFixed(
          2
        )})`,
        balanceDue: currentBalanceDue,
      });
    }

    // Update payment
    booking.amountPaid = (booking.amountPaid || 0) + parseFloat(amount);
    booking.balanceDue = booking.totalAmount - booking.amountPaid;

    // Update payment status
    if (booking.balanceDue <= 0) {
      booking.paymentStatus = "Paid";
      booking.balanceDue = 0; // Ensure it's exactly 0, not negative
    } else if (booking.amountPaid > 0) {
      booking.paymentStatus = "Partially Paid";
    }

    // Add to internal notes
    booking.internalNotes =
      (booking.internalNotes || "") +
      `\n[${new Date().toISOString()}] Payment: ₹${amount} via ${method}`;

    await booking.save();

    res.json({
      ok: true,
      message: "Payment recorded successfully",
      data: booking,
    });
  } catch (error) {
    console.error("Error recording payment:", error);
    res.status(500).json({
      ok: false,
      message: "Failed to record payment",
      error: error.message,
    });
  }
};

/**
 * Log reminder sent (no actual sending, just tracking)
 * @route POST /api/bookings/:id/reminder-log
 */
const logReminder = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const { timestamp, method } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        ok: false,
        message: "Booking not found",
      });
    }

    // Just add to internal notes for tracking
    booking.internalNotes =
      (booking.internalNotes || "") +
      `\n[${timestamp}] ${method} reminder opened by staff`;

    await booking.save();

    res.json({
      ok: true,
      message: "Reminder logged",
    });
  } catch (error) {
    console.error("Error logging reminder:", error);
    res.status(500).json({
      ok: false,
      message: "Failed to log reminder",
      error: error.message,
    });
  }
};

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // Page rendering functions
  getBookingsPage,
  getCreateBookingPage,
  getViewBookingPage,
  getEditBookingPage,

  // API functions
  getBookings,
  getAvailableProducts,
  createBooking,
  getBookingById,
  updateBooking,
  deleteBooking,
  searchCustomers,
  validateProductQuantities,
  markBookingPickedUp,
  markBookingReturned,
  recordPayment,
  logReminder,
};
