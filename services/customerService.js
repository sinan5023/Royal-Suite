const Customer = require("../models/customerModel");
const buildCustomerFilter = require("../helpers/customerSearchFilter");
const { findByIdAndUpdate } = require("../models/userModel");

const addCustomerService = async (data, email) => {
  try {
    console.log(email);
    const { primaryMobile } = data;
    const isCustomer = await Customer.findOne({
      email: email,
      primaryMobile: primaryMobile,
    });
    if (isCustomer) {
      console.log("reached is customer check");
      return {
        ok: false,
        message: "the Customer Already Exists",
      };
    } else {
      await Customer.insertOne(data);
      console.log("customer added succesfuly");
      return { ok: true, message: "customer added succesfully" };
    }
  } catch (error) {
    console.log(error);
    return { ok: false, message: "something happend" };
  }
};

const getCustomerService = async (rawPage, rawLimit, q) => {
  const page = Number.isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
  const limitCandidate = Number.isNaN(rawLimit) ? 10 : rawLimit;
  const limit = Math.min(Math.max(limitCandidate, 5), 50);

  const filter = buildCustomerFilter(q);

  const total = await Customer.countDocuments(filter);
  const totalPages = Math.max(Math.ceil(total / limit), 1);
  const safePage = Math.min(page, totalPages);
  const skip = (safePage - 1) * limit;

  const docs = await Customer.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const customers = docs.map((c) => ({
    id: c._id.toString(),
    name: c.fullName,
    code: c.customerCode || "",
    primaryMobile: c.primaryMobile || "",
    email: c.email || "",
    status: c.status || "Active",
    totalBookings: c.totalBookings || 0,
    outstandingBalance: c.outstandingBalance || 0,
  }));

  const from = total === 0 ? 0 : skip + 1;
  const to = Math.min(skip + customers.length, total);

  return {
    ok: true,
    data: customers,
    pagination: {
      page: safePage,
      limit,
      total,
      totalPages,
      from,
      to,
    },
  };
};

const getCustomerDetails = async (id) => {
  try {
    const customerData = await Customer.findById(id);
    console.log(customerData);
    const data = {
      user: { name: "sinan", role: "manager" },
      greeting: "Good Evening",
      currentDate: "Monday, 22 Dec 2025",
      customer: customerData,
    };
    if (customerData) {
      return {
        ok: true,
        data: data,
        message: "user fethced succesfully",
      };
    } else {
      return { ok: false, message: "user not found" };
    }
  } catch (error) {
    console.log(error);
    return { ok: false, message: "error Viewing Customer" };
  }
};

const updateCustomerService = async (id, data) => {
  try {
    const customer = await Customer.findById(id).lean();
    if (!customer) {
      return { ok: false, message: "Customer not found" };
    }

    const dbData = {
      fullName: customer.fullName,
      gender: customer.gender,
      dateOfBirth: customer.dateOfBirth,
      primaryMobile: customer.primaryMobile,
      alternateMobile: customer.alternateMobile,
      email: customer.email,

      // Address
      street: customer.street,
      city: customer.city,
      state: customer.state,
      postalCode: customer.postalCode,
      country: customer.country,

      // Business fields
      status: customer.status,
      preferredContact: customer.preferredContact,
      tags: customer.tags,
      customerNotes: customer.customerNotes,
      internalFlags: customer.internalFlags,
    };

    const inputData = {
      fullName: data.fullName,
      gender: data.gender,
      dateOfBirth: data.dateOfBirth,
      primaryMobile: data.primaryMobile,
      alternateMobile: data.alternateMobile,
      email: data.email,
      street: data.street,
      city: data.city,
      state: data.state,
      postalCode: data.postalCode,
      country: data.country,
      status: data.status,
      preferredContact: data.preferredContact,
      tags: data.tags,
      customerNotes: data.customerNotes,
      internalFlags: data.internalFlags,
    };

    // Deep comparison - ignores undefined/null fields from frontend
    const hasChanges = JSON.stringify(dbData) !== JSON.stringify(inputData);

    if (!hasChanges) {
      return { ok: false, message: "No changes detected" };
    }

    const updated = await Customer.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
      // Don't overwrite timestamps or auto-generated fields
      timestamps: false,
    }).lean();

    return {
      ok: true,
      message: "Customer updated successfully",
      customer: updated,
    };
  } catch (error) {
    console.error("Update error:", error);
    return { ok: false, message: "Update unsuccessful" };
  }
};

const deleteCustomerService = async (id) => {
  try {
    const userCheck = await Customer.findById(id);
    if (userCheck) {
      await Customer.findByIdAndDelete(id);
      return { ok: true, message: "customer succesfully deleted" };
    } else {
      return { ok: false, message: "user does not exist" };
    }
  } catch (error) {
    console.log(`user deleting error ${error}`);
    return { ok: false, message: "error deleting user" };
  }
};

module.exports = {
  addCustomerService,
  getCustomerService,
  getCustomerDetails,
  updateCustomerService,
  deleteCustomerService,
};
