const express = require("express");
const authCheck = require("../middlewares/authcheck");
const router = express.Router();
const bookingsController = require("../controller/bookingController");
// List all bookings page
router.get('/', bookingsController.getBookingsPage);
// Create new booking page
router.get('/new', bookingsController.getCreateBookingPage);

// View single booking page
router.get('/:id', bookingsController.getViewBookingPage);

// Edit booking page
router.get('/:id/edit', bookingsController.getEditBookingPage);

module.exports = router;
