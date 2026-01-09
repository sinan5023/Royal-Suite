const Booking = require('../models/bookingModel');
const Expense = require('../models/expenseModel');
const Invoice = require('../models/invoiceModel');
const moment = require('moment-timezone');

class AnalyticsService {
  /**
   * Get sales vs expenses comparison
   */
  async getSalesVsExpenses(startDate, endDate) {
    try {
      const start = moment(startDate).startOf('day').toDate();
      const end = moment(endDate).endOf('day').toDate();

      // Get total sales (from bookings)
      const salesData = await Booking.aggregate([
        {
          $match: {
            createdAt: { $gte: start, $lte: end },
            bookingStatus: { $nin: ['Cancelled'] },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
            },
            totalSales: { $sum: '$totalAmount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]);

      // Get total expenses
      const expenseData = await Expense.aggregate([
        {
          $match: {
            expenseDate: { $gte: start, $lte: end },
            status: 'Active',
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$expenseDate' },
              month: { $month: '$expenseDate' },
            },
            totalExpenses: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]);

      // Merge data
      const merged = this._mergeSalesAndExpenses(salesData, expenseData);

      return merged;
    } catch (error) {
      throw new Error(`Failed to fetch sales vs expenses: ${error.message}`);
    }
  }

  /**
   * Get revenue analytics
   */
  async getRevenueAnalytics(period = '30days') {
    try {
      const endDate = moment.tz('Asia/Kolkata').endOf('day');
      let startDate;

      if (period === '7days') {
        startDate = moment.tz('Asia/Kolkata').subtract(7, 'days').startOf('day');
      } else if (period === '30days') {
        startDate = moment.tz('Asia/Kolkata').subtract(30, 'days').startOf('day');
      } else if (period === '90days') {
        startDate = moment.tz('Asia/Kolkata').subtract(90, 'days').startOf('day');
      } else if (period === 'year') {
        startDate = moment.tz('Asia/Kolkata').startOf('year');
      }

      // Total revenue
      const totalRevenue = await Booking.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate.toDate(), $lte: endDate.toDate() },
            bookingStatus: { $nin: ['Cancelled'] },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$totalAmount' },
            paid: { $sum: '$amountPaid' },
            pending: { $sum: '$balanceDue' },
          },
        },
      ]);

      // Bookings count
      const bookingsCount = await Booking.countDocuments({
        createdAt: { $gte: startDate.toDate(), $lte: endDate.toDate() },
        bookingStatus: { $nin: ['Cancelled'] },
      });

      // Average booking value
      const avgBookingValue = totalRevenue.length > 0 && bookingsCount > 0
        ? totalRevenue[0].total / bookingsCount
        : 0;

      // Payment status breakdown
      const paymentBreakdown = await Booking.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate.toDate(), $lte: endDate.toDate() },
            bookingStatus: { $nin: ['Cancelled'] },
          },
        },
        {
          $group: {
            _id: '$paymentStatus',
            count: { $sum: 1 },
            amount: { $sum: '$totalAmount' },
          },
        },
      ]);

      // Top customers
      const topCustomers = await Booking.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate.toDate(), $lte: endDate.toDate() },
            bookingStatus: { $nin: ['Cancelled'] },
          },
        },
        {
          $group: {
            _id: '$customerId',
            totalSpent: { $sum: '$totalAmount' },
            bookingCount: { $sum: 1 },
          },
        },
        { $sort: { totalSpent: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'customers',
            localField: '_id',
            foreignField: '_id',
            as: 'customer',
          },
        },
        { $unwind: '$customer' },
      ]);

      return {
        period,
        totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].total : 0,
        paidAmount: totalRevenue.length > 0 ? totalRevenue[0].paid : 0,
        pendingAmount: totalRevenue.length > 0 ? totalRevenue[0].pending : 0,
        bookingsCount,
        avgBookingValue,
        paymentBreakdown,
        topCustomers: topCustomers.map(c => ({
          name: c.customer.fullName || c.customer.name,
          totalSpent: c.totalSpent,
          bookingCount: c.bookingCount,
        })),
      };
    } catch (error) {
      throw new Error(`Failed to fetch revenue analytics: ${error.message}`);
    }
  }

  /**
   * Get expense analytics by category
   */
  async getExpenseAnalytics(startDate, endDate) {
    try {
      const start = moment(startDate).startOf('day').toDate();
      const end = moment(endDate).endOf('day').toDate();

      const expensesByCategory = await Expense.getExpensesByCategory(start, end);

      const totalExpenses = expensesByCategory.reduce((sum, cat) => sum + cat.totalAmount, 0);

      return {
        byCategory: expensesByCategory,
        totalExpenses,
      };
    } catch (error) {
      throw new Error(`Failed to fetch expense analytics: ${error.message}`);
    }
  }

  /**
   * Get daily sales trend
   */
  async getDailySalesTrend(days = 30) {
    try {
      const endDate = moment.tz('Asia/Kolkata').endOf('day');
      const startDate = moment.tz('Asia/Kolkata').subtract(days, 'days').startOf('day');

      const dailySales = await Booking.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate.toDate(), $lte: endDate.toDate() },
            bookingStatus: { $nin: ['Cancelled'] },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' },
            },
            totalSales: { $sum: '$totalAmount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
      ]);

      return dailySales.map(d => ({
        date: `${d._id.year}-${String(d._id.month).padStart(2, '0')}-${String(d._id.day).padStart(2, '0')}`,
        sales: d.totalSales,
        count: d.count,
      }));
    } catch (error) {
      throw new Error(`Failed to fetch daily sales trend: ${error.message}`);
    }
  }

  /**
   * Get profit margin
   */
  async getProfitMargin(startDate, endDate) {
    try {
      const start = moment(startDate).startOf('day').toDate();
      const end = moment(endDate).endOf('day').toDate();

      const totalSales = await Booking.aggregate([
        {
          $match: {
            createdAt: { $gte: start, $lte: end },
            bookingStatus: { $nin: ['Cancelled'] },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$totalAmount' },
          },
        },
      ]);

      const totalExpenses = await Expense.aggregate([
        {
          $match: {
            expenseDate: { $gte: start, $lte: end },
            status: 'Active',
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
          },
        },
      ]);

      const sales = totalSales.length > 0 ? totalSales[0].total : 0;
      const expenses = totalExpenses.length > 0 ? totalExpenses[0].total : 0;
      const profit = sales - expenses;
      const profitMargin = sales > 0 ? (profit / sales) * 100 : 0;

      return {
        sales,
        expenses,
        profit,
        profitMargin: Math.round(profitMargin * 100) / 100,
      };
    } catch (error) {
      throw new Error(`Failed to calculate profit margin: ${error.message}`);
    }
  }

  /**
   * Helper: Merge sales and expenses by month
   */
  _mergeSalesAndExpenses(salesData, expenseData) {
    const merged = {};

    salesData.forEach(s => {
      const key = `${s._id.year}-${String(s._id.month).padStart(2, '0')}`;
      merged[key] = {
        month: key,
        sales: s.totalSales,
        expenses: 0,
        profit: s.totalSales,
      };
    });

    expenseData.forEach(e => {
      const key = `${e._id.year}-${String(e._id.month).padStart(2, '0')}`;
      if (merged[key]) {
        merged[key].expenses = e.totalExpenses;
        merged[key].profit = merged[key].sales - e.totalExpenses;
      } else {
        merged[key] = {
          month: key,
          sales: 0,
          expenses: e.totalExpenses,
          profit: -e.totalExpenses,
        };
      }
    });

    return Object.values(merged).sort((a, b) => a.month.localeCompare(b.month));
  }
}

module.exports = new AnalyticsService();
