/**
 * Error Handling Module
 *
 * This module defines a hierarchy of custom error classes used throughout the
 * application to standardize error handling. These error classes help identify
 * specific error types, assign appropriate HTTP status codes, and provide
 * consistent error messages to clients.
 *
 * @module errors
 */

/**
 * Base application error class that extends the built-in Error class
 * This serves as the foundation for all other custom error types.
 *
 * @class AppError
 * @extends Error
 */
class AppError extends Error {
  /**
   * Creates a new AppError instance
   *
   * @param {string} message - Descriptive error message
   * @param {number} [statusCode=500] - HTTP status code to return to client
   */
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // Indicates this is an expected error
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error class for handling resources that cannot be found
 * Used when a requested entity does not exist in the database.
 *
 * @class NotFoundError
 * @extends AppError
 */
class NotFoundError extends AppError {
  /**
   * Creates a new NotFoundError with a standardized message format
   *
   * @param {string} entity - Type of entity that wasn't found (e.g., "Item", "Purchase")
   * @param {string|number} id - Identifier that was used in the lookup
   *
   * @example
   * // When an item with ID "abc123" is not found
   * throw new NotFoundError("Item", "abc123");
   * // Results in error message: "Item with id abc123 not found" and status code 404
   */
  constructor(entity, id) {
    super(`${entity} with id ${id} not found`, 404);
    this.name = "NotFoundError";
  }
}

/**
 * Error class for handling validation failures
 * Used when input data fails schema or business logic validation.
 *
 * @class ValidationError
 * @extends AppError
 */
class ValidationError extends AppError {
  /**
   * Creates a new ValidationError with optional detailed validation issues
   *
   * @param {string} message - Main validation error message
   * @param {Array} [errors=[]] - List of specific validation issues
   *
   * @example
   * // Basic validation error
   * throw new ValidationError("Invalid item data");
   *
   * // Validation error with specific field errors
   * throw new ValidationError("Invalid purchase data", [
   *   { field: "purchaseDate", message: "Purchase date cannot be in the future" },
   *   { field: "items", message: "At least one item is required" }
   * ]);
   */
  constructor(message, errors = []) {
    super(message, 400);
    this.name = "ValidationError";
    this.errors = errors;
  }
}

/**
 * Error class for handling authentication failures
 * Used when a user is not authenticated or credentials are invalid.
 *
 * @class UnauthorizedError
 * @extends AppError
 */
class UnauthorizedError extends AppError {
  /**
   * Creates a new UnauthorizedError
   *
   * @param {string} [message="Unauthorized access"] - Custom error message
   *
   * @example
   * // Default message
   * throw new UnauthorizedError();
   *
   * // Custom message
   * throw new UnauthorizedError("Invalid API key");
   */
  constructor(message = "Unauthorized access") {
    super(message, 401);
    this.name = "UnauthorizedError";
  }
}

/**
 * Error class for handling permission issues
 * Used when a user is authenticated but lacks permissions for the operation.
 *
 * @class ForbiddenError
 * @extends AppError
 */
class ForbiddenError extends AppError {
  /**
   * Creates a new ForbiddenError
   *
   * @param {string} [message="Access forbidden"] - Custom error message
   *
   * @example
   * // Default message
   * throw new ForbiddenError();
   *
   * // Custom message with specific details
   * throw new ForbiddenError("You don't have permission to delete this item");
   */
  constructor(message = "Access forbidden") {
    super(message, 403);
    this.name = "ForbiddenError";
  }
}

/**
 * Error class for handling resource conflicts
 * Used for operations that can't be completed due to conflicts with existing data.
 *
 * @class ConflictError
 * @extends AppError
 */
class ConflictError extends AppError {
  /**
   * Creates a new ConflictError
   *
   * @param {string} message - Description of the conflict
   *
   * @example
   * // When trying to create an item with a duplicate SKU
   * throw new ConflictError("An item with SKU 'AB-123' already exists");
   *
   * // When trying to delete an item that's referenced by other entities
   * throw new ConflictError("Cannot delete item because it is used in active sales");
   */
  constructor(message) {
    super(message, 409);
    this.name = "ConflictError";
  }
}

module.exports = {
  AppError,
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
};
