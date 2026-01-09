const express = require("express")
const router = express.Router()
const authCheck = require("../../middlewares/authcheck")
const analyticsController = require("../../controller/analyticsController")
router.get('/revenue', authCheck, analyticsController.getRevenueAnalytics);
router.get('/sales-vs-expenses', authCheck, analyticsController.getSalesVsExpenses);
router.get('/expenses', authCheck, analyticsController.getExpenseAnalytics);
router.get('/daily-sales', authCheck, analyticsController.getDailySalesTrend);
router.get('/profit-margin', authCheck, analyticsController.getProfitMargin);
router.get('/export', authCheck, analyticsController.exportAnalyticsReport);
module.exports  = router