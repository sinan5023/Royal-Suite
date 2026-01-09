const Booking = require("../models/bookingModel");
const Invoice = require("../models/invoiceModel");
const Product = require("../models/productModel");
const moment = require("moment-timezone");

class DashboardService {
  /**
   * Get dashboard statistics
   */
  async getDashboardStats() {
    try {
      // Use IST timezone
      const today = moment.tz("Asia/Kolkata").startOf("day");
      const tomorrow = moment.tz("Asia/Kolkata").add(1, "day").startOf("day");
      const yesterday = moment
        .tz("Asia/Kolkata")
        .subtract(1, "day")
        .startOf("day");

      console.log("📅 Today:", today.format());
      console.log("📅 Tomorrow:", tomorrow.format());

      // Deliveries Today (pickupDate is today and not picked up yet)
      const deliveriesToday = await Booking.countDocuments({
        pickupDate: {
          $gte: today.toDate(),
          $lt: tomorrow.toDate(),
        },
        bookingStatus: { $in: ["Draft", "Confirmed"] },
        pickupStatus: "Not Picked Up",
      });

      console.log("📦 Deliveries today count:", deliveriesToday);

      // Deliveries Yesterday
      const deliveriesYesterday = await Booking.countDocuments({
        pickupDate: {
          $gte: yesterday.toDate(),
          $lt: today.toDate(),
        },
        bookingStatus: { $in: ["Draft", "Confirmed"] },
        pickupStatus: "Not Picked Up",
      });

      // Returns Due Today
      const returnsDueToday = await Booking.countDocuments({
        expectedReturnDate: {
          $gte: today.toDate(),
          $lt: tomorrow.toDate(),
        },
        pickupStatus: "Picked Up",
        returnStatus: { $in: ["Not Returned", "Overdue"] },
      });

      // Returns Due Yesterday
      const returnsDueYesterday = await Booking.countDocuments({
        expectedReturnDate: {
          $gte: yesterday.toDate(),
          $lt: today.toDate(),
        },
        pickupStatus: "Picked Up",
        returnStatus: { $in: ["Not Returned", "Overdue"] },
      });

      // Overdue Returns (expectedReturnDate < today and not returned)
      const overdueReturns = await Booking.countDocuments({
        expectedReturnDate: { $lt: today.toDate() },
        returnStatus: "Overdue",
      });

      // Overdue Returns Yesterday
      const overdueReturnsYesterday = await Booking.countDocuments({
        expectedReturnDate: { $lt: yesterday.toDate() },
        returnStatus: "Overdue",
      });

      // Active Bookings
      const activeBookings = await Booking.countDocuments({
        bookingStatus: { $in: ["Draft", "Confirmed"] },
      });

      // Active Bookings Yesterday (approximation)
      const activeBookingsYesterday = await Booking.countDocuments({
        createdAt: { $lt: today.toDate() },
        bookingStatus: { $in: ["Draft", "Confirmed"] },
      });

      // Calculate changes
      const deliveriesChange = this._calculateChange(
        deliveriesToday,
        deliveriesYesterday
      );
      const returnsChange = this._calculateChange(
        returnsDueToday,
        returnsDueYesterday
      );
      const overdueChange = this._calculateChange(
        overdueReturns,
        overdueReturnsYesterday
      );
      const activeChange = this._calculateChange(
        activeBookings,
        activeBookingsYesterday
      );

      return {
        deliveriesToday,
        deliveriesChange,
        returnsDueToday,
        returnsChange,
        overdueReturns,
        overdueChange,
        activeBookings,
        activeChange,
      };
    } catch (error) {
      throw new Error(`Failed to fetch dashboard stats: ${error.message}`);
    }
  }

