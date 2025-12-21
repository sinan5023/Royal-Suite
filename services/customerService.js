const Customer = require("../models/customerModel");

const addCustomerService = async (data, email) => {
  try {
    console.log(email)
    const {primaryMobile} = data
    const isCustomer = await Customer.findOne({email:email,primaryMobile:primaryMobile});
    if(isCustomer){
      console.log("reached is customer check")
        return {
            ok:false,
            message:"the Customer Already Exists"
        }
    }else{
      await Customer.insertOne(data)
      console.log("customer added succesfuly")
      return {ok:true,message:"customer added succesfully"}
    }
  } catch (error) {
    console.log(error)
    return {ok:false,message:"something happend"}
  }
};

module.exports = { addCustomerService };
