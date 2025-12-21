const mongoose = require("mongoose");
const customer = require("../models/customerModel");
const { addCustomerService } = require("../services/customerService");

const addCustomerData = {
  user: {
    name: "Jasi",
    role: "Manager",
  },
  greeting: "Good Afternoon",
  currentDate: "Monday, December 8, 2025",
};

const DisplayAddCustomer = async (req, res) => {
  addCustomerData.recentCustomers =
    (await customer.find({}).sort({ createdAt: -1 }).limit(5)) || null;
  res.render("addCustomer", addCustomerData);
};

const addNewCustomer = async (req, res) => {
  try {
    const data  = req.body
    const {email} = data
    const response = await addCustomerService(data,email)
    if(response.ok){
      res.status(200).json({ok:true,message:"customer created succesfully"})

    }
    else{
      res.status(400).json({ok:false,message:"customer already exists"})
      
    }

  } catch (error) {
    console.log(error)
    res.status(500).json({ ok: false, message: error.message });
  }
};
module.exports = { DisplayAddCustomer, addNewCustomer };
