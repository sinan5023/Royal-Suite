const express = require("express");
const router = express.Router();
const authCheck = require("../../middlewares/authcheck")
const upload = require("../../middlewares/upload");
const { createProductController } = require("../../controller/inventoryController");
const {addProductSchema} = require("../../ValidationSchema/productSchema")
const validate = require("../../middlewares/validations")
const {getInventoryApi} = require("../../controller/inventoryController")
const productController = require("../../controller/inventoryController");

router.get("/",authCheck,productController.getProducts)
router.post("/",authCheck,validate(addProductSchema),upload.array("photos",10),productController.createProduct)
router.put("/:id",authCheck,validate(addProductSchema),productController.updateProduct)
router.delete("/:id",authCheck,productController.deleteProduct)
router.post('/:id/photos',authCheck, upload.array('photos', 10), productController.uploadProductPhotos);
router.delete('/:id/photos',authCheck, productController.deleteProductPhoto);



module.exports = router