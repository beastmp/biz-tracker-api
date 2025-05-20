/**
 * MongoDB Relationship Repository Module
 *
 * Implements the MongoDB-specific logic for the Relationship entity, providing
 * methods to create, retrieve, update, and delete relationship records in
 * MongoDB.
 *
 * @module MongoRelationshipRepository
 * @requires ../../repositories/relationshipRepository
 * @requires ./modelFactory
 * @requires ./schemaGenerator
 */

const RelationshipRepository = require("../../repositories/relationshipRepository");
const {createModel} = require("./modelFactory");
const {
  documentToObject,
  objectToDocument,
} = require("./schemaGenerator");

/**
 * MongoDB-specific implementation of the Relationship repository
 *
 * @class MongoRelationshipRepository
 * @extends RelationshipRepository
 */
class MongoDBRelationshipRepository extends RelationshipRepository {
  /**
   * Creates a new instance of MongoRelationshipRepository
   *
   * @constructor
   * @param {Object} config - Configuration options
   * @param {string} [config.collectionPrefix] - Prefix for collection names
   */
  constructor(config = {}) {
    super(config);
    this.collectionPrefix = config.collectionPrefix || "";
    this.model = createModel("Relationship", this.collectionPrefix);
  }

  /**
   * Find all relationships matching filter criteria
   *
   * @async
   * @param {Object} filter - Query filters
   * @param {Object} options - Query options (sorting, pagination, etc.)
   * @return {Promise<Array>} - List of relationships
   */
  async findAll(filter = {}, options = {}) {
    const {
      limit,
      skip = 0,
      sort = {createdAt: -1},
    } = options;

    try {
      const query = this._buildQuery(filter);

      let queryBuilder = this.model
          .find(query)
          .sort(sort)
          .skip(skip);
          
      if (limit) {
        queryBuilder = queryBuilder.limit(limit);
      }

      const relationships = await queryBuilder.exec();

      return relationships.map(documentToObject);
    } catch (error) {
      console.error("Error finding relationships:", error);
      throw error;
    }
  }

  /**
   * Find relationship by ID
   *
   * @async
   * @param {string} id - Relationship ID
   * @return {Promise<Object|null>} - Relationship object or null if not found
   */
  async findById(id) {
    if (!id) return null;

    try {
      const relationship = await this.model.findById(id).exec();
      return relationship ? documentToObject(relationship) : null;
    } catch (error) {
      console.error(`Error finding relationship by ID ${id}:`, error);
      return null;
    }
  }

  /**
   * Create a new relationship
   *
   * @async
   * @param {Object} relationshipData - Relationship data
   * @param {Object} [transaction] - Optional transaction
   * @return {Promise<Object>} - Created relationship
   */
  async create(relationshipData, transaction = null) {
    try {
      const docData = objectToDocument(relationshipData);
      // eslint-disable-next-line new-cap
      const relationship = new this.model(docData);

      const options = transaction ? {session: transaction} : {};
      await relationship.save(options);

      return documentToObject(relationship);
    } catch (error) {
      console.error("Error creating relationship:", error);
      throw error;
    }
  }

