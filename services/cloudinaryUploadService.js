const dotenv = require("dotenv");
const cloudinary = require("cloudinary").v2;
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function cloudinaryUploadService(files) {
  console.log("cloudinaryUploadService files:", files?.length);
  if (!files || files.length === 0) return [];

  const uploadPromises = files.map((file, index) => {
    console.log(`Uploading file ${index}:`, {
      fieldname: file.fieldname,
      originalname: file.originalname,
      bufferSize: file.buffer?.length || 0,
    });

    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "suitmanager/products",
          resource_type: "image",
          public_id: `product-${Date.now()}-${index}`, // unique ID
        },
        (error, result) => {
          if (error) {
            console.error(
              `Cloudinary upload error for ${file.originalname}:`,
              error
            );
            return reject(error);
          }
          resolve(result.secure_url);
        }
      );

      // CRITICAL: pipe the buffer correctly
      if (file.buffer && file.buffer.length > 0) {
        stream.end(file.buffer);
      } else {
        stream.end(); // empty stream
        reject(new Error(`No buffer data for ${file.originalname}`));
      }
    });
  });

  return Promise.all(uploadPromises).catch((err) => {
    console.error("Batch upload failed:", err);
    throw err;
  });
}

/**
 * Delete photo from Cloudinary by URL
 * @param {string} photoUrl - Full Cloudinary URL
 * @returns {Promise<boolean>} - true if deleted successfully
 */
async function cloudinaryDeleteService(photoUrl) {
  try {
    if (!photoUrl) {
      console.warn("No photo URL provided for deletion");
      return false;
    }

    // Extract public_id from Cloudinary URL
    // Format: https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/suitmanager/products/product-123.jpg
    const urlParts = photoUrl.split("/");
    const uploadIndex = urlParts.indexOf("upload");

    if (uploadIndex === -1 || uploadIndex >= urlParts.length - 1) {
      console.error("Invalid Cloudinary URL format:", photoUrl);
      return false;
    }

    // Get path after "upload/v{version}/" or "upload/"
    let pathAfterUpload = urlParts.slice(uploadIndex + 1);
    
    // Remove version number if present (v1234567890)
    if (pathAfterUpload[0] && pathAfterUpload[0].startsWith("v")) {
      pathAfterUpload = pathAfterUpload.slice(1);
    }

    // Join the path and remove file extension
    const publicIdWithExtension = pathAfterUpload.join("/");
    const publicId = publicIdWithExtension.replace(/\.[^/.]+$/, ""); // Remove extension

    console.log("Deleting from Cloudinary, public_id:", publicId);

    // Delete from Cloudinary
    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result === "ok") {
      console.log("Photo deleted successfully from Cloudinary");
      return true;
    } else if (result.result === "not found") {
      console.warn("Photo not found in Cloudinary (may already be deleted)");
      return true; // Consider it success since it's not there anyway
    } else {
      console.error("Unexpected Cloudinary delete result:", result);
      return false;
    }
  } catch (error) {
    console.error("Error deleting photo from Cloudinary:", error);
    return false;
  }
}

module.exports = { 
  cloudinaryUploadService,
  cloudinaryDeleteService 
};
