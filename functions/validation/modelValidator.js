/**
 * Model Validator Module
 *
 * This module provides utilities for validating data against schema definitions.
 * It supports validation of various field types (strings, numbers, dates, arrays,
 * objects, etc.) with configurable validation rules like required fields,
 * min/max values, allowed values for enums, and custom validation functions.
 *
 * @module modelValidator
 * @requires ../models/baseModel
 */

const { FieldTypes } = require("../models/baseModel");

/**
 * Validates a single value against its field definition
 *
 * Performs type checking and constraint validation based on the field definition,
 * including required/optional status, type-specific validations (string length,
 * number range, enum values, etc.), and custom validation functions.
 *
 * @param {*} value - The value to validate
 * @param {Object} fieldDef - Field definition with validation rules
 * @param {string} fieldDef.type - Type of the field (from FieldTypes)
 * @param {boolean} [fieldDef.required] - Whether the field is required
 * @param {number} [fieldDef.minLength] - Minimum length for strings
 * @param {number} [fieldDef.maxLength] - Maximum length for strings
 * @param {number} [fieldDef.min] - Minimum value for numbers
 * @param {number} [fieldDef.max] - Maximum value for numbers
 * @param {Array} [fieldDef.values] - Allowed values for enum fields
 * @param {Object} [fieldDef.items] - Definition for array item validation
 * @param {Object} [fieldDef.fields] - Field definitions for object validation
 * @param {Function} [fieldDef.validate] - Custom validation function
 * @param {string} fieldName - Name of the field (for error messages)
 * @return {Object} Validation result with isValid and error properties
 *
 * @example
 * // Validate a string field
 * const result = validateField("John",
 *   { type: FieldTypes.STRING, required: true, minLength: 2 },
 *   "name"
 * );
 * // result = { isValid: true }
 *
 * // Validate an enum field with invalid value
 * const result = validateField("invalid-status",
 *   { type: FieldTypes.ENUM, values: ["pending", "completed"] },
 *   "status"
 * );
 * // result = {
 * //   isValid: false,
 * //   error: "status must be one of: pending, completed"
 * // }
 */
const validateField = (value, fieldDef, fieldName) => {
  // Check if field is required but missing or null
  if (fieldDef.required && (value === undefined || value === null)) {
    return {
      isValid: false,
      error: `${fieldName} is required`,
    };
  }

  // If value is not provided for optional field, it's valid
  if (value === undefined || value === null) {
    return { isValid: true };
  }

  // Validate by type
  switch (fieldDef.type) {
    case FieldTypes.STRING:
      if (typeof value !== "string") {
        return {
          isValid: false,
          error: `${fieldName} must be a string`,
        };
      }

      // Validate string length if specified
      if (fieldDef.minLength && value.length < fieldDef.minLength) {
        return {
          isValid: false,
          error: `${fieldName} must be at least ${fieldDef.minLength} characters`,
        };
      }

      if (fieldDef.maxLength && value.length > fieldDef.maxLength) {
        return {
          isValid: false,
          error: `${fieldName} must be at most ${fieldDef.maxLength} characters`,
        };
      }
      break;

    case FieldTypes.NUMBER:
      if (typeof value !== "number" || isNaN(value)) {
        return {
          isValid: false,
          error: `${fieldName} must be a number`,
        };
      }

      // Validate range if specified
      if (fieldDef.min !== undefined && value < fieldDef.min) {
        return {
          isValid: false,
          error: `${fieldName} must be at least ${fieldDef.min}`,
        };
      }

      if (fieldDef.max !== undefined && value > fieldDef.max) {
        return {
          isValid: false,
          error: `${fieldName} must be at most ${fieldDef.max}`,
        };
      }
      break;

    case FieldTypes.BOOLEAN:
      if (typeof value !== "boolean") {
        return {
          isValid: false,
          error: `${fieldName} must be a boolean`,
        };
      }
      break;

    case FieldTypes.DATE:
      // Accept both Date objects and string dates
      if (!(value instanceof Date) && isNaN(Date.parse(value))) {
        return {
          isValid: false,
          error: `${fieldName} must be a valid date`,
        };
      }
      break;

    case FieldTypes.ENUM:
      if (!Array.isArray(fieldDef.values) || !fieldDef.values.includes(value)) {
        return {
          isValid: false,
          error: `${fieldName} must be one of: ${fieldDef.values?.join(", ")}`,
        };
      }
      break;

    case FieldTypes.REFERENCE:
      // Simple check for now - proper validation would require DB lookup
      if (typeof value !== "string" &&
          (typeof value !== "object" || !value.id)) {
        return {
          isValid: false,
          error: `${fieldName} must be a reference ID or object with ID`,
        };
      }
      break;

    case FieldTypes.ARRAY:
      if (!Array.isArray(value)) {
        return {
          isValid: false,
          error: `${fieldName} must be an array`,
        };
      }

      // Validate array length if specified
      if (fieldDef.minItems && value.length < fieldDef.minItems) {
        return {
          isValid: false,
          error: `${fieldName} must have at least ${fieldDef.minItems} items`,
        };
      }

      if (fieldDef.maxItems && value.length > fieldDef.maxItems) {
        return {
          isValid: false,
          error: `${fieldName} must have at most ${fieldDef.maxItems} items`,
        };
      }

      // Validate each item in the array if items definition is provided
      if (fieldDef.items) {
        for (let i = 0; i < value.length; i++) {
          const itemValidation = validateField(
            value[i],
            fieldDef.items,
            `${fieldName}[${i}]`
          );

          if (!itemValidation.isValid) {
            return itemValidation;
          }
        }
      }
      break;

    case FieldTypes.OBJECT:
      if (typeof value !== "object" || value === null) {
        return {
          isValid: false,
          error: `${fieldName} must be an object`,
        };
      }

      // Validate fields of the object if fields definition is provided
      if (fieldDef.fields) {
        const objectValidation = validateObject(
          value,
          fieldDef.fields,
          fieldName
        );

        if (!objectValidation.isValid) {
          return objectValidation;
        }
      }
      break;

    default:
      // For unknown types, assume valid
      break;
  }

  // Check custom validator function if provided
  if (typeof fieldDef.validate === "function") {
    try {
      const customValidation = fieldDef.validate(value);
      if (customValidation !== true) {
        return {
          isValid: false,
          error: customValidation || `${fieldName} failed custom validation`,
        };
      }
    } catch (err) {
      return {
        isValid: false,
        error: err.message || `${fieldName} validation error`,
      };
    }
  }

  return { isValid: true };
};

