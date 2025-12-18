const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const OtpStore = require("../models/otpModel");
const sendOtp = require("./otpTransportService");
const otpGenerator = require("./otpGeneratorService");
const { date } = require("joi");

const sendOtpService = async (companyId, email) => {
  try {
    const user = await User.findOne({ email: email, companyId: companyId });
    const otp = await otpGenerator();
    console.log(otp);
    if (!user) {
      return { ok: false, message: "User Not Found" };
    } else {
      if (user.companyId === companyId && email === user.email) {
        const payload = {
          email: user.email,
          purpose: "Otp-Verification",
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
    const code = await OtpStore.findOne({ email: email, consumed: false }).sort(
      { createdAt: -1 }
    );
    if (!code) {
      return {
        ok: false,
        message: "Otp Expired",
      };
    }
    if (otp === code.otp) {
      const user = await User.findOne({ email: email });
      code.consumed = true;
      await code.save();
      console.log(user);
      const payload = {
        _id: user._id,
        email: user.email,
        role: user.role,
      };
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

const resendOtpService = async (email) => {
  try {
    const code = await OtpStore.findOne({ email: email, consumed: false }).sort(
      { createdAt: -1 }
    );
    if (!code || code === undefined) {
      const otp = await otpGenerator();
      console.log(otp);
      await sendOtp(email, otp);
      const payload = {
        email,
        purpose: "Otp-Verification",
      };
      const token = await jwt.sign(payload, process.env.OTP_TOKEN_SECRET, {
        expiresIn: "3m",
      });
      await OtpStore.create({
        email,
        otp,
        expiresAt: new Date(Date.now() + 2 * 60 * 1000),
      });
      return {
        ok: true,
        message: "Otp Resend Succesfully",
        Otptoken: token,
      };
    } else {
      const payload = {
        email,
        purpose: "Otp-Verification",
      };
      const token = await jwt.sign(payload, process.env.OTP_TOKEN_SECRET, {
        expiresIn: "3m",
      });
      console.log(code.otp);
      return {
        ok: true,
        message: "Otp Resend Succesfully",
        Otptoken: token,
      };
    }
  } catch (error) {
    console.log(error);
    return { ok: false, message: "Internal server error" };
  }
};

module.exports = { sendOtpService, verifyOtpService, resendOtpService };
