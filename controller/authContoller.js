const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const OtpStore = require("../models/otpModel");
const sendOtp = require("../services/otpService");
const {sendOtpService} = require("../services/authService")

const sendOtpController = async (req, res) => {
  
  const { companyId, email } = req.body;
  const response = await sendOtpService(companyId,email)
  console.log(response)
  if(response.ok){
    res.status(200).json({response})
  }
};
const verifyOtpController = async (req, res) => {
  console.log(req.body);
  const { otp } = req.body;
  const { Otptoken } = req.cookies;
  const decodedToken = await jwt.decode(Otptoken);
  const { email } = decodedToken;
  const code = await OtpStore.findOne({ email: email, consumed: false });
  console.log(code);
  if (!code) {
    return res.status(400).json({
      ok: false,
      msg: "Otp Expired",
    });
  }
  if (otp === code.otp) {
    const user = await User.findOne({ email: email });
    code.consumed = true;
    console.log(user);
    const payload = {
      _id: user._id,
      email: user.email,
      role: user.role,
    };
    await code.save();
    const token = await jwt.sign(payload, process.env.JWT_SECRET);
    res.status(200).cookie("token", token).json({
      ok: true,
      msg: "succesfull log in",
      redirectTo: "/homeDashboard",
    });
  } else {
    res.status(400).json({
      ok: false,
      msg: "Incorrect OTP",
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
  const code = await OtpStore.findOne({ email: email });
  if (!code || code.consumed === true) {
    const otp = Math.floor(100000 + Math.random() * 900000);
    await sendOtp(email, otp);
    const payload = {
      email: email,
      purpose: "verify-otp",
    };
    const token = await jwt.sign(payload, process.env.OTP_TOKEN_SECRET, {
      expiresIn: "3m",
    });
    OtpStore.create({
      email,
      otp,
      expiresAt: new Date(Date.now() + 2 * 60 * 1000),
    });
    res.status(200).cookie("Otptoken", token).json({
      ok: true,
      msg: "Otp sent succesfully",
    });
  }
  else{
    await sendOtp(email,code.otp)
    res.status(200).json({
      ok:true,
      msg:"Otp sent succesfully"
    })
  }
};
module.exports = {
  sendOtpController,
  verifyOtpController,
  resendOtpController,
};
