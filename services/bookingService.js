const Booking = require("../models/bookingModel");
const Product = require("../models/productModel");
const Customer = require("../models/customerModel");

/**
 * Get available products for a date range
 * @param {Date} pickupDate - Pickup date
 * @param {Date} returnDate - Return date
 * @returns {Promise<Array>} Available products
 */
const getAvailableProducts = async (pickupDate, returnDate) => {
  try {
    const pickup = new Date(pickupDate);
    const returnD = new Date(returnDate);

    // Validate dates
    if (returnD <= pickup) {
      throw new Error("Return date must be after pickup date");
    }

    // Find all bookings that overlap with requested dates
    // A booking overlaps if:
    // 1. It starts before or during our rental period AND
    // 2. It ends during or after our rental period
    const overlappingBookings = await Booking.find({
      bookingStatus: { $in: ["Confirmed", "Draft"] },
      $or: [
        {
          // Booking starts before return date AND ends after pickup date
          pickupDate: { $lte: returnD },
          expectedReturnDate: { $gte: pickup },
        },
      ],
    })
      .select("items")
      .lean();

    // Collect all booked product IDs
    const bookedProductIds = new Set();
    overlappingBookings.forEach((booking) => {
      if (booking.items && booking.items.length > 0) {
        booking.items.forEach((item) => {
          bookedProductIds.add(item.productId.toString());
        });
      }
    });

    // Get all available products (not booked during this period)
    const availableProducts = await Product.find({
      _id: { $nin: Array.from(bookedProductIds) },
      status: "available",
      isRetired: { $ne: true },
    })
      .select(
        "_id displayName sku baseRent securityDeposit photos category size"
      )
      .lean();

    return availableProducts;
  } catch (error) {
    console.error("Error in getAvailableProducts service:", error);
    throw error;
  }
};

/**
 * Create a new booking
 * @param {Object} bookingData - Booking data
 * @returns {Promise<Object>} Created booking
 */
const createBooking = async (bookingData) => {
  try {
    // Validate customer exists
    const customer = await Customer.findById(bookingData.customerId);
    if (!customer) {
      throw new Error("Customer not found");
    }

    // Validate products exist and are available
    if (!bookingData.items || bookingData.items.length === 0) {
      throw new Error("At least one product is required");
    }

    // Check if all products are available for the date range
    const availableProducts = await getAvailableProducts(
      bookingData.pickupDate,
      bookingData.expectedReturnDate
    );

    const availableProductIds = new Set(
      availableProducts.map((p) => p._id.toString())
    );

    // Validate each item
    for (const item of bookingData.items) {
      if (!availableProductIds.has(item.productId.toString())) {
        const product = await Product.findById(item.productId).select(
          "displayName sku"
        );
        throw new Error(
          `Product ${
            product?.displayName || item.productId
          } is not available for the selected dates`
        );
      }

      // Fetch product details to populate item data
      const product = await Product.findById(item.productId);
      if (!product) {
        throw new Error(`Product ${item.productId} not found`);
      }

      item.productName = product.displayName;
      item.sku = product.sku;
      item.rentalPrice = item.rentalPrice || product.baseRent;
      item.securityDeposit = item.securityDeposit || product.securityDeposit;
    }

    // Create booking (pre-save hooks will calculate totals)
    const booking = new Booking(bookingData);
    await booking.save();

    // Populate customer details
    await booking.populate("customerId", "name email primaryMobile");

    return booking;
  } catch (error) {
    console.error("Error in createBooking service:", error);
    throw error;
  }
};

/**
 * Get booking by ID
 * @param {String} bookingId - Booking ID
 * @returns {Promise<Object>} Booking object
 */
const getBookingById = async (bookingId) => {
  try {
    const booking = await Booking.findById(bookingId)
      .populate(
        "customerId",
        "name email primaryMobile secondaryMobile address"
      )
      .populate("items.productId", "displayName sku photos category size")
      .populate("invoiceId")
      .lean();

    if (!booking) {
      throw new Error("Booking not found");
    }

    return booking;
  } catch (error) {
    console.error("Error in getBookingById service:", error);
    throw error;
  }
};

/**
 * Get all bookings with pagination and filtering
 * @param {Number} page - Page number
 * @param {Number} limit - Items per page
 * @param {String} search - Search query
 * @param {Object} filters - Filter object
 * @returns {Promise<Object>} Bookings with pagination
 */
