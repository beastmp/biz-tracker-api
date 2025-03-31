const errorHandler = require("./errorHandler");

/**
 * Middleware to validate required fields
 * @param {Array} fields - Array of required field names
 * @return {Function} Express middleware
 */
const validateRequiredFields = (fields) => {
  return (req, res, next) => {
    for (const field of fields) {
      if (!req.body[field]) {
        return res.status(400).json({
          message: `${field} is required`,
        });
      }
    }
    next();
  };
};

// /**
//  * Middleware to set business ID from authenticated user
//  * @param {Object} req - Express request object
//  * @param {Object} res - Express response object
//  * @param {Function} next - Next middleware function
//  */
// const setBusinessId = (req, res, next) => {
//   if (req.user && req.user.businessId) {
//     req.body.businessId = req.user.businessId;
//   }
//   next();
// };

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
