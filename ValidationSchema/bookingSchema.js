const Joi = require('joi');

/**
 * Joi schema for creating a new booking
 */
const createBookingSchema = Joi.object({
  // Customer & Event Details
  customerId: Joi.string()
    .required()
    .regex(/^[0-9a-fA-F]{24}$/)
    .messages({
      'string.empty': 'Customer is required',
      'string.pattern.base': 'Invalid customer ID format',
      'any.required': 'Customer is required'
    }),

  eventType: Joi.string()
    .valid('Wedding', 'Corporate Event', 'Birthday Party', 'Anniversary', 'Conference', 'Photoshoot', 'Concert', 'Festival', 'Other')
    .required()
    .messages({
      'any.only': 'Invalid event type',
      'any.required': 'Event type is required'
    }),

  eventDate: Joi.date()
    .iso()
    .required()
    .messages({
      'date.base': 'Invalid event date',
      'any.required': 'Event date is required'
    }),

  eventVenue: Joi.string()
    .allow('', null)
    .max(200)
    .messages({
      'string.max': 'Event venue must not exceed 200 characters'
    }),

  bookingStatus: Joi.string()
    .valid('Draft', 'Confirmed', 'Completed', 'Cancelled', 'No Show')
    .default('Draft')
    .messages({
      'any.only': 'Invalid booking status'
    }),

  // Pickup Details
  pickupDate: Joi.date()
    .iso()
    .required()
    .messages({
      'date.base': 'Invalid pickup date',
      'any.required': 'Pickup date is required'
    }),

  pickupMethod: Joi.string()
    .valid('Store Pickup', 'Home Delivery', 'Courier')
    .required()
    .messages({
      'any.only': 'Invalid pickup method',
      'any.required': 'Pickup method is required'
    }),

  pickupTimeWindow: Joi.string()
    .allow('', null)
    .max(100)
    .messages({
      'string.max': 'Pickup time window must not exceed 100 characters'
    }),

  pickupStatus: Joi.string()
    .valid('Not Picked Up', 'Picked Up', 'Delayed', 'Cancelled')
    .default('Not Picked Up')
    .messages({
      'any.only': 'Invalid pickup status'
    }),

  // Return Details
  expectedReturnDate: Joi.date()
    .iso()
    .required()
    .greater(Joi.ref('pickupDate'))
    .messages({
      'date.base': 'Invalid expected return date',
      'date.greater': 'Expected return date must be after pickup date',
      'any.required': 'Expected return date is required'
    }),

  actualReturnDate: Joi.date()
    .iso()
    .allow(null)
    .messages({
      'date.base': 'Invalid actual return date'
    }),

  returnStatus: Joi.string()
    .valid('Not Returned', 'Returned', 'Overdue', 'Partially Returned')
    .default('Not Returned')
    .messages({
      'any.only': 'Invalid return status'
    }),

  // Items (Products)
  items: Joi.array()
    .items(
      Joi.object({
        productId: Joi.string()
          .required()
          .regex(/^[0-9a-fA-F]{24}$/)
          .messages({
            'string.empty': 'Product ID is required',
            'string.pattern.base': 'Invalid product ID format',
            'any.required': 'Product ID is required'
          }),

        productName: Joi.string()
          .allow('', null)
          .max(200),

        sku: Joi.string()
          .allow('', null)
          .max(100),

        quantity: Joi.number()
          .integer()
          .min(1)
          .required()
          .messages({
            'number.base': 'Quantity must be a number',
            'number.min': 'Quantity must be at least 1',
            'any.required': 'Quantity is required'
          }),

        rentalPrice: Joi.number()
          .min(0)
          .required()
          .messages({
            'number.base': 'Rental price must be a number',
            'number.min': 'Rental price cannot be negative',
            'any.required': 'Rental price is required'
          }),

        securityDeposit: Joi.number()
          .min(0)
          .default(0)
          .messages({
            'number.base': 'Security deposit must be a number',
            'number.min': 'Security deposit cannot be negative'
          }),

        subtotal: Joi.number()
          .min(0)
          .default(0)
      })
    )
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one product is required',
      'any.required': 'Products are required'
    }),

  // Financial Details
  subtotal: Joi.number()
    .min(0)
    .default(0)
    .messages({
      'number.min': 'Subtotal cannot be negative'
    }),

  discountType: Joi.string()
    .valid('None', 'Percentage', 'Fixed Amount', 'Promotional Code')
    .default('None')
    .messages({
      'any.only': 'Invalid discount type'
    }),

  discountValue: Joi.number()
    .min(0)
    .default(0)
    .when('discountType', {
      is: 'Percentage',
      then: Joi.number().max(100).messages({
        'number.max': 'Percentage discount cannot exceed 100%'
      })
    })
    .messages({
      'number.min': 'Discount value cannot be negative'
    }),

  taxRate: Joi.number()
    .min(0)
    .max(100)
    .default(18)
    .messages({
      'number.min': 'Tax rate cannot be negative',
      'number.max': 'Tax rate cannot exceed 100%'
    }),

  taxAmount: Joi.number()
    .min(0)
    .default(0)
    .messages({
      'number.min': 'Tax amount cannot be negative'
    }),

  securityDeposit: Joi.number()
    .min(0)
    .default(0)
    .messages({
      'number.min': 'Security deposit cannot be negative'
    }),

  totalAmount: Joi.number()
    .min(0)
    .default(0)
    .messages({
      'number.min': 'Total amount cannot be negative'
    }),

  amountPaid: Joi.number()
    .min(0)
    .default(0)
    .messages({
      'number.min': 'Amount paid cannot be negative'
    }),

  balanceDue: Joi.number()
    .default(0),

  paymentStatus: Joi.string()
    .valid('Unpaid', 'Partially Paid', 'Paid', 'Refunded', 'Overdue')
    .default('Unpaid')
    .messages({
      'any.only': 'Invalid payment status'
    }),

  // Notes
  customerNotes: Joi.string()
    .allow('', null)
    .max(1000)
    .messages({
      'string.max': 'Customer notes must not exceed 1000 characters'
    }),

  internalNotes: Joi.string()
    .allow('', null)
    .max(1000)
    .messages({
      'string.max': 'Internal notes must not exceed 1000 characters'
    }),

  // Invoice Reference
  invoiceId: Joi.string()
    .allow(null)
    .regex(/^[0-9a-fA-F]{24}$/)
    .messages({
      'string.pattern.base': 'Invalid invoice ID format'
    })
}).custom((value, helpers) => {
  // Custom validation: Event date must be between pickup and return dates
  const { pickupDate, expectedReturnDate, eventDate } = value;

  if (pickupDate && expectedReturnDate && eventDate) {
    const pickup = new Date(pickupDate);
    const returnDate = new Date(expectedReturnDate);
    const event = new Date(eventDate);

    if (event < pickup || event > returnDate) {
      return helpers.error('custom.eventDateRange');
    }
  }

  return value;
}).messages({
  'custom.eventDateRange': 'Event date must be between pickup date and return date'
});

