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



/**
 * Search customers for Select2 dropdown
 * @route GET /api/customers/search
 */
const searchCustomers = async (req, res) => {
  try {
    const { q = '', page = 1, limit = 20 } = req.query;
    
    const query = {};
    
    // Search by name, mobile, or email
    if (q && q.trim() !== '') {
      query.$or = [
        { fullName: new RegExp(q, 'i') },
        { primaryMobile: new RegExp(q, 'i') },
        { email: new RegExp(q, 'i') },
        { code: new RegExp(q, 'i') }
      ];
    }
    
    // Exclude blacklisted customers
    query.status = { $ne: 'blacklisted' };
    
    const total = await Customer.countDocuments(query);
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const customers = await Customer.find(query)
      .select('_id fullName primaryMobile email code')
      .sort({ name: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    res.json({
      ok: true,
      data: customers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error searching customers:', error);
    res.status(500).json({
      ok: false,
      message: 'Failed to search customers',
      error: error.message
    });
  }
};




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
  deleteCustomer,
  searchCustomers

};
