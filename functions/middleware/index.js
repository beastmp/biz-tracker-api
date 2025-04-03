const errorHandler = require("./errorHandler");

/**
 * Middleware to validate required fields
 * @param {Array} fields - Array of required field names
 * @return {Function} Express middleware
 */
const validateRequiredFields = (fields) => {
  return (req, res, next) => {
    for (const field of fields) {
      // Handle nested fields with dot notation
      if (field.includes(".")) {
        const parts = field.split(".");
        let value = req.body;
        let missingField = false;

        for (const part of parts) {
          if (value && typeof value === "object" && part in value) {
            value = value[part];
          } else {
            missingField = true;
            break;
          }
        }

        if (missingField || value === undefined ||
          value === null || value === "") {
          return res.status(400).json({
            message: `${field} is required`,
          });
        }
      } else if (!req.body[field]) {
        return res.status(400).json({
          message: `${field} is required`,
        });
      }
    }
    next();
  };
};

/**
 * Attach file upload URL to request if needed
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const processFileUpload = (req, res, next) => {
  if (req.file && req.file.storageUrl) {
    req.body.imageUrl = req.file.storageUrl;
  }
  next();
};

module.exports = {
  errorHandler,
  validateRequiredFields,
  // setBusinessId,
  processFileUpload,
};
