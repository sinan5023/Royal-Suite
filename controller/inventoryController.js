const productService = require("../services/productService");
const {
  cloudinaryUploadService,
  cloudinaryDeleteService,
} = require("../services/cloudinaryUploadService");

/**
 * Helper: Get greeting based on time
 */
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
};

/**
 * Helper: Get formatted current date
 */
const getCurrentDate = () => {
  return new Date().toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// ============================================
// VIEW ROUTES (Render EJS Pages)
// ============================================

/**
 * View single product details page
 * @route GET /inventory/:id
 */
const viewProduct = async (req, res) => {
  try {
    const productId = req.params.id;

    // Validate ID
    if (!productId) {
      return res.status(400).render("error", {
        user: req.user || { name: "Guest", role: "Viewer" },
        greeting: getGreeting(),
        currentDate: getCurrentDate(),
        message: "Invalid product ID",
        error: { status: 400 },
      });
    }

    // Get product from service
    const product = await productService.getProductById(productId);

    // Check if product exists
    if (!product) {
      return res.status(404).render("pagenotfound", {
        user: req.user || { name: "Guest", role: "Viewer" },
        greeting: getGreeting(),
        currentDate: getCurrentDate(),
        message: "Product not found",
        error: { status: 404 },
      });
    }

    // Ensure photos array exists
    if (!product.photos) {
      product.photos = [];
    }

    // Render view page with product data
    res.render("viewProduct", {
      product: product,
      user: req.user || { name: "Guest", role: "Viewer" },
      greeting: getGreeting(),
      currentDate: getCurrentDate(),
    });
  } catch (error) {
    console.error("Error viewing product:", error);
    res.status(500).render("pagenotfound", {
      user: req.user || { name: "Guest", role: "Viewer" },
      greeting: getGreeting(),
      currentDate: getCurrentDate(),
      message: "Server error while loading product",
      error: {
        status: 500,
        stack: process.env.NODE_ENV === "development" ? error.stack : "",
      },
    });
  }
};

/**
 * Display inventory list page
 * @route GET /inventory
 */
const listInventory = async (req, res) => {
  try {
    // Get stats and filters for the page
    const [stats, categories, sizes, alerts] = await Promise.all([
      productService.getInventoryStats(),
      productService.getUniqueCategories(),
      productService.getUniqueSizes(),
      productService.getProductAlerts(),
    ]);

    // Render inventory list page
    res.render("inventoryDashboard", {
      stats,
      categories,
      sizes,
      alerts,
      user: req.user || { name: "Guest", role: "Viewer" },
      greeting: getGreeting(),
      currentDate: getCurrentDate(),
    });
  } catch (error) {
    console.error("Error loading inventory:", error);
    res.status(500).render("pagenotfound", {
      user: req.user || { name: "Guest", role: "Viewer" },
      greeting: getGreeting(),
      currentDate: getCurrentDate(),
      message: "Server error while loading inventory",
      error: { status: 500 },
    });
  }
};

/**
 * Display add product form page
 * @route GET /inventory/new
 */
const addProductPage = async (req, res) => {
  try {
    // Get categories for dropdown
    const categories = await productService.getUniqueCategories();

    // Add default categories if none exist
    const defaultCategories = [
      "Tuxedo",
      "Sherwani",
      "Three-Piece Suit",
      "Two-Piece Suit",
      "Blazer",
      "Waistcoat",
      "Wedding Suit",
      "Party Wear",
    ];

    const allCategories = [...new Set([...categories, ...defaultCategories])];

    res.render("addProduct", {
      categories: allCategories,
      user: req.user || { name: "Guest", role: "Viewer" },
      greeting: getGreeting(),
      currentDate: getCurrentDate(),
    });
  } catch (error) {
    console.error("Error loading add product page:", error);
    res.status(500).render("pagenotfound", {
      user: req.user || { name: "Guest", role: "Viewer" },
      greeting: getGreeting(),
      currentDate: getCurrentDate(),
      message: "Server error while loading form",
      error: { status: 500 },
    });
  }
};

/**
 * Display edit product form page
 * @route GET /inventory/:id/edit
 */
const editProductPage = async (req, res) => {
  try {
    const productId = req.params.id;

    // Get product and categories
    const [product, categories] = await Promise.all([
      productService.getProductById(productId),
      productService.getUniqueCategories(),
    ]);

    if (!product) {
      return res.status(404).render("pagenotfound", {
        user: req.user || { name: "Guest", role: "Viewer" },
        greeting: getGreeting(),
        currentDate: getCurrentDate(),
        message: "Product not found",
        error: { status: 404 },
      });
    }

    // Format dates for input fields
    if (product.dateAdded) {
      product.dateAdded = new Date(product.dateAdded)
        .toISOString()
        .split("T")[0];
    }
    if (product.lastInspectionDate) {
      product.lastInspectionDate = new Date(product.lastInspectionDate)
        .toISOString()
        .split("T")[0];
    }
    if (product.nextMaintenanceDue) {
      product.nextMaintenanceDue = new Date(product.nextMaintenanceDue)
        .toISOString()
        .split("T")[0];
    }

    res.render("editProduct", {
      product,
      categories,
      user: req.user || { name: "Guest", role: "Viewer" },
      greeting: getGreeting(),
      currentDate: getCurrentDate(),
    });
  } catch (error) {
    console.error("Error loading edit product page:", error);
    res.status(500).render("pagenotfound", {
      user: req.user || { name: "Guest", role: "Viewer" },
      greeting: getGreeting(),
      currentDate: getCurrentDate(),
      message: "Server error while loading product",
      error: { status: 500 },
    });
  }
};

// ============================================
// API ROUTES (JSON Responses)
// ============================================

/**
 * Get products list (AJAX endpoint)
 * @route GET /api/inventory
 */
const getProducts = async (req, res) => {
  try {
    const filters = {
      q: req.query.q,
      category: req.query.category,
      size: req.query.size,
      status: req.query.status,
      condition: req.query.condition,
    };

    const pagination = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
    };

    const result = await productService.getAllProducts(filters, pagination);

    res.json({
      ok: true,
      data: result.products,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({
      ok: false,
      message: "Failed to fetch products",
      error: error.message,
    });
  }
};

/**
 * Create new product (AJAX endpoint)
 * @route POST /api/inventory
 */
const createProduct = async (req, res) => {
  try {
    // Handle file uploads (photos) if using multer
    const productData = { ...req.body };

    // If files uploaded, upload to Cloudinary
    if (req.files && req.files.length > 0) {
      console.log("Uploading photos to Cloudinary...");
      const photoUrls = await cloudinaryUploadService(req.files);
      
      if (photoUrls && photoUrls.length > 0) {
        productData.photos = photoUrls;
        console.log("Photos uploaded successfully:", photoUrls.length);
      } else {
        console.warn("No photos were uploaded");
        productData.photos = [];
      }
    } else {
      productData.photos = [];
    }

    // Convert string booleans to actual booleans
    if (productData.isRetired === "true") productData.isRetired = true;
    if (productData.isRetired === "false") productData.isRetired = false;

    const product = await productService.createProduct(productData);

    res.status(201).json({
      ok: true,
      message: "Product created successfully",
      data: product,
    });
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({
      ok: false,
      message: "Failed to create product",
      error: error.message,
    });
  }
};

/**
 * Update product
 * @route PUT /api/inventory/:id
 */
const updateProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const updateData = { ...req.body };

    // Convert string booleans
    if (updateData.isRetired === "true") updateData.isRetired = true;
    if (updateData.isRetired === "false") updateData.isRetired = false;

    const product = await productService.updateProduct(productId, updateData);

    if (!product) {
      return res.status(404).json({
        ok: false,
        message: "Product not found",
      });
    }

    res.json({
      ok: true,
      message: "Product updated successfully",
      data: product,
    });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({
      ok: false,
      message: "Failed to update product",
      error: error.message,
    });
  }
};

