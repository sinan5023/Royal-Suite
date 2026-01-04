const express = require("express")
const router = express.Router()
const invoiceController = require("../../controller/invoiceController")

// Generate invoice from booking
router.post('/generate', invoiceController.generateInvoice);

// Get invoice statistics
router.get('/stats', invoiceController.getInvoiceStats);

// Get all invoices
router.get('/', invoiceController.getInvoices);

// Get single invoice
router.get('/:id', invoiceController.getInvoiceById);

// Update invoice
router.put('/:id', invoiceController.updateInvoice);

// Cancel invoice
router.delete('/:id', invoiceController.cancelInvoice);

// Record payment
router.post('/:id/payment', invoiceController.recordPayment);

// Refund security deposit
router.post('/:id/refund-deposit', invoiceController.refundDeposit);

module.exports = router