/**
 * Error Handler Middleware Module
 *
 * This module provides Express middleware for centralized error handling throughout
 * the application. It transforms various error types into consistent JSON responses
 * with appropriate HTTP status codes and error details.
 *
 * @module errorHandler
 * @requires ./errors
 */
const {AppError} = require("./errors");

/**
 * Express middleware for handling errors
 *
 * This middleware catches errors from route handlers and controllers, formatting
 * them into standardized JSON responses. It handles different error types
 * (custom app errors, MongoDB errors, validation errors, JWT errors) differently.
 *
 * @param {Error} err - The error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 * @return {Object} JSON response with error details
 *
 * @example
 * // In your Express app setup:
 * const errorHandler = require('./validation/errorHandler');
 * // After all routes:
 * app.use(errorHandler);
 */
const errorHandler = (err, req, res, next) => {
  console.error(`Error: ${err.message}`);

  // Log stack trace in development
  if (process.env.NODE_ENV !== "production") {
    console.error(err.stack);
  }

  // Handle operational errors (our custom errors)
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: "error",
      message: err.message,
      // Include detailed validation errors if available
      ...(err.errors && {details: err.errors}),
    });
  }

  // Handle Mongoose validation errors
  if (err.name === "ValidationError") {
    return res.status(400).json({
      status: "error",
      message: "Validation Error",
      details: Object.values(err.errors).map((e) => e.message),
    });
  }

  // Handle MongoDB duplicate key errors
  if (err.code === 11000) {
    return res.status(409).json({
      status: "error",
      message: "Duplicate value error",
      field: Object.keys(err.keyValue)[0],
    });
  }

  // Handle JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      status: "error",
      message: "Invalid token",
    });
  }

  // Handle expired JWT
  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      status: "error",
      message: "Token expired",
    });
  }

  // Default to 500 server error
  res.status(500).json({
    status: "error",
    message: process.env.NODE_ENV === "production" ?
      "Something went wrong" :
      err.message,
  });
};

module.exports = errorHandler;
