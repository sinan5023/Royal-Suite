const express = require("express");
const router = express.Router();
const authCheck = require("../../middlewares/authcheck");
const {
  addNewCustomer,
  getCustomers,
  viewCustomerDetails,
  editCustomerDetails,
  updateCustomer,
  deleteCustomer,
  searchCustomers,
} = require("../../controller/customerController");
const validate = require("../../middlewares/validations");
const {
  customerCreateSchema,
} = require("../../ValidationSchema/customerSchema");
router.post("/", authCheck, validate(customerCreateSchema), addNewCustomer);
router.get("/", authCheck, getCustomers);
router.get("/search", searchCustomers);
router.put("/:id", validate(customerCreateSchema), authCheck, updateCustomer);
router.delete("/:id", authCheck, deleteCustomer);
router.get("/:id", authCheck, viewCustomerDetails);
router.get("/:id/edit", authCheck, editCustomerDetails);
module.exports = router;
