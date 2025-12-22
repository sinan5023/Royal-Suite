const mongoose = require("mongoose");
const Customer = require("../models/customerModel");
const getGreeting = require("../helpers/greeting");
const buildCustomerFilter = require("../helpers/customerSearchFilter");
const {
  addCustomerService,
  getCustomerService,
  getCustomerDetails,
  deleteCustomerService,
  updateCustomerService
} = require("../services/customerService");
const { escapeXML } = require("ejs");

const displayCustomerDashboard = async (req, res) => {
  data = {
    user: {
      name: "User",
      role: "owner",
    },
    greeting: getGreeting(),
    currentDate: new Date().toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
  };
  res.render("customerDashboard", data);
};

const displayAddCustomer = async (req, res) => {
  const data = {
    user: {
      name: "Jasi",
      role: "Manager",
    },
    greeting: "Good Afternoon",
    currentDate: "Monday, December 8, 2025",
  };
  data.recentCustomers =
    (await Customer.find({}).sort({ createdAt: -1 }).limit(5)) || null;
  res.render("addCustomer", data);
};

const addNewCustomer = async (req, res) => {
  try {
    const data = req.body;
    const { email } = data;
    const response = await addCustomerService(data, email);
    if (response.ok) {
      res
        .status(200)
        .json({ ok: true, message: "customer created succesfully" });
    } else {
      res.status(400).json({ ok: false, message: "customer already exists" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ ok: false, message: error.message });
  }
};

const getCustomers = async (req, res) => {
  try {
    const rawPage = parseInt(req.query.page, 10);
    const rawLimit = parseInt(req.query.limit, 10);
    const q = (req.query.q || "").trim();

    const response = await getCustomerService(rawPage, rawLimit, q);
    if (response.ok) {
      res.status(200).json(response);
    } else {
      res.status(500).json({
        ok: false,
        message: "Failed to fetch customers",
      });
    }
  } catch (err) {
    console.error("Error in /api/customers:", err);
    res.status(500).json({
      ok: false,
      message: "Failed to fetch customers",
    });
  }
};
const viewCustomerDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const response = await getCustomerDetails(id);
    if (response.ok) {
      res.status(200).render("viewCustomer", response.data);
    } else {
      res.status(404).json({ ok: false, message: response.message });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ ok: false, message: "internal server error" });
  }
};

const editCustomerDetails = async (req, res) => {
   try {
    const { id } = req.params;
    const response = await getCustomerDetails(id);
    if (response.ok) {
      res.status(200).render("editCustomer", response.data);
    } else {
      res.status(404).json({ ok: false, message: response.message });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ ok: false, message: "internal server error" });
  }
};

const updateCustomer = async(req,res)=>{
  try {
    const {id} = req.params
    const   data = req.body
    const response = await updateCustomerService(id,data)
    if(response.ok){
      res.status(200).json({ok:true,message:"customer updated sucesfully"})
    }
    else{
      res.status(400).json({ok:false,message:response.message})
    }
    
  } catch (error) {
    console.log(error);
    res.status(500).json({ ok: false, message: "internal server error" });
  }
}

const deleteCustomer = async(req,res)=>{
  try {
     const {id} = req.params
     const response = await deleteCustomerService(id)
     if(response.ok){
      res.status(200).json({ok:true,message:"user succesfully deleted"})
     }
     else{
      res.status(400).json({ok:false,message:response.message})
     }
    
  } catch (error) {
     console.log(error);
    res.status(500).json({ ok: false, message: "internal server error" });
  }

}
module.exports = {
  displayAddCustomer,
  addNewCustomer,
  displayCustomerDashboard,
  getCustomers,
  viewCustomerDetails,
  editCustomerDetails,
  updateCustomer,
  deleteCustomer

};
