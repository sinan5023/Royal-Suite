const express = require("express");
const {
  sendOtpController,
  verifyOtpController,
  resendOtpController,
} = require("../../controller/authContoller");
const {loginSchema,otpSchema} =require("../../ValidationSchema/authShema") 
const validate = require("../../middlewares/validations");
const router = express.Router();

router.post("/login",validate(loginSchema), sendOtpController);
router.post("/verifyOtp",validate(otpSchema), verifyOtpController);
router.post("/resendOtp", resendOtpController);
// router.post("/signup",signUpController)

module.exports = router;
