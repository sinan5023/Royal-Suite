const express = require("express")
const router = express.Router()
const authCheck = require('../middlewares/authcheck');
const analyticsController = require('../controller/analyticsController');
router.get('/', authCheck, analyticsController.renderAnalyticsDashboard);

module.exports  = router