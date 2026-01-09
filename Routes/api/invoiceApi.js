const express = require("express");
const router = express.Router();
const invoiceController = require("../../controller/invoiceController");
const authCheck = require("../../middlewares/authcheck")

// Generate invoice from booking
router.post("/generate" , authCheck, invoiceController.generateInvoice);

// Get invoice statistics
router.get("/stats" , authCheck, invoiceController.getInvoiceStats);

// Get all invoices
router.get("/" , authCheck, invoiceController.getInvoices);

router.get("/download/:token" ,  invoiceController.downloadInvoiceWithToken);

// Send invoice via WhatsApp
router.post("/:id/send-whatsapp" , authCheck, invoiceController.sendInvoiceWhatsApp);

router.get("/:id/download" , authCheck, invoiceController.downloadInvoiceById);

// Get single invoice
router.get("/:id" , authCheck, invoiceController.getInvoiceById);

// Update invoice
router.put("/:id" , authCheck, invoiceController.updateInvoice);

// Cancel invoice
router.delete("/:id" , authCheck, invoiceController.cancelInvoice);

// Record payment
router.post("/:id/payment" , authCheck, invoiceController.recordPayment);

// Refund security deposit
router.post("/:id/refund-deposit" , authCheck, invoiceController.refundDeposit);


module.exports = router;
