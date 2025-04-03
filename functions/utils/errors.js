/**
 * Custom application error class that extends the built-in Error class
 * @extends Error
 */
class AppError extends Error {
  /**
   * Create a new AppError instance
   * @param {string} message - The error message
   * @param {number} [statusCode=500] - The HTTP status code
   */
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // Indicates this is an expected error
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error class for handling not found resources
 * @extends AppError
 */
class NotFoundError extends AppError {
  /**
   * Create a new NotFoundError
   * @param {string} entity - The type of entity that wasn't found
   * @param {string|number} id - The identifier of the entity
   */
  constructor(entity, id) {
    super(`${entity} with id ${id} not found`, 404);
    this.name = "NotFoundError";
  }
}

/**
 * Error class for handling validation errors
 * @extends AppError
 */
class ValidationError extends AppError {
  /**
   * Create a new ValidationError
   * @param {string} message - The validation error message
   */
  constructor(message) {
    super(message, 400);
    this.name = "ValidationError";
  }
}

/**
 * Error class for handling unauthorized access
 * @extends AppError
 */
class UnauthorizedError extends AppError {
  /**
   * Create a new UnauthorizedError
   * @param {string} [message="Unauthorized access"] - The error message
   */
  constructor(message = "Unauthorized access") {
    super(message, 401);
    this.name = "UnauthorizedError";
  }
}

/**
 * Error class for handling forbidden access
 * @extends AppError
 */
class ForbiddenError extends AppError {
  /**
   * Create a new ForbiddenError
   * @param {string} [message="Access forbidden"] - The error message
   */
  constructor(message = "Access forbidden") {
    super(message, 403);
    this.name = "ForbiddenError";
  }
}

/**
 * Error class for handling conflict situations
 * @extends AppError
 */
class ConflictError extends AppError {
  /**
   * Create a new ConflictError
   * @param {string} message - The conflict error message
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
