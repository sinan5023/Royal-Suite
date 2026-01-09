const analyticsService = require('../services/analyticsService');
const moment = require('moment-timezone');

/**
 * Render Sales Analytics Dashboard
 */
const renderAnalyticsDashboard = async (req, res) => {
  try {
    const user = req.user || {
      name: 'Admin',
      role: 'Administrator',
      email: 'admin@royalsuits.com'
    };

    const greeting = getGreeting();
    const currentDate = moment.tz('Asia/Kolkata').format('MMM DD, YYYY');

    // Get default period (last 30 days)
    const endDate = moment.tz('Asia/Kolkata').format('YYYY-MM-DD');
    const startDate = moment.tz('Asia/Kolkata').subtract(30, 'days').format('YYYY-MM-DD');

    // Get initial analytics data
    const revenueAnalytics = await analyticsService.getRevenueAnalytics('30days');
    const salesVsExpenses = await analyticsService.getSalesVsExpenses(startDate, endDate);
    const expenseAnalytics = await analyticsService.getExpenseAnalytics(startDate, endDate);
    const profitMargin = await analyticsService.getProfitMargin(startDate, endDate);

    res.render('analytics', {
      user,
      greeting,
      currentDate,
      revenueAnalytics,
      salesVsExpenses,
      expenseAnalytics,
      profitMargin,
      pageTitle: 'Sales Analytics'
    });
  } catch (error) {
    console.error('Error rendering analytics dashboard:', error);
    res.status(500).render('error', { message: 'Failed to load analytics dashboard' });
  }
};

/**
 * Get Revenue Analytics API
 */
const getRevenueAnalytics = async (req, res) => {
  try {
    const { period = '30days' } = req.query;
    
    const data = await analyticsService.getRevenueAnalytics(period);
    
    res.json({
      ok: true,
      data
    });
  } catch (error) {
    console.error('Error fetching revenue analytics:', error);
    res.status(500).json({
      ok: false,
      message: error.message
    });
  }
};

/**
 * Get Sales vs Expenses API
 */
const getSalesVsExpenses = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        ok: false,
        message: 'Start date and end date are required'
      });
    }
    
    const data = await analyticsService.getSalesVsExpenses(startDate, endDate);
    
    res.json({
      ok: true,
      data
    });
  } catch (error) {
    console.error('Error fetching sales vs expenses:', error);
    res.status(500).json({
      ok: false,
      message: error.message
    });
  }
};

/**
 * Get Expense Analytics API
 */
const getExpenseAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        ok: false,
        message: 'Start date and end date are required'
      });
    }
    
    const data = await analyticsService.getExpenseAnalytics(startDate, endDate);
    
    res.json({
      ok: true,
      data
    });
  } catch (error) {
    console.error('Error fetching expense analytics:', error);
    res.status(500).json({
      ok: false,
      message: error.message
    });
  }
};

/**
 * Get Daily Sales Trend API
 */
const getDailySalesTrend = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const data = await analyticsService.getDailySalesTrend(parseInt(days));
    
    res.json({
      ok: true,
      data
    });
  } catch (error) {
    console.error('Error fetching daily sales trend:', error);
    res.status(500).json({
      ok: false,
      message: error.message
    });
  }
};

/**
 * Get Profit Margin API
 */
const getProfitMargin = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        ok: false,
        message: 'Start date and end date are required'
      });
    }
    
    const data = await analyticsService.getProfitMargin(startDate, endDate);
    
    res.json({
      ok: true,
      data
    });
  } catch (error) {
    console.error('Error fetching profit margin:', error);
    res.status(500).json({
      ok: false,
      message: error.message
    });
  }
};

/**
 * Export Analytics Report
 */
const exportAnalyticsReport = async (req, res) => {
  try {
    const { startDate, endDate, format = 'json' } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        ok: false,
        message: 'Start date and end date are required'
      });
    }

    const revenueAnalytics = await analyticsService.getRevenueAnalytics('30days');
    const salesVsExpenses = await analyticsService.getSalesVsExpenses(startDate, endDate);
    const expenseAnalytics = await analyticsService.getExpenseAnalytics(startDate, endDate);
    const profitMargin = await analyticsService.getProfitMargin(startDate, endDate);
    const dailySales = await analyticsService.getDailySalesTrend(30);

    const report = {
      generatedAt: new Date().toISOString(),
      period: { startDate, endDate },
      summary: {
        totalRevenue: revenueAnalytics.totalRevenue,
        totalExpenses: expenseAnalytics.totalExpenses,
        profit: profitMargin.profit,
        profitMargin: profitMargin.profitMargin,
      },
      revenueAnalytics,
      salesVsExpenses,
      expenseAnalytics,
      dailySales,
    };

    if (format === 'csv') {
      // TODO: Convert to CSV format
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=analytics-report-${startDate}-${endDate}.csv`);
      res.send('CSV export coming soon');
    } else {
      res.json({
        ok: true,
        data: report
      });
    }
  } catch (error) {
    console.error('Error exporting analytics report:', error);
    res.status(500).json({
      ok: false,
      message: error.message
    });
  }
};

/**
 * Helper function to get greeting based on time
 */
function getGreeting() {
  const hour = moment.tz('Asia/Kolkata').hour();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

// Export all controller functions
module.exports = {
  renderAnalyticsDashboard,
  getRevenueAnalytics,
  getSalesVsExpenses,
  getExpenseAnalytics,
  getDailySalesTrend,
  getProfitMargin,
  exportAnalyticsReport,
};
