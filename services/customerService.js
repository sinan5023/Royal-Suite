const Customer = require("../models/customerModel");

const addCustomerService = async (data, email) => {
  try {
    const {primaryMobile} = data
    const isCustomer = await Customer.findOne({email,primaryMobile});
    if(isCustomer){
        return {
            ok:false,
            message:"the Customer Already Exists"
        }
    }
  } catch (error) {

  }
};

module.exports = { addCustomerService };
