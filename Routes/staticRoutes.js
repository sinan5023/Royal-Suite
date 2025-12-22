const express = require("express");
const authCheck = require("../middlewares/authcheck");
const otpVerifyMiddleware = require("../middlewares/otpVerifyAuth");
const {displayDashboard} = require("../controller/dashboardContoller");
const router = express.Router();
router.get("/", (req, res) => {
  res.render("loginPage");
});
router.get("/dashboard", authCheck, displayDashboard);
router.get("/unauthorized", (req, res) => {
  res.render("unauthorized");
});
router.get("/verifyOtp", otpVerifyMiddleware, (req, res) => {
  res.render("verifyOtp");
});
module.exports = router;