/**
 * Upload photos to existing product
 * @route POST /api/inventory/:id/photos
 */
const uploadProductPhotos = async (req, res) => {
  try {
    const productId = req.params.id;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        ok: false,
        message: "No photos uploaded",
      });
    }

    // Get existing product
    const product = await productService.getProductById(productId);
    if (!product) {
      return res.status(404).json({
        ok: false,
        message: "Product not found",
      });
    }

    // Upload to Cloudinary using existing service
    console.log("Uploading photos to Cloudinary...");
    const photoUrls = await cloudinaryUploadService(req.files);

    if (!photoUrls || photoUrls.length === 0) {
      return res.status(500).json({
        ok: false,
        message: "Failed to upload photos to Cloudinary",
      });
    }

    // Append to existing photos
    const existingPhotos = product.photos || [];
    const updatedPhotos = [...existingPhotos, ...photoUrls];

    // Update product with new photos
    await productService.updateProduct(productId, { photos: updatedPhotos });

    res.json({
      ok: true,
      message: "Photos uploaded successfully",
      data: {
        photos: photoUrls,
        totalPhotos: updatedPhotos.length,
      },
    });
  } catch (error) {
    console.error("Error uploading photos:", error);

    res.status(500).json({
      ok: false,
      message: "Failed to upload photos",
      error: error.message,
    });
  }
};

