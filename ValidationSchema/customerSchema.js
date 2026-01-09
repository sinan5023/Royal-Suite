const joi = require("joi");

// fullName: 'asasdasdasd',
//   gender: 'female',
//   dateOfBirth: '122112-02-11',
//   alternatePhone: '1234567890',
//   email: 'moahhe@gmail.com',
//   preferredContact: 'whatsapp',
//   city: 'asdasd',
//   state: 'asdasd',
//   postalCode: '123456',
//   country: 'adsasdasdasdasdas',
//   customerNotes: '',
//   internalFlags: '',
//   whatsappAvailable: false,
//   primaryMobile: '+911234567890',
//   alternateMobile: '+911234567890',
//   street: 'adasd'

const Joi = require("joi");

const customerCreateSchema = Joi.object({
  // Personal info
  fullName: Joi.string().min(2).max(100).required().messages({
    "string.empty": "Full name is required",
    "string.min": "Full name must be at least 2 characters",
  }),

  gender: Joi.string().valid("male", "female", "other").required().messages({
    "any.only": "Gender must be Male, Female or Other",
    "string.empty": "Gender is required",
  }),

  dateOfBirth: Joi.date().iso().less("now").required().messages({
    "date.base": "Date of birth must be a valid date",
    "date.less": "Date of birth must be in the past",
    "any.required": "Date of birth is required",
  }),

  // Contact
  primaryMobile: Joi.string()
    .pattern(/^\+\d{1,3}\d{10}$/)
    .required()
    .messages({
      "string.pattern.base":
        "Primary mobile must be country code + 10 digits (e.g. +911234567890)",
      "string.empty": "Primary mobile is required",
    }),

  alternateMobile: Joi.string()
    .pattern(/^\+\d{1,3}\d{10}$/)
    .allow(null, "")
    .messages({
      "string.pattern.base":
        "Alternate mobile must be country code + 10 digits (e.g. +911234567890)",
    }),
  preferredContact: Joi.string()
    .valid("whatsapp", "call", "sms", "email")
    .required()
    .messages({
      "any.only": "Preferred contact must be WhatsApp, Call, SMS, or Email",
      "string.empty": "Preferred contact channel is required",
    }),

  whatsappAvailable: Joi.boolean().default(false),

  // Address
  street: Joi.string().min(3).max(200).required().messages({
    "string.empty": "Street address is required",
  }),

  city: Joi.string().min(2).max(100).required().messages({
    "string.empty": "City is required",
  }),

  state: Joi.string().min(2).max(100).required().messages({
    "string.empty": "State/Region is required",
  }),

  postalCode: Joi.string()
    .pattern(/^\d{6}$/)
    .required()
    .messages({
      "string.pattern.base": "Postal code must be 6 digits",
      "string.empty": "Postal code is required",
    }),

  country: Joi.string().min(2).max(100).required().messages({
    "string.empty": "Country is required",
  }),

  customerNotes: Joi.string().allow("", null).max(1000),

  internalFlags: Joi.string().allow("", null).max(1000),
});

module.exports = { customerCreateSchema };
