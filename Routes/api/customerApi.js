const express = require("express")
const router = express.Router()
const {addNewCustomer} = require("../../controller/customerController")
router.post("/add",addNewCustomer)
module.exports = router