  /**
   * Get upcoming deliveries grouped by day
   */
  async getUpcomingDeliveries() {
    try {
      // Use IST timezone
      const today = moment.tz("Asia/Kolkata").startOf("day");
      const tomorrow = moment.tz("Asia/Kolkata").add(1, "day").startOf("day");
      const dayAfter = moment.tz("Asia/Kolkata").add(2, "days").startOf("day");
      const threeDaysLater = moment
        .tz("Asia/Kolkata")
        .add(3, "days")
        .startOf("day");

      console.log("🔍 Fetching deliveries...");
      console.log("Today range:", today.format(), "to", tomorrow.format());
      console.log(
        "Tomorrow range:",
        tomorrow.format(),
        "to",
        dayAfter.format()
      );
      console.log(
        "Day after range:",
        dayAfter.format(),
        "to",
        threeDaysLater.format()
      );

      // Today's deliveries
      const deliveriesToday = await Booking.find({
        pickupDate: {
          $gte: today.toDate(),
          $lt: tomorrow.toDate(),
        },
        bookingStatus: { $in: ["Draft", "Confirmed"] },
        pickupStatus: "Not Picked Up",
      })
        .populate("customerId", "fullName name primaryMobile")
        .populate("items.productId", "displayName productName")
        .sort({ pickupDate: 1 })
        .limit(10)
        .lean();

      console.log("📦 Today deliveries found:", deliveriesToday.length);

      // Tomorrow's deliveries
      const deliveriesTomorrow = await Booking.find({
        pickupDate: {
          $gte: tomorrow.toDate(),
          $lt: dayAfter.toDate(),
        },
        bookingStatus: { $in: ["Draft", "Confirmed"] },
        pickupStatus: "Not Picked Up",
      })
        .populate("customerId", "fullName name primaryMobile")
        .populate("items.productId", "displayName productName")
        .sort({ pickupDate: 1 })
        .limit(10)
        .lean();

      console.log("📦 Tomorrow deliveries found:", deliveriesTomorrow.length);
      if (deliveriesTomorrow.length > 0) {
        console.log(
          "First tomorrow delivery pickup date:",
          deliveriesTomorrow[0].pickupDate
        );
      }

      // Day after tomorrow's deliveries
      const deliveriesDayAfter = await Booking.find({
        pickupDate: {
          $gte: dayAfter.toDate(),
          $lt: threeDaysLater.toDate(),
        },
        bookingStatus: { $in: ["Draft", "Confirmed"] },
        pickupStatus: "Not Picked Up",
      })
        .populate("customerId", "fullName name primaryMobile")
        .populate("items.productId", "displayName productName")
        .sort({ pickupDate: 1 })
        .limit(10)
        .lean();

      console.log("📦 Day after deliveries found:", deliveriesDayAfter.length);

      return {
        today: this._formatDeliveries(deliveriesToday),
        tomorrow: this._formatDeliveries(deliveriesTomorrow),
        dayAfter: this._formatDeliveries(deliveriesDayAfter),
      };
    } catch (error) {
      console.error("❌ Error fetching deliveries:", error);
      throw new Error(`Failed to fetch deliveries: ${error.message}`);
    }
  }

  /**
   * Get upcoming returns
   */
  async getUpcomingReturns(filter = "all") {
    try {
      const today = moment.tz("Asia/Kolkata").startOf("day");
      const tomorrow = moment.tz("Asia/Kolkata").add(1, "day").startOf("day");
      const nextWeek = moment.tz("Asia/Kolkata").add(7, "days").endOf("day");

      let query = {
        pickupStatus: "Picked Up",
        returnStatus: { $in: ["Not Returned", "Overdue"] },
      };

      // Apply filters
      if (filter === "dueToday") {
        query.expectedReturnDate = {
          $gte: today.toDate(),
          $lt: tomorrow.toDate(),
        };
      } else if (filter === "overdue") {
        query.returnStatus = "Overdue";
      } else if (filter === "next7days") {
        query.expectedReturnDate = {
          $gte: today.toDate(),
          $lte: nextWeek.toDate(),
        };
      }

      const returns = await Booking.find(query)
        .populate("customerId", "fullName name primaryMobile")
        .populate("items.productId", "displayName productName")
        .sort({ expectedReturnDate: 1 })
        .limit(20)
        .lean();

      return this._formatReturns(returns);
    } catch (error) {
      throw new Error(`Failed to fetch returns: ${error.message}`);
    }
  }

