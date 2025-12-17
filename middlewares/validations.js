const joi = require("joi");
const defaultOptions = {
  abortEarly: false, 
  stripUnknown: true, 
};

function validate(schema, options = {}) {
  return (req, res, next) => {
    const validationOptions = { ...defaultOptions, ...options };

    const { error, value } = schema.validate(req.body, validationOptions);

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message,
        })),
      });
    }

    req.body = value; // sanitized / validated
    next();
  };
}

module.exports = validate
