const express = require("express")
const router = express.Router()
const invoiceController = require("../controller/invoiceController");
const authCheck = require("../middlewares/authcheck");
//page routes 
// invoices dashboard
router.get('/',authCheck, invoiceController.getInvoicesPage);
// Create new invoice page (MUST be before /:id)
router.get('/new',authCheck, invoiceController.getCreateInvoicePage); 
// single invoice view
router.get('/:id',authCheck, invoiceController.getViewInvoicePage);
// get edit page view
router.get('/:id/edit',authCheck, invoiceController.getEditInvoicePage);
module.exports = router