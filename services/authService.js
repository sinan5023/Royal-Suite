const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const OtpStore = require("../models/otpModel");
const sendOtp = require("./otpService");

const sendOtpService = async (companyId, email) => {
  try {
    const user = await User.findOne({ email: email, companyId: companyId });
    const otp = Math.floor(100000 + Math.random() * 900000);
    console.log(otp);
    if (!user) {
      return { ok: false, message: "User Not Found" };
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
          message: "OTP send succesfully",
          Otptoken: token,
        };
      } else {
        return { ok: false, message: "failed to send OTP" };
      }
    }
  } catch (error) {
    return { ok: false, message: error.message };
  }
};

const verifyOtpService = async (otp, email) => {
  try {
    const code = await OtpStore.findOne({ email: email, consumed: false });
    console.log(code);
    if (!code) {
      return {
        ok: false,
        message: "Otp Expired",
      };
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
      return {
        ok: true,
        message: "succesfully Logged In",
        redirectTo: "/homeDashboard",
        token: token,
      };
    } else {
      return { ok: false, message: "invalid Otp" };
    }
  } catch (error) {
    return { ok: false, message: error.message };
  }
};

const resendOtpService = async (email, Otptoken) => {
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
    return {
      ok: true,
      messsage: "Otp sent succesfully",
      token: token,
    };
  } else {
    await sendOtp(email, code.otp);
    return {
      ok: true,
      messsage: "Otp sent succesfully",
      token: token,
    };
  }
};

module.exports = { sendOtpService, verifyOtpService, resendOtpService };
