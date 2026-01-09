const express = require('express');
const router = express.Router();
const authCheck = require('../../middlewares/authcheck');
const expenseController = require('../../controller/expenseController');

// CRUD Operations
router.post('/', authCheck, expenseController.createExpense);
router.get('/', authCheck, expenseController.getExpenses);
router.get('/summary', authCheck, expenseController.getExpenseSummary);
router.get('/:id', authCheck, expenseController.getExpenseById);
router.put('/:id', authCheck, expenseController.updateExpense);
router.delete('/:id', authCheck, expenseController.deleteExpense);

module.exports = router;