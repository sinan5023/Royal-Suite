const { string, required } = require("joi");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const customerSchema = new mongoose.Schema(
  {
    customerCode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
    },
    gender: {
      type: String,
      required: true,
      enum: ["male", "female", "other"],
    },
    dateOfBirth: {
      type: String,
      required: true,
    },
    primaryMobile: {
      type: String,
      required: [true, "Primary mobile is required"],
      trim: true,
      match: [
        /^\+\d{1,3}\d{10}$/,
        "Please enter a valid 10-digit mobile number",
      ],
    },
    alternateMobile: {
      type: String,
      trim: true,
      match: [
        /^\+\d{1,3}\d{10}$/,
        "Please enter a valid 10-digit mobile number",
      ],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    street: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    postalCode: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
      default: "India",
    },
    status: {
      type: String,
      enum: ["active", "inactive", "blacklisted", "vip"],
      default: "active",
    },
    preferredContact: {
      type: String,
      enum: ["whatsapp", "call", "sms", "email"],
      default: "whatsapp",
    },
    tags: {
      type: String,
      trim: true,
    },
    customerNotes: {
      type: String,
      trim: true,
    },
    internalFlags: {
      type: String,
      trim: true,
    },
    totalBookings: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalRevenue: {
      type: Number,
      default: 0,
      min: 0,
    },
    outstandingBalance: {
      type: Number,
      default: 0,
    },
    lastBookingAt: {
      type: Date,
    },
    
    // ========================================
    // CUSTOMER PORTAL CREDENTIALS
    // ========================================
    portalCredentials: {
      username: {
        type: String,
        unique: true,
        sparse: true, // Allows null but enforces uniqueness when present
      },
      password: {
        type: String,
      },
      plainPassword: {
        type: String, // Store temporarily to show customer on first creation
      },
      isActive: {
        type: Boolean,
        default: true,
      },
      lastLogin: {
        type: Date,
      },
      failedLoginAttempts: {
        type: Number,
        default: 0,
      },
      accountLocked: {
        type: Boolean,
        default: false,
      },
      lockedUntil: {
        type: Date,
      },
      passwordChangedAt: {
        type: Date,
      },
      firstLogin: {
        type: Boolean,
        default: true,
      },
    },
  },
  {
    timestamps: true, // automatically adds createdAt and updatedAt
  }
);

customerSchema.index({ primaryMobile: 1 });
customerSchema.index({ email: 1 });
customerSchema.index({ status: 1 });
customerSchema.index({ fullName: "text" }); // text search
customerSchema.index({ "portalCredentials.username": 1 }); // Portal login index

// Virtual for customer ID display
customerSchema.virtual("displayId").get(function () {
  return this.customerCode || this._id.toString().slice(-6);
});

// ========================================
// PRE-SAVE HOOKS
// ========================================

// Pre-save hook to generate customer code if not provided
customerSchema.pre("save", async function () {
  if (!this.customerCode && this.isNew) {
    const count = await mongoose.model("Customer").countDocuments();
    this.customerCode = `CUST${String(count + 1).padStart(6, "0")}`;
  }
});

// Pre-save hook to generate portal credentials
customerSchema.pre("save", async function () {
  try {
    // Only generate credentials if:
    // 1. This is a new customer OR
    // 2. Primary mobile has changed OR
    // 3. Full name has changed
    const shouldGenerateCredentials =
      this.isNew ||
      this.isModified("primaryMobile") ||
      this.isModified("fullName");

    if (shouldGenerateCredentials) {
      // Extract last 10 digits from primaryMobile (remove country code)
      // Example: +919876543210 -> 9876543210
      const mobileDigits = this.primaryMobile.replace(/\D/g, "").slice(-10);

      // Username = Mobile number (last 10 digits)
      this.portalCredentials.username = mobileDigits;

      // Password = First 4 letters of name (lowercase) + Last 4 digits of mobile
      // Example: "John Doe" + "9876543210" = "john3210"
      const namePrefix = this.fullName
        .toLowerCase()
        .replace(/[^a-z]/g, "") // Remove non-alphabetic characters
        .substring(0, 4)
        .padEnd(4, "x"); // Pad with 'x' if name is less than 4 characters

      const phoneSuffix = mobileDigits.slice(-4);
      const plainPassword = namePrefix + phoneSuffix;

      // Store plain password temporarily (will be cleared after first use)
      this.portalCredentials.plainPassword = plainPassword;

      // Hash the password with bcrypt
      const salt = await bcrypt.genSalt(10);
      this.portalCredentials.password = await bcrypt.hash(plainPassword, salt);

      console.log(`✅ Generated portal credentials for ${this.fullName}:`);
      console.log(`   Username: ${this.portalCredentials.username}`);
      console.log(`   Password: ${plainPassword}`);
      console.log(`   (Save these to share with customer)`);
    }
  } catch (error) {
    console.error("Error generating portal credentials:", error);
    // Don't throw error - allow customer creation to proceed
  }
});

// ========================================
// INSTANCE METHODS
// ========================================

// Instance method to increment booking stats
customerSchema.methods.recordBooking = async function (bookingAmount) {
  this.totalBookings += 1;
  this.totalRevenue += bookingAmount;
  this.lastBookingAt = new Date();
  return this.save();
};

// Compare password for login
customerSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.portalCredentials.password);
};

// Increment failed login attempts
customerSchema.methods.incrementLoginAttempts = async function () {
  // If account is locked and lock has expired, reset
  if (
    this.portalCredentials.accountLocked &&
    this.portalCredentials.lockedUntil &&
    this.portalCredentials.lockedUntil < Date.now()
  ) {
    await this.updateOne({
      $set: {
        "portalCredentials.failedLoginAttempts": 1,
        "portalCredentials.accountLocked": false,
        "portalCredentials.lockedUntil": null,
      },
    });
    return;
  }

  // Increment failed attempts
  const updates = { $inc: { "portalCredentials.failedLoginAttempts": 1 } };

  // Lock account after 5 failed attempts for 30 minutes
  if (this.portalCredentials.failedLoginAttempts + 1 >= 5) {
    updates.$set = {
      "portalCredentials.accountLocked": true,
      "portalCredentials.lockedUntil": Date.now() + 30 * 60 * 1000, // 30 minutes
    };
  }

  await this.updateOne(updates);
};

// Reset login attempts on successful login
customerSchema.methods.resetLoginAttempts = async function () {
  await this.updateOne({
    $set: {
      "portalCredentials.failedLoginAttempts": 0,
      "portalCredentials.accountLocked": false,
      "portalCredentials.lockedUntil": null,
      "portalCredentials.lastLogin": new Date(),
      "portalCredentials.firstLogin": false,
    },
  });
};

// Get plain password (for showing to customer on first creation)
customerSchema.methods.getPlainPassword = function () {
  return this.portalCredentials.plainPassword || null;
};

// Clear plain password (call after showing to customer)
customerSchema.methods.clearPlainPassword = async function () {
  await this.updateOne({
    $unset: { "portalCredentials.plainPassword": "" },
  });
};

// ========================================
// STATIC METHODS
// ========================================

customerSchema.statics.search = function (query) {
  return this.find({
    $or: [
      { fullName: new RegExp(query, "i") },
      { primaryMobile: new RegExp(query, "i") },
      { customerCode: new RegExp(query, "i") },
      { email: new RegExp(query, "i") },
    ],
  });
};

module.exports = mongoose.model("Customer", customerSchema);
