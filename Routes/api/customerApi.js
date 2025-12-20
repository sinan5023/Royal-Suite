const express = require("express")
const router = express.Router()
const {addNewCustomer} = require("../../controller/customerController")
const validate = require("../../middlewares/validations");
const {customerCreateSchema} = require("../../ValidationSchema/customerSchema")
router.post("/",validate(customerCreateSchema),addNewCustomer)
// router.patch("/")
module.exports = router
