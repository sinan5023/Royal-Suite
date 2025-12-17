const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const OtpStore = require("../models/otpModel");
const sendOtp = require("../services/otpService");
const {
  sendOtpService,
  verifyOtpService,
  resendOtpService,
} = require("../services/authService");

const sendOtpController = async (req, res) => {
  try {
    const { companyId, email } = req.body;
    const response = await sendOtpService(companyId, email);
    if (response.ok) {
      res.status(200).cookie("otpToken", response.Otptoken).json({
        ok: response.ok,
        message: response.message,
        redirect: response.redirectTo,
      });
    } else {
      return res.status(400).json({
        ok: response.ok,
        message: response.message,
      });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ ok: false, message: "internal server error" });
  }
};
const verifyOtpController = async (req, res) => {
  console.log(req.body);
  const { otp } = req.body;
  const { Otptoken } = req.cookies;
  const decodedToken = await jwt.decode(Otptoken);
  const { email } = decodedToken;
  const response = await verifyOtpService(otp, email);
  if (response.ok) {
    res.status(200).cookie("token", token).json({
      ok: response.ok,
      message: response.message,
      redirectTo: response.redirectTo,
    });
  }
};

const resendOtpController = async (req, res) => {
  const { Otptoken } = req.cookies;
  const decodedToken = jwt.decode(Otptoken);
  const { email } = decodedToken;
  if (!Otptoken) {
    res.status(401).redirect("/unauthorized");
  }
  const response = await resendOtpService(Otptoken, email);
  if (response.ok) {
    res
      .status(200)
      .cookie("otpToken", response.token)
      .json({ ok: response.ok, message: response.messsage });
  } else {
    res.status(400).json({ ok: response.ok, message: response.messsage });
  }
};
module.exports = {
  sendOtpController,
  verifyOtpController,
  resendOtpController,
};
