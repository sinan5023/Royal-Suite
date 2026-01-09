const express = require('express');
const router = express.Router();
const authCheck = require('../middlewares/authcheck');
const expenseController = require('../controller/expenseController');

// Page Routes
router.get('/', authCheck, expenseController.renderExpenseDashboard);
router.get('/new', authCheck, expenseController.renderAddExpenseForm);
router.get('/:id', authCheck, expenseController.renderExpenseDetails);
router.get('/:id/edit', authCheck, expenseController.renderEditExpenseForm);

module.exports= router