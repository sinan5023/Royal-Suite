const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      unique: true,
      trim: true,
      index: true,
    },
    sku: {
      type: String,
      trim: true,
      index: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
      index: true,
    },
    size: {
      type: String,
      trim: true,
    },
    color: {
      type: String,
      trim: true,
    },
    fabric: {
      type: String,
      trim: true,
    },
    heightRange: {
      type: String,
      trim: true,
    },
    chest: {
      type: String,
      trim: true,
    },
    waist: {
      type: String,
      trim: true,
    },
    otherMeasurements: {
      type: String,
      trim: true,
    },
    baseRent: {
      type: Number,
      min: 0,
    },
    extraDayCharge: {
      type: Number,
      min: 0,
    },
    securityDeposit: {
      type: Number,
      min: 0,
    },
    branch: {
      type: String,
      trim: true,
    },
    storageLocation: {
      type: String,
      trim: true,
    },
    barcode: {
      type: String,
      trim: true,
      index: true,
    },
    conditionGrade: {
      type: String,
      trim: true,
      enum: ["Excellent", "Good", "Fair", "Worn"],
    },
    status: {
      type: String,
      trim: true,
      enum: ["available", "rented", "maintenance", "retired", "damaged"],
      default: "available",
      index: true,
    },
    dateAdded: {
      type: Date,
    },
    lastInspectionDate: {
      type: Date,
    },
    nextMaintenanceDue: {
      type: Date,
    },
    timesRented: {
      type: Number,
      default: 0,
      min: 0,
    },
    photos: [
      {
        type: String,
        trim: true,
      },
    ],
    isRetired: {
      type: Boolean,
      default: false,
    },
    retirementReason: {
      type: String,
      trim: true,
    },
    disposalValue: {
      type: Number,
      min: 0,
    },
    retirementNotes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to generate productId
productSchema.pre("save", async function (next) {
  // Only generate productId if it's a new document and productId doesn't exist
  if (this.isNew && !this.productId) {
    try {
      // Generate product ID based on category and timestamp
      const categoryPrefix = this.category
        ? this.category.substring(0, 3).toUpperCase()
        : "PRD";
      
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, "0");
      
      // Find the count of products created this month
      const count = await mongoose.model("Product").countDocuments({
        createdAt: {
          $gte: new Date(year, new Date().getMonth(), 1),
          $lt: new Date(year, new Date().getMonth() + 1, 1),
        },
      });
      
      // Generate sequential number
      const sequentialNumber = String(count + 1).padStart(4, "0");
      
      // Format: CAT-YYYY-MM-0001
      this.productId = `${categoryPrefix}-${year}-${month}-${sequentialNumber}`;
      
      // Check if productId already exists (collision check)
      const existing = await mongoose.model("Product").findOne({
        productId: this.productId,
      });
      
      // If collision, add random suffix
      if (existing) {
        const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
        this.productId = `${categoryPrefix}-${year}-${month}-${sequentialNumber}-${randomSuffix}`;
      }
      
    } catch (error) {
    }
  } else {
  }
});

// Index for efficient queries
productSchema.index({ productId: 1 });
productSchema.index({ category: 1, status: 1 });
productSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Product", productSchema);
