const Expense = require('../models/expenseModel');

class ExpenseService {
  async createExpense(data) {
    try {
      const expense = new Expense(data);
      await expense.save();
      return expense;
    } catch (error) {
      throw new Error(`Failed to create expense: ${error.message}`);
    }
  }

  async getExpenses(query = {}, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;

      const filters = { status: { $ne: 'Cancelled' } };

      if (query.category) filters.category = query.category;
      if (query.paymentStatus) filters.paymentStatus = query.paymentStatus;
      if (query.startDate && query.endDate) {
        filters.expenseDate = {
          $gte: new Date(query.startDate),
          $lte: new Date(query.endDate),
        };
      }

      const total = await Expense.countDocuments(filters);
      const expenses = await Expense.find(filters)
        .sort({ expenseDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      return {
        data: expenses,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new Error(`Failed to fetch expenses: ${error.message}`);
    }
  }

  async getExpenseById(id) {
    try {
      const expense = await Expense.findById(id);
      if (!expense) {
        throw new Error('Expense not found');
      }
      return expense;
    } catch (error) {
      throw new Error(`Failed to fetch expense: ${error.message}`);
    }
  }

  async updateExpense(id, data) {
    try {
      const expense = await Expense.findByIdAndUpdate(id, data, {
        new: true,
        runValidators: true,
      });
      if (!expense) {
        throw new Error('Expense not found');
      }
      return expense;
    } catch (error) {
      throw new Error(`Failed to update expense: ${error.message}`);
    }
  }

  async deleteExpense(id) {
    try {
      const expense = await Expense.findByIdAndUpdate(
        id,
        { status: 'Cancelled' },
        { new: true }
      );
      if (!expense) {
        throw new Error('Expense not found');
      }
      return expense;
    } catch (error) {
      throw new Error(`Failed to delete expense: ${error.message}`);
    }
  }
}

module.exports = new ExpenseService();
