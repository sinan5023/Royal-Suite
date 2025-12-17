const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const OtpStore = require("../models/otpModel");
const sendOtp = require("./otpService");

const sendOtpService = async (companyId,email)=>{
    const user = await User.findOne({ email: email });
    const otp = Math.floor(100000 + Math.random() * 900000);
      if (!user) {
        res.status(401).json({ ok: false, msg: "User Not Found" });
      } else {
        if (user.companyId === companyId && email === user.email) {
          const payload = {
            email: user.email,
            purpose: "verify-otp",
          };
          await sendOtp(email, otp);
          const token = await jwt.sign(payload, process.env.OTP_TOKEN_SECRET, {
            expiresIn: "3m",
          });
          OtpStore.create({
            email,
            otp,
            expiresAt: new Date(Date.now() + 2 * 60 * 1000),
          });
          return {
            ok: true,
            redirectTo: "/verifyOtp",
            Otptoken:token
          }
        } else {
        //   return res.status(401).json({ ok: false, msg: "Failed to Send Otp" });
        }
      }
}


module.exports = {sendOtpService}