  /**
   * Update an existing relationship
   *
   * @async
   * @param {string} id - Relationship ID
   * @param {Object} relationshipData - Updated relationship data
   * @param {Object} [transaction] - Optional transaction
   * @return {Promise<Object|null>} - Updated relationship or null if not found
   */
  async update(id, relationshipData, transaction = null) {
    if (!id) throw new Error("ID is required for update");

    try {
      const docData = objectToDocument(relationshipData);

      // Remove id from data to prevent _id modification attempt
      if (docData._id) {
        delete docData._id;
      }

      const options = {new: true};
      if (transaction) {
        options.session = transaction;
      }

      const relationship = await this.model
          .findByIdAndUpdate(id, docData, options)
          .exec();

      return relationship ? documentToObject(relationship) : null;
    } catch (error) {
      console.error(`Error updating relationship ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a relationship
   *
   * @async
   * @param {string} id - Relationship ID
   * @param {Object} [transaction] - Optional transaction
   * @return {Promise<boolean>} - True if deleted, false if not found
   */
  async delete(id, transaction = null) {
    if (!id) return false;

    try {
      const options = transaction ? {session: transaction} : {};
      const result = await this.model.findByIdAndDelete(id, options).exec();
      return !!result;
    } catch (error) {
      console.error(`Error deleting relationship ${id}:`, error);
      throw error;
    }
  }

  /**
   * Find relationships by primary entity
   *
   * @async
   * @param {string} primaryId - Primary entity ID
   * @param {string} primaryType - Primary entity type
   * @param {string} [relationshipType] - Optional relationship type filter
   * @param {Object} [options] - Additional query options
   * @return {Promise<Array>} - List of relationships
   */
  async findByPrimary(primaryId, primaryType, relationshipType = null,
      options = {}) {
    try {
      const query = {
        primaryId,
        primaryType,
      };

      if (relationshipType) {
        query.relationshipType = relationshipType;
      }

      const relationships = await this.model.find(query).exec();
      return relationships.map(documentToObject);
    } catch (error) {
      console.error(
          `Error finding relationships by primary entity ${primaryId}:`,
          error,
      );
      throw error;
    }
  }

  /**
   * Find relationships by secondary entity
   *
   * @async
   * @param {string} secondaryId - Secondary entity ID
   * @param {string} secondaryType - Secondary entity type
   * @param {string} [relationshipType] - Optional relationship type filter
   * @param {Object} [options] - Additional query options
   * @return {Promise<Array>} - List of relationships
   */
  async findBySecondary(secondaryId, secondaryType, relationshipType = null,
      options = {}) {
    try {
      const query = {
        secondaryId,
        secondaryType,
      };

      if (relationshipType) {
        query.relationshipType = relationshipType;
      }

      const relationships = await this.model.find(query).exec();
      return relationships.map(documentToObject);
    } catch (error) {
      console.error(
          `Error finding relationships by secondary entity ${secondaryId}:`,
          error,
      );
      throw error;
    }
  }

  /**
   * Find all relationships for a specific entity (both as primary and secondary)
   *
   * @async
   * @param {string} entityId - Entity ID
   * @param {string} entityType - Entity type
   * @return {Promise<Object>} - Object containing relationships as primary and
   *                            secondary
   */
  async findAllForEntity(entityId, entityType) {
    try {
      const [asPrimary, asSecondary] = await Promise.all([
        this.findByPrimary(entityId, entityType),
        this.findBySecondary(entityId, entityType),
      ]);

      return {
        asPrimary,
        asSecondary,
      };
    } catch (error) {
      console.error(`Error finding all relationships for entity ${entityId}:`,
          error);
      throw error;
    }
  }

  /**
   * Find direct relationships between two entities
   *
   * @async
   * @param {string} entity1Id - First entity ID
   * @param {string} entity1Type - First entity type
   * @param {string} entity2Id - Second entity ID
   * @param {string} entity2Type - Second entity type
   * @return {Promise<Array>} - List of relationships connecting the entities
   */
  async findDirectRelationships(entity1Id, entity1Type, entity2Id,
      entity2Type) {
    try {
      const relationships = await this.model.find({
        $or: [
          {
            primaryId: entity1Id,
            primaryType: entity1Type,
            secondaryId: entity2Id,
            secondaryType: entity2Type,
          },
          {
            primaryId: entity2Id,
            primaryType: entity2Type,
            secondaryId: entity1Id,
            secondaryType: entity1Type,
          },
        ],
      }).exec();

      return relationships.map(documentToObject);
    } catch (error) {
      console.error(`Error finding direct relationships between entities:`,
          error);
      throw error;
    }
  }

  /**
   * Delete relationships by primary entity
   *
   * @async
   * @param {string} primaryId - Primary entity ID
   * @param {string} primaryType - Primary entity type
   * @param {string} [relationshipType] - Optional relationship type filter
   * @param {Object} [transaction] - Optional transaction
   * @return {Promise<number>} - Number of deleted relationships
   */
  async deleteByPrimary(primaryId, primaryType, relationshipType = null,
      transaction = null) {
    try {
      const query = {
        primaryId,
        primaryType,
      };

      if (relationshipType) {
        query.relationshipType = relationshipType;
      }

      const options = transaction ? {session: transaction} : {};
      const result = await this.model.deleteMany(query, options).exec();
      return result.deletedCount || 0;
    } catch (error) {
      console.error(
          `Error deleting relationships by primary entity ${primaryId}:`,
          error,
      );
      throw error;
    }
  }

  /**
   * Delete relationships by secondary entity
   *
   * @async
   * @param {string} secondaryId - Secondary entity ID
   * @param {string} secondaryType - Secondary entity type
   * @param {string} [relationshipType] - Optional relationship type filter
   * @param {Object} [transaction] - Optional transaction
   * @return {Promise<number>} - Number of deleted relationships
   */
  async deleteBySecondary(secondaryId, secondaryType, relationshipType = null,
      transaction = null) {
    try {
      const query = {
        secondaryId,
        secondaryType,
      };

      if (relationshipType) {
        query.relationshipType = relationshipType;
      }

      const options = transaction ? {session: transaction} : {};
      const result = await this.model.deleteMany(query, options).exec();
      return result.deletedCount || 0;
    } catch (error) {
      console.error(
          `Error deleting relationships by secondary entity ${secondaryId}:`,
          error,
      );
      throw error;
    }
  }

  /**
   * Get statistics about relationships in the system
   *
   * @async
   * @return {Promise<Object>} - Statistics about relationships
   */
  async getStatistics() {
    try {
      const [totalCount, typeStats, entityTypeStats] = await Promise.all([
        this.model.countDocuments().exec(),
        this.model.aggregate([
          {
            $group: {
              _id: "$relationshipType",
              count: {$sum: 1},
            },
          },
        ]).exec(),
        this.model.aggregate([
          {
            $facet: {
              primaryTypes: [
                {
                  $group: {
                    _id: "$primaryType",
                    count: {$sum: 1},
                  },
                },
              ],
              secondaryTypes: [
                {
                  $group: {
                    _id: "$secondaryType",
                    count: {$sum: 1},
                  },
                },
              ],
            },
          },
        ]).exec(),
      ]);

      // Process type statistics
      const byType = {};
      typeStats.forEach((stat) => {
        byType[stat._id] = stat.count;
      });

      // Process entity type statistics
      const byEntityType = {};
      if (entityTypeStats.length > 0) {
        // Combine primary and secondary type counts
        const combined = {};

        entityTypeStats[0].primaryTypes.forEach((stat) => {
          combined[stat._id] = (combined[stat._id] || 0) + stat.count;
        });

        entityTypeStats[0].secondaryTypes.forEach((stat) => {
          combined[stat._id] = (combined[stat._id] || 0) + stat.count;
        });

        Object.assign(byEntityType, combined);
      }

      return {
        totalCount,
        byType,
        byEntityType,
      };
    } catch (error) {
      console.error("Error getting relationship statistics:", error);
      throw error;
    }
  }

  /**
   * Convert legacy relationships to the new model
   *
   * @async
   * @param {string} entityId - Entity ID
   * @param {string} entityType - Entity type
   * @param {Object} [transaction] - Optional transaction
   * @return {Promise<Object>} - Conversion results
   */
  async convertLegacyRelationships(entityId, entityType, transaction = null) {
    // This method would implement the logic to convert from embedded
    // relationships in old models to the new relationship documents
    try {
      // Implementation depends on your legacy data structure
      // This is a placeholder for the actual implementation
      console.log(`Converting legacy relationships for ${entityType} ${entityId}`);

      return {
        status: "success",
        created: 0,
        errors: [],
        message: "Relationship conversion not implemented for this entity type",
      };
    } catch (error) {
      console.error(`Error converting legacy relationships:`, error);
      return {
        status: "error",
        created: 0,
        errors: [error.message],
        message: "Failed to convert relationships",
      };
    }
  }

  /**
   * Build query object from filters
   *
   * @param {Object} filters - Filter criteria
   * @return {Object} - MongoDB query
   * @private
   */
  _buildQuery(filters) {
    const query = {};

    if (!filters || typeof filters !== "object") {
      return query;
    }

    Object.entries(filters).forEach(([key, value]) => {
      // Handle special operators
      if (key.startsWith("$")) {
        query[key] = value;
        return;
      }

      // Handle nested objects with dot notation
      if (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
      ) {
        Object.entries(value).forEach(([operator, operand]) => {
          if (operator.startsWith("$")) {
            query[key] = {...query[key], [operator]: operand};
          } else {
            query[`${key}.${operator}`] = operand;
          }
        });
        return;
      }

      // Handle regular values
      query[key] = value;
    });

    return query;
  }

  /**
   * Sets all entity repositories at once
   *
   * @param {Object} itemRepository - Item repository instance
   * @param {Object} purchaseRepository - Purchase repository instance
   * @param {Object} salesRepository - Sales repository instance
   * @param {Object} assetRepository - Asset repository instance
   * @return {void}
   */
  setRepositories(itemRepository, purchaseRepository, salesRepository, assetRepository) {
    if (itemRepository) {
      this.registerEntityRepository("Item", itemRepository);
    }
    
    if (purchaseRepository) {
      this.registerEntityRepository("Purchase", purchaseRepository);
    }
    
    if (salesRepository) {
      this.registerEntityRepository("Sale", salesRepository);
    }
    
    if (assetRepository) {
      this.registerEntityRepository("Asset", assetRepository);
    }
  }
}

module.exports = MongoDBRelationshipRepository;
