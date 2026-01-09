const expenseService = require('../services/expenseService');
const moment = require('moment-timezone');

/**
 * Render Expense Dashboard
 */
const renderExpenseDashboard = async (req, res) => {
  try {
    const user = req.user || {
      name: 'Admin',
      role: 'Administrator',
      email: 'admin@royalsuits.com'
    };

    const greeting = getGreeting();
    const currentDate = moment.tz('Asia/Kolkata').format('MMM DD, YYYY');

    // Get query parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const category = req.query.category || '';
    const paymentStatus = req.query.paymentStatus || '';

    // Get expenses
    const result = await expenseService.getExpenses(
      { category, paymentStatus },
      page,
      limit
    );

    // Get expense categories for filter
    const categories = [
      'Rent',
      'Utilities',
      'Salaries',
      'Inventory Purchase',
      'Marketing',
      'Transportation',
      'Maintenance',
      'Office Supplies',
      'Insurance',
      'Taxes',
      'Professional Fees',
      'Miscellaneous',
    ];

    res.render('expenseDashboard', {
      user,
      greeting,
      currentDate,
      expenses: result.data,
      pagination: result.pagination,
      categories,
      filters: { category, paymentStatus },
      pageTitle: 'Expense Management'
    });
  } catch (error) {
    console.error('Error rendering expense dashboard:', error);
    res.status(500).render('error', { message: 'Failed to load expense dashboard' });
  }
};

/**
 * Render Add Expense Form
 */
const renderAddExpenseForm = async (req, res) => {
  try {
    const user = req.user || {
      name: 'Admin',
      role: 'Administrator',
      email: 'admin@royalsuits.com'
    };

    const greeting = getGreeting();
    const currentDate = moment.tz('Asia/Kolkata').format('MMM DD, YYYY');

    const categories = [
      'Rent',
      'Utilities',
      'Salaries',
      'Inventory Purchase',
      'Marketing',
      'Transportation',
      'Maintenance',
      'Office Supplies',
      'Insurance',
      'Taxes',
      'Professional Fees',
      'Miscellaneous',
    ];

    res.render('addExpense', {
      user,
      greeting,
      currentDate,
      categories,
      pageTitle: 'Add Expense'
    });
  } catch (error) {
    console.error('Error rendering add expense form:', error);
    res.status(500).render('error', { message: 'Failed to load form' });
  }
};

/**
 * Render Edit Expense Form
 */
const renderEditExpenseForm = async (req, res) => {
  try {
    const user = req.user || {
      name: 'Admin',
      role: 'Administrator',
      email: 'admin@royalsuits.com'
    };

    const greeting = getGreeting();
    const currentDate = moment.tz('Asia/Kolkata').format('MMM DD, YYYY');

    const expense = await expenseService.getExpenseById(req.params.id);

    const categories = [
      'Rent',
      'Utilities',
      'Salaries',
      'Inventory Purchase',
      'Marketing',
      'Transportation',
      'Maintenance',
      'Office Supplies',
      'Insurance',
      'Taxes',
      'Professional Fees',
      'Miscellaneous',
    ];

    res.render('editExpense', {
      user,
      greeting,
      currentDate,
      expense,
      categories,
      pageTitle: 'Edit Expense'
    });
  } catch (error) {
    console.error('Error rendering edit expense form:', error);
    res.status(500).render('error', { message: 'Failed to load expense' });
  }
};

/**
 * Render Expense Details
 */
const renderExpenseDetails = async (req, res) => {
  try {
    const user = req.user || {
      name: 'Admin',
      role: 'Administrator',
      email: 'admin@royalsuits.com'
    };

    const greeting = getGreeting();
    const currentDate = moment.tz('Asia/Kolkata').format('MMM DD, YYYY');

    const expense = await expenseService.getExpenseById(req.params.id);

    res.render('viewExpense', {
      user,
      greeting,
      currentDate,
      expense,
      pageTitle: `Expense ${expense.expenseCode}`
    });
  } catch (error) {
    console.error('Error rendering expense details:', error);
    res.status(500).render('error', { message: 'Failed to load expense details' });
  }
};

/**
 * Create Expense API
 */
const createExpense = async (req, res) => {
  try {
    const data = {
      ...req.body,
      createdBy: req.user?._id, // Assuming auth middleware sets req.user
    };

    const expense = await expenseService.createExpense(data);

    res.status(201).json({
      ok: true,
      message: 'Expense created successfully',
      data: expense
    });
  } catch (error) {
    console.error('Error creating expense:', error);
    res.status(500).json({
      ok: false,
      message: error.message
    });
  }
};

/**
 * Get Expenses API
 */
const getExpenses = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const query = {
      category: req.query.category,
      paymentStatus: req.query.paymentStatus,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };

    const result = await expenseService.getExpenses(query, page, limit);

    res.json({
      ok: true,
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({
      ok: false,
      message: error.message
    });
  }
};

/**
 * Get Expense by ID API
 */
const getExpenseById = async (req, res) => {
  try {
    const expense = await expenseService.getExpenseById(req.params.id);

    res.json({
      ok: true,
      data: expense
    });
  } catch (error) {
    console.error('Error fetching expense:', error);
    res.status(404).json({
      ok: false,
      message: error.message
    });
  }
};

/**
 * Update Expense API
 */
const updateExpense = async (req, res) => {
  try {
    const expense = await expenseService.updateExpense(req.params.id, req.body);

    res.json({
      ok: true,
      message: 'Expense updated successfully',
      data: expense
    });
  } catch (error) {
    console.error('Error updating expense:', error);
    res.status(500).json({
      ok: false,
      message: error.message
    });
  }
};

/**
 * Delete Expense API (Soft delete - marks as cancelled)
 */
const deleteExpense = async (req, res) => {
  try {
    const expense = await expenseService.deleteExpense(req.params.id);

    res.json({
      ok: true,
      message: 'Expense deleted successfully',
      data: expense
    });
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({
      ok: false,
      message: error.message
    });
  }
};

/**
 * Get Expense Summary API
 */
const getExpenseSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        ok: false,
        message: 'Start date and end date are required'
      });
    }

    const Expense = require('../models/expenseModel');
    
    // Total expenses
    const totalExpenses = await Expense.aggregate([
      {
        $match: {
          expenseDate: {
            $gte: new Date(startDate),
            $lte: new Date(endDate),
          },
          status: 'Active',
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    // By category
    const byCategory = await Expense.getExpensesByCategory(startDate, endDate);

    // Payment status breakdown
    const byPaymentStatus = await Expense.aggregate([
      {
        $match: {
          expenseDate: {
            $gte: new Date(startDate),
            $lte: new Date(endDate),
          },
          status: 'Active',
        },
      },
      {
        $group: {
          _id: '$paymentStatus',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      ok: true,
      data: {
        totalExpenses: totalExpenses.length > 0 ? totalExpenses[0].total : 0,
        totalCount: totalExpenses.length > 0 ? totalExpenses[0].count : 0,
        byCategory,
        byPaymentStatus,
      }
    });
  } catch (error) {
    console.error('Error fetching expense summary:', error);
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
  renderExpenseDashboard,
  renderAddExpenseForm,
  renderEditExpenseForm,
  renderExpenseDetails,
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  getExpenseSummary,
};
