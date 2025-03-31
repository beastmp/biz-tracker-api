/**
 * Factory for generating standard REST handlers
 * Completely decoupled from specific database providers
 */
const {getProviderFactory} = require("../providers");
const {NotFoundError} = require("./errors");

/**
 * Get the repository for a given model name
 * @param {string} modelName Name of the model
 * @return {Object} Repository instance
 */
const getRepositoryForModel = (modelName) => {
  const providerFactory = getProviderFactory();

  // Map model names to repository getters
  switch (modelName.toLowerCase()) {
    case "item":
      return providerFactory.getItemRepository();
    case "sales":
      return providerFactory.getSalesRepository();
    case "purchase":
      return providerFactory.getPurchaseRepository();
    default:
      throw new Error(`Repository not found for model: ${modelName}`);
  }
};

const handlerFactory = {
  /**
   * Get all documents handler
   * @param {string} modelName Name of the model
   * @return {Function} Express request handler
   */
  getAll: (modelName) => async (req, res, next) => {
    try {
      // Get filter from query
      const filter = Object.assign({},
          req.query,
          // Add business ID if available
          // req.user && req.user.businessId ?
          //     {businessId: req.user.businessId} : {},
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
   * Get one document handler
   * @param {string} modelName Name of the model
   * @param {string} entityName Human-readable entity name for errors
   * @return {Function} Express request handler
   */
  getOne: (modelName, entityName) => async (req, res, next) => {
    try {
      const repository = getRepositoryForModel(modelName);
      const document = await repository.findById(req.params.id);

      if (!document) {
        return next(new NotFoundError(entityName, req.params.id));
      }

      res.json(document);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Create document handler
   * @param {string} modelName Name of the model
   * @return {Function} Express request handler
   */
  createOne: (modelName) => async (req, res, next) => {
    try {
      // Add business ID if available
      // if (req.user && req.user.businessId) {
      //   req.body.businessId = req.user.businessId;
      // }

      const repository = getRepositoryForModel(modelName);
      const document = await repository.create(req.body);

      res.status(201).json(document);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Update document handler
   * @param {string} modelName Name of the model
   * @param {string} entityName Human-readable entity name for errors
   * @return {Function} Express request handler
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
   * Delete document handler
   * @param {string} modelName Name of the model
   * @param {string} entityName Human-readable entity name for errors
   * @return {Function} Express request handler
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
};

module.exports = handlerFactory;
