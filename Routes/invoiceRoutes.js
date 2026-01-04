const express = require("express")
const router = express.Router()
const invoiceController = require("../controller/invoiceController")
//page routes 
// invoices dashboard
router.get('/', invoiceController.getInvoicesPage);
// Create new invoice page (MUST be before /:id)
router.get('/new', invoiceController.getCreateInvoicePage); 
// single invoice view
router.get('/:id', invoiceController.getViewInvoicePage);
// get edit page view
router.get('/:id/edit', invoiceController.getEditInvoicePage);
module.exports = router