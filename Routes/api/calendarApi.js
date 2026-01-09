const express = require("express")
const router  = express.Router()
const authCheck = require("../../middlewares/authcheck")
const dashboardController = require("../../controller/dashboardController")
// give calednar data according to the date range
router.get("/bookings", authCheck, dashboardController.getCalendarBookings);
module.exports = router