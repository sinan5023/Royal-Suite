// validation/productValidation.js
const Joi = require("joi");

const addProductSchema = Joi.object({
  sku: Joi.string().trim().max(100).allow("", null),

  displayName: Joi.string().trim().min(2).max(200).required(),

  category: Joi.string().trim().max(100).allow("", null),

  size: Joi.string().trim().max(50).allow("", null),
  color: Joi.string().trim().max(50).allow("", null),
  fabric: Joi.string().trim().max(100).allow("", null),
  heightRange: Joi.string().trim().max(50).allow("", null),
  chest: Joi.string().trim().max(50).allow("", null),
  waist: Joi.string().trim().max(50).allow("", null),
  otherMeasurements: Joi.string().trim().allow("", null),

  baseRent: Joi.number().min(0).allow(null),
  extraDayCharge: Joi.number().min(0).allow(null),
  securityDeposit: Joi.number().min(0).allow(null),

  branch: Joi.string().trim().max(100).allow("", null),
  storageLocation: Joi.string().trim().max(100).allow("", null),
  barcode: Joi.string().trim().max(200).allow("", null),

  conditionGrade: Joi.string()
    .trim()
    .valid("Excellent", "Good", "Fair", "Worn")
    .allow("", null),

  status: Joi.string()
    .trim()
    .valid("available", "rented", "maintenance", "damaged", "retired")
    .default("available"),

  dateAdded: Joi.date().iso().allow("", null),
  lastInspectionDate: Joi.date().iso().allow("", null),
  nextMaintenanceDue: Joi.date().iso().allow("", null),

  timesRented: Joi.number().integer().min(0).default(0),

  isRetired: Joi.alternatives()
    .try(Joi.boolean(), Joi.string().valid("true", "false"))
    .default(false),

  retirementReason: Joi.string().trim().max(200).allow("", null),
  disposalValue: Joi.number().min(0).allow(null),
  retirementNotes: Joi.string().trim().allow("", null),
}).unknown(false); // reject unexpected fields

module.exports = { addProductSchema };
