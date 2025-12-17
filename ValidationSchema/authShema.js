const joi = require("joi")

const loginSchema = joi.object({
    email:joi.string().email().required(),
    companyId:joi.string().min(5).max(5).required()
})

const otpSchema = joi.object({
    otp:joi.number().min(6).max(6).required()
})

module.exports = {loginSchema,otpSchema}