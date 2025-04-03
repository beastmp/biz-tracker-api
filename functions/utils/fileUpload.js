/**
 * File Upload Middleware
 */
const multer = require("multer");
const {getProviderFactory} = require("../providers");

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1,
    parts: 20, // Increase the parts limit to accommodate form fields
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    const allowedTypes = ["image/jpeg", "image/png",
      "image/gif", "image/jpg", "image/webp"];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("Only JPEG, PNG, GIF and WebP images are allowed"));
    }
    cb(null, true);
  },
});

// Handle potential file upload errors
const uploadErrorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.error("Multer error:", err);
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({message: "File size exceeds 5MB limit"});
    }
    return res.status(400).json({message: `Upload error: ${err.message}`});
  } else if (err) {
    console.error("Upload error:", err);
    return res.status(400).json({message: err.message});
  }
  next();
};

// Upload to storage using the provider factory
const uploadToStorage = async (req, res, next) => {
  // If no file was uploaded or upload was skipped, just continue
  if (!req.file) {
    return next();
  }

  try {
    console.log(`Processing file upload: ${req.file.originalname},
      ${req.file.mimetype}, ${req.file.size} bytes`);

    const storageProvider = getProviderFactory().getStorageProvider();

    // Upload file using the configured storage provider
    const fileUrl = await storageProvider.uploadFile(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
    );

    // Add the URL to the request
    req.file.storageUrl = fileUrl;
    next();
  } catch (error) {
    console.error("Storage upload error:", error);
    next(error);
  }
};

module.exports = {
  upload,
  uploadErrorHandler,
  uploadToStorage,
};
