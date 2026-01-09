const express = require("express");
const authCheck = require("../middlewares/authcheck");
const otpVerifyMiddleware = require("../middlewares/otpVerifyAuth");
const dashboardController = require("../controller/dashboardController");
const router = express.Router();
router.get("/", (req, res) => {
  res.render("loginPage");
});
router.get("/dashboard", authCheck, dashboardController.renderDashboard);
router.get("/unauthorized", (req, res) => {
  res.render("unauthorized");
});
// static route for the calendar view 
router.get("/calendar", authCheck, dashboardController.renderCalendar);

router.get("/verifyOtp", otpVerifyMiddleware, (req, res) => {
  res.render("verifyOtp");
});
module.exports = router;
