const Invoice = require('../models/invoiceModel');

/**
 * Middleware to check if invoice exists before editing booking
 * Prevents editing bookings that already have invoices
 */
const checkInvoiceBeforeEdit = async (req, res, next) => {
  try {
    const bookingId = req.params.id;
    
    // Check if invoice exists for this booking
    const invoice = await Invoice.findOne({ bookingId }).select('_id invoiceNumber status').lean();
    
    if (invoice) {
      return res.status(403).json({
        ok: false,
        message: 'Cannot edit booking. Invoice already generated.',
        invoiceNumber: invoice.invoiceNumber,
        invoiceId: invoice._id,
        suggestion: 'Please edit the invoice instead or cancel it first.'
      });
    }
    
    next();
  } catch (error) {
    console.error('Error checking invoice:', error);
    return res.status(500).json({
      ok: false,
      message: 'Failed to verify invoice status',
      error: error.message
    });
  }
};

/**
 * Middleware to check if invoice exists before recording payment
 * Redirects payment to invoice if exists
 */
const checkInvoiceBeforePayment = async (req, res, next) => {
  try {
    const bookingId = req.params.id;
    
    // Check if invoice exists for this booking
    const invoice = await Invoice.findOne({ bookingId })
      .select('_id invoiceNumber status balanceDue')
      .lean();
    
    if (invoice) {
      return res.status(403).json({
        ok: false,
        message: 'Cannot record payment on booking. Invoice already exists.',
        invoiceNumber: invoice.invoiceNumber,
        invoiceId: invoice._id,
        balanceDue: invoice.balanceDue,
        redirectUrl: `/invoices/${invoice._id}`,
        suggestion: 'Please record payment through the invoice instead.'
      });
    }
    
    next();
  } catch (error) {
    console.error('Error checking invoice:', error);
    return res.status(500).json({
      ok: false,
      message: 'Failed to verify invoice status',
      error: error.message
    });
  }
};

module.exports = {
  checkInvoiceBeforeEdit,
  checkInvoiceBeforePayment
};
