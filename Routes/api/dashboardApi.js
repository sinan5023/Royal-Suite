const express = require("express");
const router = express.Router();
const authCheck = require("../../middlewares/authcheck");
const dashboardController = require("../../controller/dashboardController");
const Booking = require("../../models/bookingModel")
const moment = require("moment-timezone");


// api 
//stats api 
router.get("/stats", authCheck, dashboardController.getStats);
// gets deliveries for today tommorow and day after tommorow 
router.get("/deliveries", authCheck, dashboardController.getDeliveries);
// get the upcoming return 
router.get("/returns", authCheck, dashboardController.getReturns);
// gets the notification 
// notification is currently pending hasnt implemented history feature and all 
router.get("/notifications", authCheck, dashboardController.getNotifications);
module.exports = router;
