const mongoose = require("mongoose")
const customer = require("../models/customerModel")



const addCustomerData = {
  user: {
    name: 'Jasi',
    role: 'Manager'
  },
  greeting: 'Good Afternoon',
  currentDate: 'Monday, December 8, 2025',
  recentCustomers: [
    
  ]
};






const DisplayAddCustomer = async(req,res)=>{
    addCustomerData.recentCustomers = await customer.find({}).sort({createdAt:-1}).limit(5) || null
    res.render("addCustomer",addCustomerData)
}


const addNewCustomer = async(req,res)=>{
    console.log(req.body)
    



}
module.exports = {DisplayAddCustomer,addNewCustomer}