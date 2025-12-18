const joi = require("joi");

const loginSchema = joi.object({
  email: joi.string().email().required(),
  companyId: joi.string().min(5).max(5).required(),
});

const otpSchema = joi.object({
  otp: joi.string().length(6).pattern(/^\d+$/).required(),
});

module.exports = { loginSchema, otpSchema };
