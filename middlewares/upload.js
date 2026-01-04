const multer = require("multer");
const path = require("node:path");
const os = require("node:os");

// temp directory
const uploadDir = path.join(os.tmpdir(), "suitmanager-uploads");

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith("image/")) {
    return cb(new Error("Only image files are allowed"), false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 10,
  },
});

module.exports = upload;