/**
 * Delete photo from product
 * @route DELETE /api/inventory/:id/photos
 */
const deleteProductPhoto = async (req, res) => {
  try {
    const productId = req.params.id;
    const { photoUrl } = req.body;

    if (!photoUrl) {
      return res.status(400).json({
        ok: false,
        message: "Photo URL is required",
      });
    }

    // Get product
    const product = await productService.getProductById(productId);
    if (!product) {
      return res.status(404).json({
        ok: false,
        message: "Product not found",
      });
    }

    // Remove photo from array
    const updatedPhotos = (product.photos || []).filter(
      (url) => url !== photoUrl
    );

    // Update product in database first
    await productService.updateProduct(productId, { photos: updatedPhotos });

    // Delete from Cloudinary (don't fail if this fails)
    const deleted = await cloudinaryDeleteService(photoUrl);
    if (!deleted) {
      console.warn("Failed to delete photo from Cloudinary, but DB updated");
    }

    res.json({
      ok: true,
      message: "Photo deleted successfully",
      data: {
        remainingPhotos: updatedPhotos.length,
      },
    });
  } catch (error) {
    console.error("Error deleting photo:", error);
    res.status(500).json({
      ok: false,
      message: "Failed to delete photo",
      error: error.message,
    });
  }
};

/**
 * Delete product
 * @route DELETE /api/inventory/:id
 */
const deleteProduct = async (req, res) => {
  try {
    const productId = req.params.id;

    // Get product first to access photos
    const product = await productService.getProductById(productId);

    if (!product) {
      return res.status(404).json({
        ok: false,
        message: "Product not found",
      });
    }

    // Delete all photos from Cloudinary
    if (product.photos && product.photos.length > 0) {
      console.log(`Deleting ${product.photos.length} photos from Cloudinary...`);
      
      const deletePromises = product.photos.map(photoUrl => 
        cloudinaryDeleteService(photoUrl)
      );
      
      // Delete all photos in parallel
      const results = await Promise.allSettled(deletePromises);
      
      // Log results
      const successful = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
      const failed = results.length - successful;
      
      console.log(`Cloudinary deletion: ${successful} succeeded, ${failed} failed`);
      
      if (failed > 0) {
        console.warn("Some photos failed to delete from Cloudinary, but continuing with product deletion");
      }
    }

    // Delete product from database
    const deleted = await productService.deleteProduct(productId);

    if (!deleted) {
      return res.status(500).json({
        ok: false,
        message: "Failed to delete product from database",
      });
    }

    res.json({
      ok: true,
      message: "Product and associated photos deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({
      ok: false,
      message: "Failed to delete product",
      error: error.message,
    });
  }
};

module.exports = {
  // View routes
  viewProduct,
  listInventory,
  addProductPage,
  editProductPage,
  // API routes
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  updateProduct,
  uploadProductPhotos,
  deleteProductPhoto,
};