/**
 * Validate an object against a set of field definitions
 *
 * Iterates over the field definitions and validates each field in the object.
 * Supports nested objects and arrays with their own field definitions.
 *
 * @param {Object} obj - The object to validate
 * @param {Object} fieldDefs - Field definitions object
 * @param {string} [parentPath=""] - Parent path for nested objects
 * @return {Object} Validation result with isValid and errors properties
 *
 * @example
 * const fieldDefs = {
 *   name: { type: FieldTypes.STRING, required: true },
 *   age: { type: FieldTypes.NUMBER, min: 0 },
 *   address: {
 *     type: FieldTypes.OBJECT,
 *     fields: {
 *       street: { type: FieldTypes.STRING },
 *       city: { type: FieldTypes.STRING }
 *     }
 *   }
 * };
 *
 * const data = {
 *   name: "John",
 *   age: 30,
 *   address: {
 *     street: "123 Main St",
 *     city: "Anytown"
 *   }
 * };
 *
 * const result = validateObject(data, fieldDefs);
 * // result = { isValid: true, errors: [] }
 */
const validateObject = (obj, fieldDefs, parentPath = "") => {
  if (!obj || typeof obj !== "object") {
    return {
      isValid: false,
      error: `${parentPath || "Value"} must be an object`,
    };
  }

  const errors = [];

  // Validate each field in the field definitions
  for (const [fieldName, fieldDef] of Object.entries(fieldDefs)) {
    const value = obj[fieldName];
    const fullFieldPath = parentPath ? `${parentPath}.${fieldName}` : fieldName;

    const validation = validateField(value, fieldDef, fullFieldPath);

    if (!validation.isValid) {
      errors.push(validation.error);
    }
  }

  return {
    isValid: errors.length === 0,
    errors: errors,
    error: errors.join(", "),
  };
};

/**
 * Validate item data against a model definition
 *
 * Validates the entire data object against the model definition, which includes
 * field definitions for each property in the data object.
 *
 * @param {Object} data - Item data to validate
 * @param {Object} modelDef - Model definition
 * @return {Object} Validation result with isValid and errors properties
 *
 * @example
 * const modelDef = {
 *   fields: {
 *     name: { type: FieldTypes.STRING, required: true },
 *     age: { type: FieldTypes.NUMBER, min: 0 }
 *   }
 * };
 *
 * const data = {
 *   name: "John",
 *   age: 30
 * };
 *
 * const result = validateModel(data, modelDef);
 * // result = { isValid: true, errors: [] }
 */
const validateModel = (data, modelDef) => {
  return validateObject(data, modelDef.fields);
};

module.exports = {
  validateField,
  validateObject,
  validateModel,
};