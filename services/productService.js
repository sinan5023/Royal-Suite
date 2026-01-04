const Product = require("../models/productModel");

/**
 * Get product by ID for view page
 * @param {String} id - Product MongoDB _id or productId
 * @returns {Object} Product data or null
 */
const getProductById = async (id) => {
  try {
    // Try finding by MongoDB _id first
    let product = await Product.findById(id).lean();

    // If not found, try finding by custom productId field
    if (!product) {
      product = await Product.findOne({ productId: id }).lean();
    }

    return product;
  } catch (error) {
    // If invalid MongoDB ObjectId format, try productId
    if (error.name === "CastError") {
      const product = await Product.findOne({ productId: id }).lean();
      return product;
    }
    throw error;
  }
};

/**
 * Get all products with filters and pagination
 * @param {Object} filters - Filter criteria
 * @param {Object} pagination - Page and limit
 * @returns {Object} Products array and metadata
 */
const getAllProducts = async (filters = {}, pagination = {}) => {
  try {
    const { page = 1, limit = 10 } = pagination;
    const { q, category, size, status, condition } = filters;

    // Build query object
    const query = {};

    // Search query (searches in multiple fields)
    if (q && q.trim()) {
      query.$or = [
        { displayName: { $regex: q, $options: "i" } },
        { sku: { $regex: q, $options: "i" } },
        { productId: { $regex: q, $options: "i" } },
        { category: { $regex: q, $options: "i" } },
        { size: { $regex: q, $options: "i" } },
        { barcode: { $regex: q, $options: "i" } },
      ];
    }

    // Category filter
    if (category && category.trim()) {
      query.category = category;
    }

    // Size filter
    if (size && size.trim()) {
      query.size = size;
    }

    // Status filter
    if (status && status.trim()) {
      query.status = status;
    }

    // Condition filter
    if (condition && condition.trim()) {
      query.conditionGrade = condition;
    }

    // Calculate skip value
    const skip = (page - 1) * limit;

    // Execute query with pagination
    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const total = await Product.countDocuments(query);

    return {
      products,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
        from: skip + 1,
        to: Math.min(skip + limit, total),
      },
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Get inventory statistics
 * @returns {Object} Stats object
 */
const getInventoryStats = async () => {
  try {
    const [available, rented, maintenance, total] = await Promise.all([
      Product.countDocuments({ status: "available" }),
      Product.countDocuments({ status: "rented" }),
      Product.countDocuments({ status: "maintenance" }),
      Product.countDocuments(),
    ]);

    return {
      available,
      rented,
      maintenance,
      total,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Get unique categories for filters
 * @returns {Array} Array of unique categories
 */
const getUniqueCategories = async () => {
  try {
    const categories = await Product.distinct("category");
    return categories.filter((cat) => cat); // Remove null/empty values
  } catch (error) {
    throw error;
  }
};

/**
 * Get unique sizes for filters
 * @returns {Array} Array of unique sizes
 */
const getUniqueSizes = async () => {
  try {
    const sizes = await Product.distinct("size");
    return sizes.filter((size) => size); // Remove null/empty values
  } catch (error) {
    throw error;
  }
};

/**
 * Get alerts for products needing attention
 * @returns {Array} Array of alert objects
 */
const getProductAlerts = async () => {
  try {
    const alerts = [];
    const today = new Date();

    // Find products with maintenance due
    const maintenanceDue = await Product.find({
      nextMaintenanceDue: { $lte: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000) },
      status: { $ne: "retired" },
    })
      .select("productId displayName nextMaintenanceDue")
      .limit(5)
      .lean();

    maintenanceDue.forEach((product) => {
      alerts.push({
        label: "Maintenance Due",
        text: `${product.displayName} - Due ${new Date(
          product.nextMaintenanceDue
        ).toLocaleDateString("en-IN")}`,
        itemId: product._id,
      });
    });

    // Find products in poor condition
    const poorCondition = await Product.find({
      conditionGrade: "Worn",
      status: { $ne: "retired" },
    })
      .select("productId displayName conditionGrade")
      .limit(3)
      .lean();

    poorCondition.forEach((product) => {
      alerts.push({
        label: "Poor Condition",
        text: `${product.displayName} - Condition: ${product.conditionGrade}`,
        itemId: product._id,
      });
    });

    // Find products rented many times (high wear)
    const highUsage = await Product.find({
      timesRented: { $gte: 50 },
      status: { $ne: "retired" },
    })
      .select("productId displayName timesRented")
      .limit(3)
      .lean();

    highUsage.forEach((product) => {
      alerts.push({
        label: "High Usage",
        text: `${product.displayName} - Rented ${product.timesRented} times`,
        itemId: product._id,
      });
    });

    return alerts;
  } catch (error) {
    throw error;
  }
};

/**
 * Delete product by ID
 * @param {String} id - Product ID
 * @returns {Object} Deleted product
 */
const deleteProduct = async (id) => {
  try {
    let product = await Product.findByIdAndDelete(id);

    if (!product) {
      product = await Product.findOneAndDelete({ productId: id });
    }

    return product;
  } catch (error) {
    if (error.name === "CastError") {
      const product = await Product.findOneAndDelete({ productId: id });
      return product;
    }
    throw error;
  }
};

/**
 * Create new product
 * @param {Object} productData - Product data
 * @returns {Object} Created product
 */
const createProduct = async (productData) => {
  try {
    const product = new Product(productData);
    await product.save();
    return product;
  } catch (error) {
    throw error;
  }
};

/**
 * Update product by ID
 * @param {String} id - Product ID
 * @param {Object} updateData - Data to update
 * @returns {Object} Updated product
 */
const updateProduct = async (id, updateData) => {
  try {
    let product = await Product.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!product) {
      product = await Product.findOneAndUpdate({ productId: id }, updateData, {
        new: true,
        runValidators: true,
      });
    }

    return product;
  } catch (error) {
    if (error.name === "CastError") {
      const product = await Product.findOneAndUpdate(
        { productId: id },
        updateData,
        { new: true, runValidators: true }
      );
      return product;
    }
    throw error;
  }
};

module.exports = {
  getProductById,
  getAllProducts,
  getInventoryStats,
  getUniqueCategories,
  getUniqueSizes,
  getProductAlerts,
  deleteProduct,
  createProduct,
  updateProduct,
};
