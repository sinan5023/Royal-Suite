const idParamSchema = Joi.object({
  id: Joi.string()
    .required()
    .regex(/^[0-9a-fA-F]{24}$/)
    .messages({
      'string.empty': 'Booking ID is required',
      'string.pattern.base': 'Invalid booking ID format',
      'any.required': 'Booking ID is required'
    })
});


module.exports = idParamSchema