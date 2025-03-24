const multer = require("multer");
const path = require("path");
const bucket = require("./firebaseConfig");

// Configure memory storage (files stored temporarily in memory)
const storage = multer.memoryStorage();

// File filter to accept only images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Not an image! Please upload only images."), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Middleware to upload file to Firebase after Multer processes it
const uploadToFirebase = async (req, res, next) => {
  try {
    if (!req.file) {
      return next();
    }

    // Create a unique filename
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    const ext = path.extname(req.file.originalname || "");
    const filename = uniqueSuffix + ext;

    // Create a reference to the file in Firebase Storage
    const fileUpload = bucket.file(`inventory/${filename}`);

    // Create a write stream and upload the file
    const blobStream = fileUpload.createWriteStream({
      metadata: {
        contentType: req.file.mimetype,
      },
    });

    // Handle errors during upload
    blobStream.on("error", (error) => {
      console.error("Upload error:", error);
      return next(new Error("Firebase upload failed"));
    });

    // When upload completes, add the public URL to the request
    blobStream.on("finish", async () => {
      // Make the image public
      await fileUpload.makePublic();

      // Get the public URL
      req.file.firebaseUrl = `https://storage.googleapis.com/${bucket.name}/inventory/${filename}`;
      next();
    });

    // Send the file to Firebase
    blobStream.end(req.file.buffer);
  } catch (error) {
    console.error("Firebase upload error:", error);
    next(error);
  }
};

module.exports = {upload, uploadToFirebase};
