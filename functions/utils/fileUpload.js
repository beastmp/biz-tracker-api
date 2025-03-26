const multer = require("multer");
const path = require("path");
const {Storage} = require("@google-cloud/storage");

// Create a storage instance
const storage = new Storage();
const bucket = storage.bucket(process.env.FIREBASE_STORAGE_BUCKET ||
  "your-default-bucket-name");

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

// Upload to Firebase Storage
const uploadToFirebase = async (req, res, next) => {
  // If no file was uploaded or upload was skipped, just continue
  if (!req.file) {
    console.log("No file in request, skipping Firebase upload");
    return next();
  }

  try {
    console.log(`Processing file upload: ${req.file.originalname},
      ${req.file.mimetype}, ${req.file.size} bytes`);

    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    const ext = path.extname(req.file.originalname) || ".jpg";
    const filename = uniqueSuffix + ext;

    // Create a reference to the file in Firebase Storage
    const fileUpload = bucket.file(`inventory/${filename}`);

    // Set proper metadata
    const metadata = {
      contentType: req.file.mimetype,
      metadata: {
        firebaseStorageDownloadTokens: uniqueSuffix, // Create a download token
      },
    };

    // Create a write stream and upload the file
    const blobStream = fileUpload.createWriteStream({
      metadata,
      resumable: false, // Non-resumable uploads for smaller files
    });

    // Handle errors during upload
    blobStream.on("error", (error) => {
      console.error("Firebase upload error:", error);
      return next(new Error("Firebase upload failed: " + error.message));
    });

    // When upload completes, add the public URL to the request
    blobStream.on("finish", async () => {
      try {
        // Make the image public
        await fileUpload.makePublic();

        // Get the public URL
        req.file.firebaseUrl = `https://storage.googleapis.com/${bucket.name}/inventory/${filename}`;
        console.log("Firebase upload successful. URL:", req.file.firebaseUrl);
        next();
      } catch (err) {
        console.error("Failed to make file public:", err);
        next(new Error("Failed to make file public"));
      }
    });

    // Send the file to Firebase
    blobStream.end(req.file.buffer);
  } catch (error) {
    console.error("Firebase upload error:", error);
    next(error);
  }
};

module.exports = {
  upload,
  uploadErrorHandler,
  uploadToFirebase,
};