/**
 * Joi schema for updating a booking
 */
const updateBookingSchema = Joi.object({
  customerId: Joi.string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .messages({
      'string.pattern.base': 'Invalid customer ID format'
    }),

  eventType: Joi.string()
    .valid('Wedding', 'Corporate Event', 'Birthday Party', 'Anniversary', 'Conference', 'Photoshoot', 'Concert', 'Festival', 'Other')
    .messages({
      'any.only': 'Invalid event type'
    }),

  eventDate: Joi.date()
    .iso()
    .messages({
      'date.base': 'Invalid event date'
    }),

  eventVenue: Joi.string()
    .allow('', null)
    .max(200)
    .messages({
      'string.max': 'Event venue must not exceed 200 characters'
    }),

  bookingStatus: Joi.string()
    .valid('Draft', 'Confirmed', 'Completed', 'Cancelled', 'No Show')
    .messages({
      'any.only': 'Invalid booking status'
    }),

  pickupDate: Joi.date()
    .iso()
    .messages({
      'date.base': 'Invalid pickup date'
    }),

  pickupMethod: Joi.string()
    .valid('Store Pickup', 'Home Delivery', 'Courier')
    .messages({
      'any.only': 'Invalid pickup method'
    }),

  pickupTimeWindow: Joi.string()
    .allow('', null)
    .max(100),

  pickupStatus: Joi.string()
    .valid('Not Picked Up', 'Picked Up', 'Delayed', 'Cancelled')
    .messages({
      'any.only': 'Invalid pickup status'
    }),

  expectedReturnDate: Joi.date()
    .iso()
    .messages({
      'date.base': 'Invalid expected return date'
    }),

  actualReturnDate: Joi.date()
    .iso()
    .allow(null)
    .messages({
      'date.base': 'Invalid actual return date'
    }),

  returnStatus: Joi.string()
    .valid('Not Returned', 'Returned', 'Overdue', 'Partially Returned')
    .messages({
      'any.only': 'Invalid return status'
    }),

  items: Joi.array()
    .items(
      Joi.object({
        productId: Joi.string()
          .regex(/^[0-9a-fA-F]{24}$/)
          .required(),
        productName: Joi.string().allow('', null),
        sku: Joi.string().allow('', null),
        quantity: Joi.number().integer().min(1).required(),
        rentalPrice: Joi.number().min(0).required(),
        securityDeposit: Joi.number().min(0).default(0),
        subtotal: Joi.number().min(0).default(0)
      })
    )
    .min(1),

  subtotal: Joi.number().min(0),
  discountType: Joi.string().valid('None', 'Percentage', 'Fixed Amount', 'Promotional Code'),
  discountValue: Joi.number().min(0),
  taxRate: Joi.number().min(0).max(100),
  taxAmount: Joi.number().min(0),
  securityDeposit: Joi.number().min(0),
  totalAmount: Joi.number().min(0),
  amountPaid: Joi.number().min(0),
  balanceDue: Joi.number(),
  paymentStatus: Joi.string().valid('Unpaid', 'Partially Paid', 'Paid', 'Refunded', 'Overdue'),
  customerNotes: Joi.string().allow('', null).max(1000),
  internalNotes: Joi.string().allow('', null).max(1000),
  invoiceId: Joi.string().allow(null).regex(/^[0-9a-fA-F]{24}$/)
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

/**
 * Joi schema for query parameters (pagination, filtering)
 */
const getBookingsQuerySchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.min': 'Page must be at least 1'
    }),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)
    .messages({
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
    }),

  q: Joi.string()
    .allow('')
    .max(200)
    .messages({
      'string.max': 'Search query must not exceed 200 characters'
    }),

  bookingStatus: Joi.string()
    .valid('Draft', 'Confirmed', 'Completed', 'Cancelled', 'No Show')
    .messages({
      'any.only': 'Invalid booking status filter'
    }),

  paymentStatus: Joi.string()
    .valid('Unpaid', 'Partially Paid', 'Paid', 'Refunded', 'Overdue')
    .messages({
      'any.only': 'Invalid payment status filter'
    }),

  pickupStatus: Joi.string()
    .valid('Not Picked Up', 'Picked Up', 'Delayed', 'Cancelled')
    .messages({
      'any.only': 'Invalid pickup status filter'
    }),

  returnStatus: Joi.string()
    .valid('Not Returned', 'Returned', 'Overdue', 'Partially Returned')
    .messages({
      'any.only': 'Invalid return status filter'
    }),

  customerId: Joi.string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .messages({
      'string.pattern.base': 'Invalid customer ID format'
    }),

  startDate: Joi.date()
    .iso()
    .messages({
      'date.base': 'Invalid start date'
    }),

  endDate: Joi.date()
    .iso()
    .greater(Joi.ref('startDate'))
    .messages({
      'date.base': 'Invalid end date',
      'date.greater': 'End date must be after start date'
    })
});

module.exports = {
  createBookingSchema,
  updateBookingSchema,
  getBookingsQuerySchema
};
