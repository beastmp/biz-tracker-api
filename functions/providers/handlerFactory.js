/**
 * Route Handler Factory Module
 *
 * This module provides a factory for generating standardized RESTful API route
 * handlers that work consistently across different entity types. It abstracts
 * away common CRUD operations and automatically handles relationships.
 *
 * @module handlerFactory
 * @requires ./providerFactory
 * @requires ../validation/errors
 * @requires ../controllers/relationshipController
 */
const providerFactory = require("./providerFactory");
const {NotFoundError} = require("../validation/errors");
const relationshipController = require("../controllers/relationshipController");

/**
 * Retrieves the appropriate repository instance for a given model type
 *
 * @param {string} modelName - The name of the model (item, sale, purchase, etc.)
 * @throws {Error} When no repository exists for the specified model
 * @return {Object} Repository instance for the specified model
 */
const getRepositoryForModel = (modelName) => {
  // Map model names to repository getters
  switch (modelName.toLowerCase()) {
    case "item":
      return providerFactory.createItemRepository();
    case "sale":
      return providerFactory.createSaleRepository();
    case "purchase":
      return providerFactory.createPurchaseRepository();
    case "asset":
      return providerFactory.createAssetRepository();
    case "relationship":
      return providerFactory.createRelationshipRepository();
    default:
      throw new Error(`Repository not found for model: ${modelName}`);
  }
};

/**
 * Retrieves all relationships for an entity by its ID and type
 *
 * @param {string} id - Entity identifier
 * @param {string} entityType - Type of entity (Item, Asset, etc.)
 * @return {Promise<Object>} Object containing relationships where entity is
 *                          primary and secondary
 */
const getRelationshipsForEntity = async (id, entityType) => {
  const primaryRelationships = await relationshipController.findByPrimary(
      id,
      entityType,
  );

  const secondaryRelationships = await relationshipController.findBySecondary(
      id,
      entityType,
  );

  return {
    asPrimary: primaryRelationships,
    asSecondary: secondaryRelationships,
  };
};

/**
 * Factory containing methods to generate standardized route handlers
 * for common API operations
 *
 * @type {Object}
 */