  /**
   * Get recent notifications
   */
  async getNotifications() {
    try {
      const today = moment.tz("Asia/Kolkata").startOf("day");
      const tomorrow = moment.tz("Asia/Kolkata").add(1, "day").startOf("day");
      const notifications = [];

      // Check overdue returns
      const overdueReturns = await Booking.countDocuments({
        returnStatus: "Overdue",
      });

      if (overdueReturns > 0) {
        notifications.push({
          message: `${overdueReturns} booking(s) have overdue returns`,
          type: "warning",
          timeAgo: "Just now",
          icon: "⚠️",
        });
      }

      // Check deliveries today
      const deliveriesToday = await Booking.countDocuments({
        pickupDate: {
          $gte: today.toDate(),
          $lt: tomorrow.toDate(),
        },
        bookingStatus: { $in: ["Draft", "Confirmed"] },
        pickupStatus: "Not Picked Up",
      });

      if (deliveriesToday > 0) {
        notifications.push({
          message: `${deliveriesToday} delivery(ies) scheduled for today`,
          type: "info",
          timeAgo: "1 hour ago",
          icon: "📦",
        });
      }

      // Check low stock (optional - if you track inventory)
      const lowStockCount = await Product.countDocuments({
        quantity: { $lt: 5 },
        status: "Available",
      });

      if (lowStockCount > 0) {
        notifications.push({
          message: `${lowStockCount} product(s) running low on stock`,
          type: "warning",
          timeAgo: "2 hours ago",
          icon: "📉",
        });
      }

      // Check pending payments
      const pendingPayments = await Booking.countDocuments({
        paymentStatus: { $in: ["Unpaid", "Partially Paid"] },
        balanceDue: { $gt: 0 },
      });

      if (pendingPayments > 0) {
        notifications.push({
          message: `${pendingPayments} booking(s) with pending payments`,
          type: "info",
          timeAgo: "3 hours ago",
          icon: "💰",
        });
      }

      return notifications.slice(0, 5);
    } catch (error) {
      throw new Error(`Failed to fetch notifications: ${error.message}`);
    }
  }

  /**
   * Format deliveries for display
   */
  _formatDeliveries(bookings) {
    return bookings.map((booking) => ({
      id: booking._id,
      bookingCode: booking.bookingCode,
      customerName:
        booking.customerId?.fullName || booking.customerId?.name || "N/A",
      customerPhone: booking.customerId?.primaryMobile || "N/A",
      productName:
        booking.items
          ?.map(
            (item) =>
              item.productName ||
              item.productId?.displayName ||
              item.productId?.productName
          )
          .filter(Boolean)
          .join(", ") || "N/A",
      pickupDate: moment(booking.pickupDate)
        .tz("Asia/Kolkata")
        .format("MMM DD, YYYY"),
      pickupTime: booking.pickupTimeWindow || "N/A",
    }));
  }

  /**
   * Format returns for display
   */
  _formatReturns(bookings) {
    const today = moment.tz("Asia/Kolkata").startOf("day");

    return bookings.map((booking) => ({
      id: booking._id,
      bookingCode: booking.bookingCode,
      customerName:
        booking.customerId?.fullName || booking.customerId?.name || "N/A",
      customerPhone: booking.customerId?.primaryMobile || "N/A",
      productName:
        booking.items
          ?.map(
            (item) =>
              item.productName ||
              item.productId?.displayName ||
              item.productId?.productName
          )
          .filter(Boolean)
          .join(", ") || "N/A",
      returnDate: moment(booking.expectedReturnDate)
        .tz("Asia/Kolkata")
        .format("MMM DD, YYYY"),
      isOverdue: booking.returnStatus === "Overdue",
      daysOverdue:
        booking.returnStatus === "Overdue"
          ? today.diff(moment(booking.expectedReturnDate), "days")
          : 0,
    }));
  }

  /**
   * Calculate percentage change
   */
  _calculateChange(current, previous) {
    if (previous === 0) {
      return current > 0 ? "+100%" : "0%";
    }
    const change = ((current - previous) / previous) * 100;
    const sign = change >= 0 ? "+" : "";
    return `${sign}${Math.round(change)}%`;
  }