const getBookingsWithPagination = async (
  page = 1,
  limit = 20,
  search = "",
  filters = {}
) => {
  try {
    const query = {};

    // Search by booking code or customer
    if (search) {
      const customers = await Customer.find({
        $or: [
          { name: new RegExp(search, "i") },
          { code: new RegExp(search, "i") },
          { primaryMobile: new RegExp(search, "i") },
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
    if (filters.bookingStatus) {
      query.bookingStatus = filters.bookingStatus;
    }
    if (filters.paymentStatus) {
      query.paymentStatus = filters.paymentStatus;
    }
    if (filters.pickupStatus) {
      query.pickupStatus = filters.pickupStatus;
    }
    if (filters.returnStatus) {
      query.returnStatus = filters.returnStatus;
    }
    if (filters.eventType) {
      query.eventType = filters.eventType;
    }

    // Date range filters
    if (filters.startDate && filters.endDate) {
      query.eventDate = {
        $gte: new Date(filters.startDate),
        $lte: new Date(filters.endDate),
      };
    }

    const total = await Booking.countDocuments(query);
    const totalPages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;

    const bookings = await Booking.find(query)
      .populate("customerId", "fullName email primaryMobile")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Format for frontend
    console.log(bookings);
    const formattedBookings = bookings.map((booking) => ({
      id: booking._id,
      bookingId: booking.bookingCode,
      customerName: booking.customerId.fullName || "Unknown",
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
      outstandingAmount: booking.balanceDue || 0,
    }));
    console.log(formattedBookings)

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
  } catch (error) {
    console.error("Error in getBookingsWithPagination service:", error);
    throw error;
  }
};

/**
 * Update booking
 * @param {String} bookingId - Booking ID
 * @param {Object} updateData - Update data
 * @returns {Promise<Object>} Updated booking
 */
const updateBooking = async (bookingId, updateData) => {
  try {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      throw new Error("Booking not found");
    }

    // If dates are being updated, check product availability
    if (updateData.pickupDate || updateData.expectedReturnDate) {
      const pickup = updateData.pickupDate || booking.pickupDate;
      const returnDate =
        updateData.expectedReturnDate || booking.expectedReturnDate;

      const availableProducts = await getAvailableProducts(pickup, returnDate);
      const availableProductIds = new Set(
        availableProducts.map((p) => p._id.toString())
      );

      // Check if current booking items are still available
      // (excluding this booking's own reservation)
      for (const item of booking.items) {
        if (!availableProductIds.has(item.productId.toString())) {
          const product = await Product.findById(item.productId).select(
            "displayName"
          );
          throw new Error(
            `Product ${
              product?.displayName || item.productId
            } is not available for the new dates`
          );
        }
      }
    }

    // If items are being updated, validate them
    if (updateData.items && updateData.items.length > 0) {
      for (const item of updateData.items) {
        const product = await Product.findById(item.productId);
        if (!product) {
          throw new Error(`Product ${item.productId} not found`);
        }

        item.productName = product.displayName;
        item.sku = product.sku;
        item.rentalPrice = item.rentalPrice || product.baseRent;
        item.securityDeposit = item.securityDeposit || product.securityDeposit;
      }
    }

    // Update booking
    Object.assign(booking, updateData);
    await booking.save();

    // Populate and return
    await booking.populate("customerId", "name email primaryMobile");

    return booking;
  } catch (error) {
    console.error("Error in updateBooking service:", error);
    throw error;
  }
};

/**
 * Delete booking
 * @param {String} bookingId - Booking ID
 * @returns {Promise<Boolean>} Success status
 */
const deleteBooking = async (bookingId) => {
  try {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      throw new Error("Booking not found");
    }

    // Check if booking can be deleted (only Draft or Cancelled bookings)
    if (!["Draft", "Cancelled"].includes(booking.bookingStatus)) {
      throw new Error(
        "Only Draft or Cancelled bookings can be deleted. Please cancel the booking first."
      );
    }

    await Booking.findByIdAndDelete(bookingId);
    return true;
  } catch (error) {
    console.error("Error in deleteBooking service:", error);
    throw error;
  }
};

/**
 * Cancel booking
 * @param {String} bookingId - Booking ID
 * @param {String} cancellationReason - Reason for cancellation
 * @returns {Promise<Object>} Updated booking
 */
const cancelBooking = async (bookingId, cancellationReason = "") => {
  try {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      throw new Error("Booking not found");
    }

    if (booking.bookingStatus === "Cancelled") {
      throw new Error("Booking is already cancelled");
    }

    if (booking.bookingStatus === "Completed") {
      throw new Error("Cannot cancel a completed booking");
    }

    booking.bookingStatus = "Cancelled";
    if (cancellationReason) {
      booking.internalNotes =
        (booking.internalNotes || "") +
        `\n[Cancelled on ${new Date().toISOString()}] Reason: ${cancellationReason}`;
    }

    await booking.save();
    return booking;
  } catch (error) {
    console.error("Error in cancelBooking service:", error);
    throw error;
  }
};

/**
 * Mark booking as picked up
 * @param {String} bookingId - Booking ID
 * @returns {Promise<Object>} Updated booking
 */
const markAsPickedUp = async (bookingId) => {
  try {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      throw new Error("Booking not found");
    }

    if (booking.bookingStatus !== "Confirmed") {
      throw new Error("Only confirmed bookings can be marked as picked up");
    }

    booking.pickupStatus = "Picked Up";
    await booking.save();

    return booking;
  } catch (error) {
    console.error("Error in markAsPickedUp service:", error);
    throw error;
  }
};