const handlerFactory = {
  /**
   * Creates a handler to retrieve all documents of a specific model type
   *
   * @param {string} modelName - Name of the model
   * @return {Function} Express middleware function for handling the request
   */
  getAll: (modelName) => async (req, res, next) => {
    try {
      // Get filter from query
      const filter = Object.assign({},
          req.query,
      );

      // Get repository and find all matching items
      const repository = getRepositoryForModel(modelName);
      const documents = await repository.findAll(filter);

      res.json(documents);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Creates a handler to retrieve all documents with their relationships
   *
   * @param {string} modelName - Name of the model
   * @return {Function} Express middleware function for handling the request
   */
  getAllWithRelationships: (modelName) => async (req, res, next) => {
    try {
      // Get filter from query
      const filter = Object.assign({},
          req.query,
      );

      // Get repository and find all matching items
      const repository = getRepositoryForModel(modelName);
      const documents = await repository.findAll(filter);

      // Get relationships for each document
      const docsWithRelationships = await Promise.all(
          documents.map(async (doc) => {
            const relationships = await getRelationshipsForEntity(
                doc._id,
                modelName,
            );

            return {
              ...doc,
              relationships,
            };
          }),
      );

      res.json(docsWithRelationships);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Creates a handler to retrieve a single document by ID
   *
   * @param {string} modelName - Name of the model
   * @param {string} entityName - Human-readable entity name for error messages
   * @return {Function} Express middleware function for handling the request
   */
  getOne: (modelName, entityName) => async (req, res, next) => {
    try {
      const {id} = req.params;

      // Get the appropriate repository
      const repository = getRepositoryForModel(modelName);
      const doc = await repository.findById(id);

      if (!doc) {
        return res.status(404).json({
          message: `${entityName || modelName} not found`,
        });
      }

      res.json(doc);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Creates a handler to retrieve a single document by ID with its relationships
   *
   * @param {string} modelName - Name of the model
   * @param {string} entityName - Human-readable entity name for error messages
   * @return {Function} Express middleware function for handling the request
   */
  getOneWithRelationships: (modelName, entityName) => async (req, res, next) => {
    try {
      const {id} = req.params;

      // Get the appropriate repository
      const repository = getRepositoryForModel(modelName);
      const doc = await repository.findById(id);

      if (!doc) {
        return res.status(404).json({
          message: `${entityName || modelName} not found`,
        });
      }

      // Get relationships for the document
      const relationships = await getRelationshipsForEntity(id, modelName);

      res.json({
        ...doc,
        relationships,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Creates a handler to create a new document
   *
   * @param {string} modelName - Name of the model
   * @return {Function} Express middleware function for handling the request
   */
  createOne: (modelName) => async (req, res, next) => {
    try {
      const repository = getRepositoryForModel(modelName);
      const document = await repository.create(req.body);

      res.status(201).json(document);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Creates a handler to create a new document with its relationships
   *
   * @param {string} modelName - Name of the model
   * @return {Function} Express middleware function for handling the request
   */
  createOneWithRelationships: (modelName) => async (req, res, next) => {
    try {
      // Use the relationship controller to create the entity with its relationships
      const result = await relationshipController.createEntityWithRelationships(
          modelName,
          req.body,
      );

      res.status(201).json({
        ...result.entity,
        relationships: result.relationships,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Creates a handler to update an existing document by ID
   *
   * @param {string} modelName - Name of the model
   * @param {string} entityName - Human-readable entity name for error messages
   * @return {Function} Express middleware function for handling the request
   */
  updateOne: (modelName, entityName) => async (req, res, next) => {
    try {
      const repository = getRepositoryForModel(modelName);
      const document = await repository.update(req.params.id, req.body);

      if (!document) {
        return next(new NotFoundError(entityName, req.params.id));
      }

      res.json(document);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Creates a handler to update an existing document by ID with its relationships
   *
   * @param {string} modelName - Name of the model
   * @param {string} entityName - Human-readable entity name for error messages
   * @return {Function} Express middleware function for handling the request
   */
  updateOneWithRelationships: (modelName, entityName) => async (
      req, res, next) => {
    try {
      // Use the relationship controller to update the entity with its relationships
      const result = await relationshipController.updateEntityWithRelationships(
          req.params.id,
          modelName,
          req.body,
      );

      res.json({
        ...result.entity,
        relationships: result.relationships,
      });
    } catch (err) {
      // If the entity was not found, create a proper error
      if (err.message && err.message.includes("not found")) {
        return next(new NotFoundError(entityName, req.params.id));
      }
      next(err);
    }
  },

  /**
   * Creates a handler to delete an existing document by ID
   *
   * @param {string} modelName - Name of the model
   * @param {string} entityName - Human-readable entity name for error messages
   * @return {Function} Express middleware function for handling the request
   */
  deleteOne: (modelName, entityName) => async (req, res, next) => {
    try {
      const repository = getRepositoryForModel(modelName);
      const result = await repository.delete(req.params.id);

      if (!result) {
        return next(new NotFoundError(entityName, req.params.id));
      }

      res.json({
        status: "success",
        message: `${entityName} deleted successfully`,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Creates a handler to delete an existing document by ID with relationship cleanup
   *
   * @param {string} modelName - Name of the model
   * @param {string} entityName - Human-readable entity name for error messages
   * @return {Function} Express middleware function for handling the request
   */
  deleteOneWithRelationships: (modelName, entityName) => async (
      req, res, next) => {
    try {
      // Use the relationship controller to delete the entity with its relationships
      await relationshipController.deleteEntityWithRelationships(
          req.params.id,
          modelName,
      );

      res.json({
        status: "success",
        message: `${entityName} deleted successfully`,
      });
    } catch (err) {
      // If the entity was not found, create a proper error
      if (err.message && err.message.includes("not found")) {
        return next(new NotFoundError(entityName, req.params.id));
      }
      next(err);
    }
  },
};

module.exports = handlerFactory;
