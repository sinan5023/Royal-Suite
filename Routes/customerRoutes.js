const express = require("express")
const router = express.Router()
const authCheck = require("../middlewares/authcheck")
const {DisplayAddCustomer} = require("../controller/customerController")

// router.get("/",authCheck,)
router.get("/new",authCheck,DisplayAddCustomer)


module.exports = router