const express = require('express');
const router = express.Router();
const bookingsController = require('../../controller/bookingController');
const customervalidation = require('../../ValidationSchema/bookingSchema');
const authCheck = require('../../middlewares/authcheck');
const validate = require('../../middlewares/validations');
const { checkInvoiceBeforeEdit, checkInvoiceBeforePayment } = require('../../middlewares/bookingcheck');
const invoiceController = require('../../controller/invoiceController');

router.get('/', authCheck, bookingsController.getBookings);

// Get available products for date range
router.get('/available-products', authCheck, validate(customervalidation.getBookingsQuerySchema), bookingsController.getAvailableProducts);

// Create new booking
router.post('/', authCheck, validate(customervalidation.createBookingSchema), bookingsController.createBooking);

// Get single booking
router.get('/:id', authCheck, bookingsController.getBookingById);

// Update booking (check invoice first)
router.put('/:id', checkInvoiceBeforeEdit, authCheck, validate(customervalidation.updateBookingSchema), bookingsController.updateBooking);

// Delete booking
router.delete('/:id', authCheck, bookingsController.deleteBooking);

// Mark as picked up
router.put('/:id/pickup' , authCheck, bookingsController.markBookingPickedUp);

// Mark as returned
router.put('/:id/return' , authCheck, bookingsController.markBookingReturned);

// ✅ Record payment (CHECK INVOICE FIRST)
router.post('/:id/payment' , authCheck, checkInvoiceBeforePayment, bookingsController.recordPayment);

// Track the reminder status
router.post('/:id/reminder-log' , authCheck, bookingsController.logReminder);

// Checks the invoice before generating
router.get('/:bookingId/invoice-check' , authCheck, invoiceController.checkInvoiceForBooking);

module.exports = router;
