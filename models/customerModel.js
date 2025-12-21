const mongoose = require("mongoose")

const customerSchema = new mongoose.Schema({
    customerCode: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true
  },
  primaryMobile: {
    type: String,
    required: [true, 'Primary mobile is required'],
    trim: true,
    match: [/^\+\d{1,3}\d{10}$/, 'Please enter a valid 10-digit mobile number']
  },
  alternateMobile: {
    type: String,
    trim: true,
    match: [/^\+\d{1,3}\d{10}$/, 'Please enter a valid 10-digit mobile number']
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  street: {
    type: String,
    trim: true
  },
  city: {
    type: String,
    trim: true
  },
  state: {
    type: String,
    trim: true
  },
  postalCode: {
    type: String,
    trim: true
  },
  country: {
    type: String,
    trim: true,
    default: 'India'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'blacklisted', 'vip'],
    default: 'active'
  },
  preferredContact: {
    type: String,
    enum: ['whatsapp', 'call', 'sms', 'email'],
    default: 'whatsapp'
  },
  tags: {
    type: String,
    trim: true
  },
  customerNotes: {
    type: String,
    trim: true
  },
  internalFlags: {
    type: String,
    trim: true
  },
  totalBookings: {
    type: Number,
    default: 0,
    min: 0
  },
  totalRevenue: {
    type: Number,
    default: 0,
    min: 0
  },
  outstandingBalance: {
    type: Number,
    default: 0
  },
  lastBookingAt: {
    type: Date
  }
}, {
  timestamps: true  // automatically adds createdAt and updatedAt
});
customerSchema.index({ primaryMobile: 1 });
customerSchema.index({ email: 1 });
customerSchema.index({ status: 1 });
customerSchema.index({ fullName: 'text' }); // text search


// Virtual for customer ID display
customerSchema.virtual('displayId').get(function() {
  return this.customerCode || this._id.toString().slice(-6);
});

// Pre-save hook to generate customer code if not provided
customerSchema.pre('save', async function () {
  if (!this.customerCode && this.isNew) {
    const count = await mongoose.model('Customer').countDocuments();
    this.customerCode = `CUST${String(count + 1).padStart(6, '0')}`;
  }
  // no next()
});

// Instance method to increment booking stats0
customerSchema.methods.recordBooking = async function(bookingAmount) {
  this.totalBookings += 1;
  this.totalRevenue += bookingAmount;
  this.lastBookingAt = new Date();
  return this.save();
};

customerSchema.statics.search = function(query) {
  return this.find({
    $or: [
      { fullName: new RegExp(query, 'i') },
      { primaryMobile: new RegExp(query, 'i') },
      { customerCode: new RegExp(query, 'i') },
      { email: new RegExp(query, 'i') }
    ]
  });
};

module.exports = mongoose.model("Customer",customerSchema)