const dashboardService = require('../services/dahsboardService');
const moment = require('moment');
const getGreeting = require("../helpers/greeting")

/**
 * Render dashboard page
 * @route GET /dashboard
 */
const renderDashboard = async (req, res) => {
  try {
    const user = req.user || { name: 'Admin', role: 'Manager' };

    // Get greeting based on time
    const hour = moment().hour();
    let greeting = 'Good Morning';
    if (hour >= 12 && hour < 17) greeting = 'Good Afternoon';
    else if (hour >= 17) greeting = 'Good Evening';

    // Fetch all dashboard data
    const [stats, deliveries, returns, notifications] = await Promise.all([
      dashboardService.getDashboardStats(),
      dashboardService.getUpcomingDeliveries(),
      dashboardService.getUpcomingReturns('all'),
      dashboardService.getNotifications(),
    ]);

    res.render('dashboard', {
      user: {
        ...user,
      },
      greeting:{greeting},
      currentDate: moment().format('MMM DD, YYYY'),
      stats,
      deliveries,
      returns,
      notifications,
      todayNotes: '', // Will implement later with Notes model
    });
  } catch (error) {
    console.error('Dashboard render error:', error);
    res.status(500).render('pagenotfound', {
      message: 'Failed to load dashboard',
      error: error.message,
    });
  }
};

/**
 * Get dashboard stats API
 * @route GET /api/dashboard/stats
 */
const getStats = async (req, res) => {
  try {
    const stats = await dashboardService.getDashboardStats();
    res.json({
      ok: true,
      data: stats,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      ok: false,
      message: 'Failed to fetch stats',
      error: error.message,
    });
  }
};

/**
 * Get upcoming deliveries API
 * @route GET /api/dashboard/deliveries
 */
const getDeliveries = async (req, res) => {
  try {
    const deliveries = await dashboardService.getUpcomingDeliveries();
    res.json({
      ok: true,
      data: deliveries,
    });
  } catch (error) {
    console.error('Get deliveries error:', error);
    res.status(500).json({
      ok: false,
      message: 'Failed to fetch deliveries',
      error: error.message,
    });
  }
};

/**
 * Get upcoming returns API
 * @route GET /api/dashboard/returns
 */
const getReturns = async (req, res) => {
  try {
    const { filter = 'all' } = req.query;
    const returns = await dashboardService.getUpcomingReturns(filter);
    res.json({
      ok: true,
      data: returns,
    });
  } catch (error) {
    console.error('Get returns error:', error);
    res.status(500).json({
      ok: false,
      message: 'Failed to fetch returns',
      error: error.message,
    });
  }
};

/**
 * Get notifications API
 * @route GET /api/dashboard/notifications
 */
const getNotifications = async (req, res) => {
  try {
    const notifications = await dashboardService.getNotifications();
    res.json({
      ok: true,
      data: notifications,
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      ok: false,
      message: 'Failed to fetch notifications',
      error: error.message,
    });
  }
};

const renderCalendar = async (req, res) => {
  try {
    const user = req.user || {
      name: 'Admin',
      role: 'Administrator',
      email: 'admin@royalsuits.com'
    };

    const greeting = getGreeting();
    const currentDate = moment.tz('Asia/Kolkata').format('MMM DD, YYYY');

    res.render('calendar', {
      user,
      greeting,
      currentDate,
      pageTitle: 'Booking Calendar'
    });
  } catch (error) {
    console.error('Error rendering calendar:', error);
    res.status(500).render('pagenotfound', { message: 'Failed to load calendar' });
  }
};

// Get calendar bookings API
const getCalendarBookings = async (req, res) => {
  try {
    const { start, end } = req.query;
    
    console.log('📅 Calendar API called with:', { start, end });
    
    // Validate dates
    if (!start || !end) {
      return res.status(400).json({
        ok: false,
        message: 'Start and end dates are required'
      });
    }
    
    const bookings = await dashboardService.getCalendarBookings(start, end);
    
    res.json({
      ok: true,
      data: bookings
    });
  } catch (error) {
    console.error('Error fetching calendar bookings:', error);
    res.status(500).json({
      ok: false,
      message: error.message
    });
  }
};


module.exports = {
  renderDashboard,
  getStats,
  getDeliveries,
  getReturns,
  getNotifications,
  renderCalendar,
  getCalendarBookings
};
