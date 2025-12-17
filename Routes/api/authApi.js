const express = require("express");
const {
  sendOtpController,
  verifyOtpController,
  resendOtpController,
} = require("../../controller/authContoller");
const router = express.Router();
router.post("/login", sendOtpController);
router.post("/verifyOtp", verifyOtpController);
router.post("/resendOtp", resendOtpController);
// router.post("/signup",signUpController)

module.exports = router;
