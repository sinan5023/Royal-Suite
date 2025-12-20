const mongoose = require("mongoose");
const customer = require("../models/customerModel");
const { addCustomerService } = require("../");

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
    console.log(req.body)
    const data  = req.body
    const {email} = data
    const response = await addCustomerService(data,email)
    if(response.ok){

    }
    else{
      
    }

  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
};
module.exports = { DisplayAddCustomer, addNewCustomer };
