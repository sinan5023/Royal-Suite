const express = require("express")
const router = express.Router()
const authCheck = require("../middlewares/authcheck")
const {displayAddCustomer , displayCustomerDashboard} = require("../controller/customerController")

router.get("/",authCheck, displayCustomerDashboard)
router.get("/new",authCheck,displayAddCustomer)


module.exports = router