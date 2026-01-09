const express = require("express");
const authCheck = require("../middlewares/authcheck");
const router = express.Router();
const bookingsController = require("../controller/bookingController");
// List all bookings page
router.get('/',authCheck, bookingsController.getBookingsPage);
// Create new booking page
router.get('/new',authCheck, bookingsController.getCreateBookingPage);

// View single booking page
router.get('/:id',authCheck, bookingsController.getViewBookingPage);

// Edit booking page
router.get('/:id/edit',authCheck, bookingsController.getEditBookingPage);

module.exports = router;