/**
 * Mark booking as returned
 * @param {String} bookingId - Booking ID
 * @param {Date} actualReturnDate - Actual return date
 * @returns {Promise<Object>} Updated booking
 */
const markAsReturned = async (bookingId, actualReturnDate = new Date()) => {
  try {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      throw new Error("Booking not found");
    }

    if (booking.pickupStatus !== "Picked Up") {
      throw new Error("Booking must be picked up before it can be returned");
    }

    booking.actualReturnDate = actualReturnDate;
    booking.returnStatus = "Returned";
    booking.bookingStatus = "Completed";

    // Calculate late fees if overdue
    const expectedReturn = new Date(booking.expectedReturnDate);
    const actualReturn = new Date(actualReturnDate);

    if (actualReturn > expectedReturn) {
      const daysLate = Math.ceil(
        (actualReturn - expectedReturn) / (1000 * 60 * 60 * 24)
      );
      const lateFee = booking.items.reduce((sum, item) => {
        const product = item.productId;
        const extraDayCharge = item.rentalPrice * 0.5; // 50% of daily rate as late fee
        return sum + extraDayCharge * item.quantity * daysLate;
      }, 0);

      booking.totalAmount += lateFee;
      booking.balanceDue += lateFee;
      booking.internalNotes =
        (booking.internalNotes || "") +
        `\n[Late Return] ${daysLate} days late. Late fee: ₹${lateFee}`;
    }

    await booking.save();
    return booking;
  } catch (error) {
    console.error("Error in markAsReturned service:", error);
    throw error;
  }
};

/**
 * Get booking statistics
 * @returns {Promise<Object>} Statistics object
 */
const getBookingStats = async () => {
  try {
    const stats = await Booking.aggregate([
      {
        $facet: {
          totalBookings: [{ $count: "count" }],
          byStatus: [{ $group: { _id: "$bookingStatus", count: { $sum: 1 } } }],
          byPaymentStatus: [
            { $group: { _id: "$paymentStatus", count: { $sum: 1 } } },
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
          upcomingPickups: [
            {
              $match: {
                pickupDate: {
                  $gte: new Date(),
                  $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                },
                pickupStatus: "Not Picked Up",
              },
            },
            { $count: "count" },
          ],
          overdueReturns: [
            {
              $match: {
                expectedReturnDate: { $lt: new Date() },
                returnStatus: { $ne: "Returned" },
                bookingStatus: "Confirmed",
              },
            },
            { $count: "count" },
          ],
        },
      },
    ]);

    return {
      totalBookings: stats[0].totalBookings[0]?.count || 0,
      byStatus: stats[0].byStatus,
      byPaymentStatus: stats[0].byPaymentStatus,
      revenue: stats[0].revenue[0] || {
        totalRevenue: 0,
        totalPaid: 0,
        totalOutstanding: 0,
      },
      upcomingPickups: stats[0].upcomingPickups[0]?.count || 0,
      overdueReturns: stats[0].overdueReturns[0]?.count || 0,
    };
  } catch (error) {
    console.error("Error in getBookingStats service:", error);
    throw error;
  }
};

module.exports = {
  getAvailableProducts,
  createBooking,
  getBookingById,
  getBookingsWithPagination,
  updateBooking,
  deleteBooking,
  cancelBooking,
  markAsPickedUp,
  markAsReturned,
  getBookingStats,
};
