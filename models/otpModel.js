const mongoose = require("mongoose");
const otpSchema = new mongoose.Schema({
  email: { type: String, required: true, index: true },
  otp: { type: String, required: true },
  purpose: { type: String, default: "login" },
  expiresAt: { type: Date, required: true },
  consumed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
module.exports = mongoose.model("otp", otpSchema);
