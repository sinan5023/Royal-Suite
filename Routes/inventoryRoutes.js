const express = require('express')
const router = express.Router()
const authCheck = require("../middlewares/authcheck")
const productController = require("../controller/inventoryController");
router.get("/",authCheck, productController.listInventory);
router.get("/new",authCheck, productController.addProductPage);
router.get("/:id/edit",authCheck, productController.editProductPage);
router.get("/:id",authCheck, productController.viewProduct);

module.exports = router