const jwt = require("jsonwebtoken");
const {
  sendOtpService,
  verifyOtpService,
  resendOtpService,
} = require("../services/authService");

const sendOtpController = async (req, res) => {
  try {
    const { companyId, email } = req.body;
    const response = await sendOtpService(companyId, email);
    const { Otptoken } = response;
    if (response.ok) {
      res.status(200).cookie("Otptoken", Otptoken).json({
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
    res.status(200).cookie("token", response.token).json({
      ok: response.ok,
      message: response.message,
      redirectTo: response.redirectTo,
    });
  } else {
    res.status(403).json({ ok: response.ok, message: response.message });
  }
};

const resendOtpController = async (req, res) => {
  try {
    const { Otptoken } = req.cookies;
    const decodedToken = jwt.decode(Otptoken);
    const { email } = decodedToken;
    if (!Otptoken) {
      req.status(403).redirect("/");
    }
    const response = await resendOtpService(email);
    if (response.ok) {
      res.status(200).cookie("Otptoken", response.Otptoken).json({ ok:true, message: response.message });
    } else if (response.ok===false || !response) {
      res.status(400).json({ ok: response.ok, message: response.message });
    }
  } catch (error) {
    res.status(500).json({ ok: false, message: "error sending an otp" });
    console.log(error);
  }
};
module.exports = {
  sendOtpController,
  verifyOtpController,
  resendOtpController,
};
