const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const expenseSchema = new Schema({
  expenseCode: {
    type: String,
    unique: true,
    sparse: true,
  },

  category: {
    type: String,
    enum: [
      'Rent',
      'Utilities',
      'Salaries',
      'Inventory Purchase',
      'Marketing',
      'Transportation',
      'Maintenance',
      'Office Supplies',
      'Insurance',
      'Taxes',
      'Professional Fees',
      'Miscellaneous',
    ],
    required: [true, 'Category is required'],
  },

  subcategory: {
    type: String,
    trim: true,
  },

  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
  },

  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative'],
  },

  expenseDate: {
    type: Date,
    required: [true, 'Expense date is required'],
    index: true,
  },

  paymentMethod: {
    type: String,
    enum: ['Cash', 'UPI', 'Bank Transfer', 'Card', 'Cheque', 'Other'],
    default: 'Cash',
  },

  paymentStatus: {
    type: String,
    enum: ['Paid', 'Pending', 'Partial'],
    default: 'Paid',
  },

  paidAmount: {
    type: Number,
    default: 0,
    min: 0,
  },

  // Vendor/Supplier details
  vendorName: {
    type: String,
    trim: true,
  },

  vendorContact: {
    type: String,
    trim: true,
  },

  // Reference documents
  invoiceNumber: {
    type: String,
    trim: true,
  },

  receiptNumber: {
    type: String,
    trim: true,
  },

  // Attachments
  attachments: [{
    fileName: String,
    fileUrl: String,
    fileType: String,
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  }],

  // Tax details
  taxAmount: {
    type: Number,
    default: 0,
    min: 0,
  },

  taxRate: {
    type: Number,
    default: 0,
    min: 0,
  },

  // Status and tracking
  status: {
    type: String,
    enum: ['Active', 'Cancelled', 'Refunded'],
    default: 'Active',
  },

  isRecurring: {
    type: Boolean,
    default: false,
  },

  recurringFrequency: {
    type: String,
    enum: ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'],
  },

  nextRecurringDate: {
    type: Date,
  },

  // Notes
  notes: {
    type: String,
    trim: true,
  },

  // Approval workflow
  approvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },

  approvedAt: {
    type: Date,
  },

  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Generate expense code before saving
expenseSchema.pre('save', async function(next) {
  if (this.isNew && !this.expenseCode) {
    try {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const datePrefix = `${year}${month}`;

      const latestExpense = await this.constructor
        .findOne({
          expenseCode: new RegExp(`^EXP${datePrefix}`),
        })
        .sort({ expenseCode: -1 })
        .select('expenseCode')
        .lean();

      let sequenceNumber = 1;
      if (latestExpense && latestExpense.expenseCode) {
        const lastSequence = parseInt(latestExpense.expenseCode.slice(-4));
        sequenceNumber = lastSequence + 1;
      }

      this.expenseCode = `EXP${datePrefix}${String(sequenceNumber).padStart(4, '0')}`;
    } catch (error) {
        console.log(error)
    }
  }

});

// Calculate paid amount if full payment
expenseSchema.pre('save', function(next) {
  if (this.paymentStatus === 'Paid' && this.paidAmount === 0) {
    this.paidAmount = this.amount;
  }
});

// Indexes
expenseSchema.index({ category: 1, expenseDate: -1 });
expenseSchema.index({ paymentStatus: 1 });
expenseSchema.index({ createdBy: 1 });
expenseSchema.index({ expenseDate: -1 });

// Virtual for outstanding amount
expenseSchema.virtual('outstandingAmount').get(function() {
  return this.amount - this.paidAmount;
});

// Instance method to format for API
expenseSchema.methods.toJSON = function() {
  const obj = this.toObject();
  obj.outstandingAmount = this.outstandingAmount;
  return obj;
};

// Static method for analytics
expenseSchema.statics.getExpensesByCategory = async function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        expenseDate: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
        status: 'Active',
      },
    },
    {
      $group: {
        _id: '$category',
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { totalAmount: -1 },
    },
  ]);
};

// Static method for monthly expenses
expenseSchema.statics.getMonthlyExpenses = async function(year) {
  return this.aggregate([
    {
      $match: {
        expenseDate: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
        status: 'Active',
      },
    },
    {
      $group: {
        _id: { $month: '$expenseDate' },
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);
};

expenseSchema.set('toJSON', { virtuals: true });
expenseSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Expense', expenseSchema);