  /**
   * Get calendar bookings for date range
   */
  async getCalendarBookings(startDate, endDate) {
    try {
      let start, end;

      if (startDate && endDate) {
        // FullCalendar sends: "2025-12-29T00:00:00 05:30"
        // We need to clean it up - remove timezone part after space
        const cleanStart = startDate.split(" ")[0]; // "2025-12-29T00:00:00"
        const cleanEnd = endDate.split(" ")[0]; // "2026-02-09T00:00:00"

        // Parse as IST timezone
        start = moment.tz(cleanStart, "Asia/Kolkata").startOf("day").toDate();
        end = moment.tz(cleanEnd, "Asia/Kolkata").endOf("day").toDate();

        console.log("📅 Parsed dates:", {
          original: { start: startDate, end: endDate },
          cleaned: { start: cleanStart, end: cleanEnd },
          result: { start, end },
        });
      } else {
        // Default to current month if no dates provided
        const now = moment.tz("Asia/Kolkata");
        start = now.clone().startOf("month").toDate();
        end = now.clone().endOf("month").toDate();
      }

      console.log("📅 Fetching calendar bookings from", start, "to", end);

      // Get all bookings in date range
      const bookings = await Booking.find({
        $or: [
          {
            pickupDate: {
              $gte: start,
              $lte: end,
            },
          },
          {
            expectedReturnDate: {
              $gte: start,
              $lte: end,
            },
          },
        ],
        bookingStatus: { $nin: ["Cancelled", "Completed"] },
      })
        .populate("customerId", "fullName name primaryMobile")
        .populate("items.productId", "displayName productName")
        .lean();

      console.log("📦 Found", bookings.length, "bookings for calendar");

      // Format for FullCalendar
      const events = [];

      bookings.forEach((booking) => {
        const customerName =
          booking.customerId?.fullName || booking.customerId?.name || "Unknown";
        const items =
          booking.items
            ?.map(
              (item) =>
                item.productName ||
                item.productId?.displayName ||
                item.productId?.productName
            )
            .filter(Boolean)
            .join(", ") || "No items";

        // Pickup event - validate date first
        if (
          booking.pickupDate &&
          !isNaN(new Date(booking.pickupDate).getTime())
        ) {
          const pickupDateStr = moment(booking.pickupDate)
            .tz("Asia/Kolkata")
            .format("YYYY-MM-DD");

          events.push({
            id: booking._id.toString(),
            bookingCode: booking.bookingCode,
            title: `📦 ${customerName}`,
            start: pickupDateStr,
            allDay: true,
            backgroundColor: "#4b63ff",
            borderColor: "#3744a9",
            textColor: "#ffffff",
            extendedProps: {
              bookingCode: booking.bookingCode,
              customerName,
              customerPhone: booking.customerId?.primaryMobile || "N/A",
              items,
              eventType: booking.eventType || "N/A",
              pickupMethod: booking.pickupMethod || "N/A",
              bookingStatus: booking.bookingStatus,
              paymentStatus: booking.paymentStatus,
              totalAmount: booking.totalAmount || 0,
              balanceDue: booking.balanceDue || 0,
              type: "pickup",
            },
          });
        }

        // Return event - validate date first
        if (
          booking.expectedReturnDate &&
          !isNaN(new Date(booking.expectedReturnDate).getTime())
        ) {
          const returnDateStr = moment(booking.expectedReturnDate)
            .tz("Asia/Kolkata")
            .format("YYYY-MM-DD");
          const isOverdue = booking.returnStatus === "Overdue";

          events.push({
            id: booking._id.toString() + "-return",
            bookingCode: booking.bookingCode,
            title: `🔁 ${customerName}`,
            start: returnDateStr,
            allDay: true,
            backgroundColor: isOverdue ? "#f97373" : "#22c55e",
            borderColor: isOverdue ? "#d9624f" : "#16a34a",
            textColor: "#ffffff",
            extendedProps: {
              bookingCode: booking.bookingCode,
              customerName,
              customerPhone: booking.customerId?.primaryMobile || "N/A",
              items,
              returnStatus: booking.returnStatus || "Not Returned",
              bookingStatus: booking.bookingStatus,
              type: "return",
            },
          });
        }
      });

      console.log("✅ Returning", events.length, "calendar events");
      return events;
    } catch (error) {
      console.error("❌ Calendar service error:", error);
      throw new Error(`Failed to fetch calendar bookings: ${error.message}`);
    }
  }
}

module.exports = new DashboardService();
