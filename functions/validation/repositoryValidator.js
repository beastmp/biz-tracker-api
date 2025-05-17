/**
 * Repository Validator
 * Adds validation to repository operations
 */

const {validateModel} = require("./modelValidator");
const {ValidationError} = require("./errors");

/**
 * Create a repository validator middleware for a model
 * @param {Object} modelDef - Model definition
 * @return {Function} Middleware function
 */
const createRepositoryValidator = (modelDef) => {
  return {
    /**
     * Validate data before creating a record
     * @param {Object} data - Data to validate
     * @return {Object} Validated data
     * @throws {ValidationError} If validation fails
     */
    validateCreate: (data) => {
      const validation = validateModel(data, modelDef);

      if (!validation.isValid) {
        throw new ValidationError(
            `Validation failed: ${validation.error}`,
            validation.errors,
        );
      }

      return data;
    },

    /**
     * Validate data before updating a record
     * @param {Object} data - Data to validate
     * @return {Object} Validated data
     * @throws {ValidationError} If validation fails
     */
    validateUpdate: (data) => {
      // For updates, we only validate fields that are provided
      // Create a subset of the model definition with only the fields in data
      const updateFieldDefs = {};

      Object.keys(data).forEach((key) => {
        if (modelDef.fields[key]) {
          // For updates, fields are not required, so create a copy
          // of the field definition without the required flag
          const fieldDef = {...modelDef.fields[key]};
          delete fieldDef.required;

          updateFieldDefs[key] = fieldDef;
        }
      });

      const tempModelDef = {
        ...modelDef,
        fields: updateFieldDefs,
      };

      const validation = validateModel(data, tempModelDef);

      if (!validation.isValid) {
        throw new ValidationError(
            `Validation failed: ${validation.error}`,
            validation.errors,
        );
      }

      return data;
    },
  };
};

module.exports = {
  createRepositoryValidator,
};
